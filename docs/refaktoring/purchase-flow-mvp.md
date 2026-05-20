# Purchase Flow MVP — Tyckety.cz

Popis aktuálního nákupního flow a klíčových technických komponent.

## Přehled flow

```
Pořadatel vytvoří akci (draft)
    ↓
Odesle ke schválení → pending_review
    ↓
Internal admin schválí → published
    ↓
Zákazník najde akci → detail stránky
    ↓
Vyplní objednávkový formulář
    ↓
Objednávka vytvořena (awaiting_payment) → platební instrukce
    ↓
Zákazník zaplatí bankovním převodem
    ↓
Pořadatel páruje platbu → označí jako paid
    ↓
Pořadatel vystaví vstupenky → tickets_issued
    ↓
Zákazník dostane e-mail + vidí QR vstupenku na stránce objednávky
    ↓
Vstup na akci: scanner ověří QR → označí jako used
```

## Stránky a API

### Veřejné stránky

| URL | Soubor | Popis |
|---|---|---|
| `/{organizerSlug}/{eventSlug}` | `app/[organizerSlug]/[eventSlug]/page.tsx` | Detail akce + nákupní formulář |
| `/objednavka/{orderToken}` | `app/objednavka/[orderToken]/page.tsx` | Detail objednávky + platební instrukce |
| `/vstupenka/{ticketToken}` | `app/vstupenka/[ticketToken]/page.tsx` | Jednotlivá vstupenka s QR kódem |
| `/scan/{scanToken}` | `app/scan/[scanToken]/page.tsx` | Vstupní kontrola pro pořadatele |

### API routes

| Route | Metoda | Popis |
|---|---|---|
| `/api/objednavka` | POST | Vytvoření objednávky |
| `/api/objednavka/[orderId]/paid` | PATCH | Označení objednávky jako zaplacené |
| `/api/objednavka/[orderId]/issue-tickets` | PATCH | Vystavení vstupenek (auth) |
| `/api/scan/[scanToken]/validate` | POST | Ověření vstupenky (vrátí stav) |
| `/api/scan/[scanToken]/use` | POST | Označení vstupenky jako použité |

## Jak vzniká objednávka

1. `POST /api/objednavka` s `{eventId, categoryId, buyerName, buyerEmail, quantity}`
2. Server ověří: event.status === "published", kapacita (s lazy expirací pending objednávek)
3. Vytvoří `Order` se stavem `awaiting_payment`, `variableSymbol` (10místný číselný kód)
4. Nastaví `paymentDisplayDeadlineAt` (15 min) a `paymentGraceDeadlineAt` (60 min)
5. Odešle e-maily zákazníkovi i pořadateli (async, bez blokování response)
6. Vrátí `{orderToken: order.publicToken}` → redirect na `/objednavka/{token}`

### Validace server-side (= UI validace)
- `buyerName` required, trimmed
- `buyerEmail` required, trimmed + lowercase
- `quantity` 1–10 (integer)
- `event.status === "published"` → HTTP 403 jinak

## Jak se zobrazují platební instrukce

Stránka `/objednavka/{token}` zobrazuje pro stav `awaiting_payment`:
- **QR kód pro platbu** (SPD formát): IBAN pořadatele + částka + variabilní symbol
- **Číslo účtu** pořadatele (plain text)
- **Částka** (Kč)
- **Odpočet** do vypršení platební lhůty (client-side Countdown)
- **CopyVS**: variabilní symbol s velkým písmem + tlačítko "Kopírovat"
- **Info box**: co se stane po zaplacení (ručně, do 1 hodiny, e-mail)

QR kód je generován jen pokud `bankAccount` existuje a lze převést na IBAN.
`lib/spd.ts` obsahuje konverzi `czechAccountToIBAN` a buildSpdString.

## Jak se řeší ticket/QR

### Vytvoření vstupenky
Vstupenky se nevytvářejí při objednávce. Vytváří je pořadatel ručně v admin panelu:
- Klikne "Vystavit vstupenky" u zaplacené objednávky → `PATCH /api/objednavka/[orderId]/issue-tickets`
- Transakce vytvoří `Ticket` záznamy (1 per ks), zvýší `soldCount`, nastaví `status: "tickets_issued"`
- Zákazník dostane e-mail s odkazem na `/objednavka/{token}`

### Zobrazení vstupenky
- `/objednavka/{token}` při stavu `tickets_issued` zobrazí QR kódy (URL `siteUrl/vstupenka/{ticketToken}`)
- `/vstupenka/{ticketToken}` — přímý odkaz na jednu vstupenku, roboti ignorují (robots: index: false)

### Validace u vstupu
Dvoustupňový flow v `ScannerForm.tsx`:
1. Operátor zadá token / URL vstupenky
2. `POST /api/scan/{scanToken}/validate` → status: `valid | already_used | not_found | wrong_event | cancelled`
3. Pokud `valid`: operátor klikne "Označit jako použito"
4. `POST /api/scan/{scanToken}/use` → atomický `updateMany where status=issued` (ochrana před race condition)

Scan token je izolovaný na konkrétní akci — vstupenka jiné akce projde jako `wrong_event`.

## Stavy objednávky

| Stav | Popis |
|---|---|
| `awaiting_payment` | Čeká na platbu |
| `paid` | Zaplaceno, vstupenky ještě nevystaveny |
| `tickets_issued` | Vstupenky vystaveny a dostupné |
| `payment_window_expired` | Platební lhůta vypršela (UI stav, lazy computed) |
| `expired` | Objednávka expirovala |
| `payment_received_late` | Platba přišla po lhůtě |
| `manual_review` | Manuální řešení pořadatelem |

## Co zůstává TODO

- **Camera QR scan** na stránce scanneru (TODO v `ScannerForm.tsx`) — zatím pouze manuální zadání tokenu
- **Automatické párování plateb** — pořadatel páruje platby ručně přes import CSV z banky; automatizace závisí na bankovním API
- **Rate limiting** na `/api/objednavka` a `/api/auth/request-link` — není implementováno
- **Automatická notifikace pořadatele** při pendingreview — viz `docs/refaktoring/legal-mvp.md`
- **Přechod na `prisma migrate deploy`** při první nekompatibilní produkční migraci (nyní db push)
- **Regenerace scan tokenu** v admin UI — deaktivace funguje, ale vytvoření nového tokenu nemá UI
