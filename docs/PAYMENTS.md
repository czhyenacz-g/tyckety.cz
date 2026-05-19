# PAYMENTS.md — Platební flow a import bankovního výpisu

## Aktuální MVP stav

Platby se párují **ručně**:
1. Pořadatel vidí platbu na svém bankovním výpisu s variabilním symbolem
2. Najde odpovídající objednávku v `/app/akce/{eventId}` nebo `/internal/events/{eventId}`
3. Klikne "Označit zaplaceno" → `PATCH /api/objednavka/{id}/paid`

Automatické párování není implementováno. Tato dokumentace připravuje půdu pro budoucí implementaci CSV importu z Raiffeisenbank.

---

## Raiffeisenbank CSV export

### Formát souboru

| Vlastnost | Hodnota |
|-----------|---------|
| Encoding | UTF-8 with BOM (`\xEF\xBB\xBF`) |
| Delimiter | `;` (středník) |
| Quoted values | Ano (double-quotes) |
| Název souboru | `Pohyby_{accountNumber}_{timestamp}.csv` |
| Příklad | `Pohyby_8216903002_202605192009.csv` |

### Mapování sloupců

| CSV sloupec | Použití | Poznámka |
|-------------|---------|----------|
| `Id transakce` | Deduplikace importu | Uložit jako `bankTransactionId`; unique per bankAccount |
| `Datum zaúčtování` | Datum pohybu | Formát `DD.MM.YYYY` |
| `Datum provedení` | Datum iniciace | Formát `DD.MM.YYYY` |
| `Zaúčtovaná částka` | Částka platby | Kladná = příchozí; záporná = odchozí; CZK bez mezer (ale parser musí zvládnout i desetinnou čárku) |
| `Měna účtu` | Filtr měny | Importovat pouze `CZK` |
| `VS` | **Matching key** | Variabilní symbol; prázdný → `missing_symbol` |
| `Typ transakce` | Filtr pohybu | Importovat pouze příchozí (`"Příchozí úhrada"`) |
| `Číslo účtu` | Ověření vlastníka | Musí odpovídat `Organizer.bankAccount` (část před `/`) |
| `Číslo protiúčtu` | Informace o plátci | Maskovat v UI; ukládat jen pokud potřeba pro manual review |
| `Název protiúčtu` | Jméno plátce | Volitelné; ukládat jen pro manual review |
| `Zpráva` | Doplňující info | Volitelné |
| `Poznámka` | Volitelné | — |

Sloupce **nepotřebné** pro matching (lze ignorovat při parsování): specifické bankovní kódy, poplatky, BIC.

### Příklad řádku (anonymizovaný)

```
"Id transakce";"Datum zaúčtování";"Datum provedení";"Číslo účtu";"Číslo protiúčtu";"Název protiúčtu";"Typ transakce";"Zaúčtovaná částka";"Měna účtu";"VS";"Zpráva";"Poznámka"
"123456789";"15.05.2025";"15.05.2025";"8216903002/5500";"1234567890/0300";"Jan Novák";"Příchozí úhrada";"299";"CZK";"1234567890";"Tyckety";"";
```

---

## Parsing rules

### Filtrování řádků

Importovat pouze řádky, kde:
1. `Zaúčtovaná částka` > 0 (příchozí platba)
2. `Měna účtu` = `"CZK"`
3. `Typ transakce` = `"Příchozí úhrada"` (ideálně; může chybět u starších exportů)

Ignorovat: odchozí platby, platby kartou, poplatky, vnitřní převody.

### Parsování částky

```typescript
// Částka může mít různé formáty z různých exportů
function parseAmount(raw: string): number {
  // Odstraň mezery (oddělovač tisíců), nahraď čárku tečkou
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  const amount = parseFloat(normalized);
  if (isNaN(amount)) throw new Error(`Invalid amount: ${raw}`);
  return Math.round(amount); // Pracujeme v celých Kč
}
```

### Čtení BOM

```typescript
import { readFileSync } from "fs";

function readCsvBuffer(filePath: string): string {
  const buf = readFileSync(filePath);
  // Strip UTF-8 BOM pokud přítomen
  const content = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF
    ? buf.slice(3).toString("utf-8")
    : buf.toString("utf-8");
  return content;
}
```

### Pseudokód parseru

```typescript
interface ParsedPayment {
  bankTransactionId: string;
  bookedAt: Date;
  amountCzk: number;       // vždy kladné číslo
  currency: string;
  variableSymbol: string | null;
  ownAccount: string;
  counterpartyAccount: string | null;
  counterpartyName: string | null;
  transactionType: string;
  message: string | null;
  rawData: Record<string, string>; // celý CSV řádek pro audit
}

function parseRaiffeisenCsv(csvContent: string): ParsedPayment[] {
  const lines = csvContent.split("\n");
  const headers = lines[0].split(";").map(h => h.trim().replace(/^"|"$/g, ""));

  const results: ParsedPayment[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const values = parseCsvLine(line); // respektuje quoted fields
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));

    const amount = parseAmount(row["Zaúčtovaná částka"]);
    const currency = row["Měna účtu"];
    const type = row["Typ transakce"];

    // Filtrovat pouze příchozí platby v CZK
    if (amount <= 0 || currency !== "CZK") continue;
    if (type && type !== "Příchozí úhrada") continue;

    const vs = row["VS"]?.trim() || null;

    results.push({
      bankTransactionId: row["Id transakce"],
      bookedAt: parseDate(row["Datum zaúčtování"]), // DD.MM.YYYY
      amountCzk: amount,
      currency,
      variableSymbol: vs,
      ownAccount: row["Číslo účtu"],
      counterpartyAccount: row["Číslo protiúčtu"] || null,
      counterpartyName: row["Název protiúčtu"] || null,
      transactionType: type,
      message: row["Zpráva"] || null,
      rawData: row,
    });
  }

  return results;
}
```

