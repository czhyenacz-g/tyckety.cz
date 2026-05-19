# Tyckety.cz

Jednoduchý ticketing systém pro české pořadatele. Bez platební brány — zákazníci platí přes QR platbu přímo na účet pořadatele.

**Stack:** Next.js 15 · Prisma · PostgreSQL · Tailwind CSS · Vercel

---

## MVP flow

### 1. Přihlášení pořadatele

`/prihlaseni` — zadej e-mail, klikni na vygenerovaný odkaz (v produkci přijde e-mailem, v MVP se zobrazí přímo v UI).

### 2. Vytvoření akce

`/app/akce/nova` — vyplň název, datum, místo, cenu a kapacitu vstupenek, bankovní účet. Akce se vytvoří jako **Koncept**.

### 3. Zveřejnění akce

`/app/akce/[id]` — klikni na tlačítko **"Zveřejnit akci"**. Teprve pak je akce viditelná zákazníkům na veřejném odkazu.

### 4. Veřejný nákup

`/{organizerSlug}/{eventSlug}` — zákazník vyplní jméno, e-mail a počet vstupenek. Po odeslání se přesměruje na stránku objednávky.

### 5. QR platba

`/objednavka/[orderToken]` — stránka zobrazí QR kód pro bankovní platbu (SPD formát), číslo účtu, variabilní symbol a odpočet 15 minut.

### 6. Ruční potvrzení platby

`/app/akce/[id]` → tabulka objednávek → **"Označit zaplaceno"** u konkrétní objednávky.

### 7. Vystavení vstupenek

Ve stejné tabulce klikni **"Vystavit vstupenky"** (zobrazí se po označení jako zaplaceno).

### 8. Tisk vstupenek

`/objednavka/[orderToken]` — zákazník uvidí vstupenky s QR kódy. Tlačítko **"Tisknout vstupenky"** → `window.print()`.

### 9. Validace u vstupu

`/scan/[scanToken]` (odkaz na detailu akce) — obsluha zadá nebo načte token vstupenky. Červená = neplatná, zelená = platná. Tlačítko "Označit jako použito" nastaví vstupenku jako použitou.

---

## Veřejné stránky

| URL | Popis |
|-----|-------|
| `/{organizerSlug}` | Stránka pořadatele se seznamem akcí |
| `/{organizerSlug}/{eventSlug}` | Detail akce s formulářem pro nákup |
| `/objednavka/{orderToken}` | Stránka objednávky s QR platbou a vstupenkami |
| `/vstupenka/{ticketToken}` | Detail vstupenky (stav, QR, info) |
| `/embed/{eventId}` | Embeddovatelný formulář pro nákup (pro iframe) |
| `/scan/{scanToken}` | Vstupní kontrola — validace vstupenek |

## Admin stránky

| URL | Popis |
|-----|-------|
| `/app` | Dashboard se statistikami |
| `/app/akce` | Seznam akcí |
| `/app/akce/nova` | Vytvoření nové akce |
| `/app/akce/{id}` | Detail akce, správa objednávek |

---

## Lokální vývoj

```bash
npm install
# nastav .env.local s DATABASE_URL + DIRECT_URL
npx prisma db push
npm run dev
```

## TODO pro produkci

- [ ] Automatické párování plateb (fio.cz API)
- [ ] PDF vstupenky
- [ ] Kamera QR scan u vstupu (html5-qrcode nebo jsQR)

---

## Documentation

Technická a provozní dokumentace v `docs/`:

| Soubor | Obsah |
|--------|-------|
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | **Začni zde** — instrukce pro Claude Code, guardrails, příkazy |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, datový model, auth, kapacitní model |
| [`docs/FLOWS.md`](docs/FLOWS.md) | Hlavní flows krok za krokem |
| [`docs/ROUTES.md`](docs/ROUTES.md) | Tabulka všech rout + API endpointů |
| [`docs/EMAILS.md`](docs/EMAILS.md) | Email implementace, Resend, šablony, doručitelnost |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Env proměnné, seed, deploy, provozní postupy |
| [`docs/TESTING.md`](docs/TESTING.md) | Testovací checklisty |