---

## Matching logika

Pro každou `ParsedPayment` proběhne matching vůči `Order` tabulce:

| Výsledek | Podmínka | Akce |
|----------|----------|------|
| `exact_match` | VS sedí + částka sedí + objednávka patří pořadateli (bankAccount) | Automaticky označit jako `paid` |
| `amount_mismatch` | VS sedí, částka nesedí | `manual_review`; zobrazit pořadateli |
| `unknown_symbol` | VS nepatří žádné objednávce | `manual_review` |
| `missing_symbol` | VS je prázdný | `manual_review` |
| `duplicate_payment` | Stejný `bankAccount` + `bankTransactionId` již byl importován | Přeskočit |
| `already_paid` | Objednávka má status `paid` nebo `tickets_issued` | `manual_review` nebo přeskočit |
| `late_payment` | VS sedí, ale objednávka je po `paymentGraceDeadlineAt` | `manual_review`; pořadatel rozhodne |

### Klíče pro matching

```typescript
// Primární klíče
order.variableSymbol  ←→  payment.variableSymbol   // exact string match
order.totalAmountCzk  ←→  payment.amountCzk        // integer Kč

// Ověření vlastníka (bezpečnostní kontrola)
organizer.bankAccount ←→  payment.ownAccount
// Platba musí přijít na účet pořadatele, ne jiný účet
```

### Deduplikace

```typescript
// Před importem zkontrolovat, zda transakce nebyla již zpracována
const existing = await db.paymentRecord.findFirst({
  where: {
    organizerId: organizer.id,
    // bankTransactionId uložit do pole `note` nebo přidat nové pole
  }
});
if (existing) continue; // duplicate_payment
```

> Pozn.: Model `PaymentRecord` (`prisma/schema.prisma`) zatím neobsahuje pole `bankTransactionId`. Při implementaci importu je třeba přidat toto pole pro deduplikaci.

---

## Bezpečnostní poznámky

### Logování

- **Nelogovat celý výpis** — CSV obsahuje osobní a finanční data
- Logovat pouze: počet importovaných řádků, počet matched/unmatched, chyby parsování
- Při chybě logovat jen identifikátor transakce (`bankTransactionId`), ne celý řádek

```typescript
// Špatně
console.log("[import] row", JSON.stringify(row));

// Správně
console.log(`[import] tx=${row.bankTransactionId} result=${matchResult}`);
```

### Protiúčet v UI

- Číslo protiúčtu (účet plátce) není nutné zobrazovat v běžném UI
- Pokud se zobrazuje, maskovat střed: `123456***/0300`
- Zobrazovat jen pro `manual_review` případy, kde pořadatel potřebuje identifikovat plátce

### Minimalizace dat

- Do DB ukládat jen data potřebná pro matching a audit
- `rawData` (celý CSV řádek) ukládat do `PaymentRecord.note` jako JSON — jen dočasně pro ladění, ne permanentně v produkci
- Jméno protiúčtu (`Název protiúčtu`) ukládat jen pokud je potřeba pro manual review

### CSV formula injection

Pokud se importovaná data exportují zpět do CSV (např. pro účetnictví), escapovat hodnoty:

```typescript
function escapeCsvCell(value: string): string {
  // Hodnoty začínající =, +, -, @ mohou být interpretovány jako vzorce v Excelu/Sheets
  if (/^[=+\-@]/.test(value)) {
    return `"'${value}"`; // prefix apostrofem uvnitř quotes
  }
  return value.includes(";") || value.includes('"') || value.includes("\n")
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}
```

### Přístup k importu

- Import CSV musí být dostupný **pouze pořadateli pro jeho vlastní účet** nebo super adminovi
- Ověřit, že `payment.ownAccount` odpovídá `organizer.bankAccount` před uložením
- Odmítnout CSV obsahující pohyby z jiného účtu než přihlášeného pořadatele

---

## Budoucí implementace — co připravit

Až se bude implementovat import, bude potřeba:

1. **Přidat `bankTransactionId` do `PaymentRecord`** — pro deduplikaci
2. **UI pro upload CSV** — `/app/akce/{eventId}/import` nebo globálně v `/app`
3. **Manual review fronta** — zobrazit pořadateli transakce, které nebylo možné automaticky spárovat
4. **Webhook alternativa** — Raiffeisenbank nabízí API (compat. s ČSOB/Komerční), ale CSV je pro MVP dostatečné

Tato dokumentace pokrývá **pouze parsing a matching logiku**. Implementace není součástí MVP.
