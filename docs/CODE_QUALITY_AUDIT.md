# CODE_QUALITY_AUDIT.md — Tyckety.cz

_Audit stavu kódu před případným prodejem nebo předáním._

---

## Summary

Projekt je zdravé MVP (~2 000 řádků produkčního kódu). Žádné blokující bezpečnostní problémy. Kód je přímočarý, unit testy chybí, ale hlavní flows jsou pokryty integrační logikou a ručními testy. Největší riziko je několik hardcoded hodnot a duplicitní business logika na dvou místech.

---

## What is solid

- **Auth** je jednoduchý a bezpečný: magic-link, session cookie, session expiry. Žádné heslo v DB.
- **Kapacitní ochrana**: `await expireStaleOrders(eventId)` před každým načtením statistik; `updateMany` s `status: { notIn: [...] }` guard při vystavení vstupenek a při ručním potvrzení platby.
- **Email isolation**: každý `enqueueAndTrySend` je v samostatném `try/catch` — chyba e-mailu nerozbíjí objednávku ani vystavení vstupenek.
- **CSV import idempotence**: duplicitní `transactionId` je zachycen na úrovni unique constraint i Set cache před zápisem.
- **Scanner**: žádná session auth — token v URL; `updateMany` s `status: "issued"` guard brání double-use při race condition.
- **Super admin**: `isSuperAdmin()` / `requireSuperAdmin()` kontrolováno na každé stránce i API route v `/internal`.
- **DB transakce**: order creation, ticket issuance, payment matching — všechny citlivé operace jsou v `$transaction`.
- **Prisma**: schema-first (`db push`), seed je idempotentní.

---

## Risks

### R1 — Hardcoded `https://tyckety.cz` v QR kódech ✅ opraveno v auditu

Před opravou: `app/objednavka/[orderToken]/page.tsx:90` a `app/vstupenka/[ticketToken]/page.tsx:55` generovaly QR kódy s hardcoded doménou — QR kódy ukazovaly na špatnou URL na preview deploy.

**Opraveno**: obě místa nyní používají `process.env.APP_URL ?? "https://tyckety.cz"`.

### R2 — Hardcoded doména v dalších místech (nízká priorita)

Soubory `app/sitemap.ts`, `app/robots.ts`, `app/layout.tsx`, `app/api/og/route.tsx`, iframe embed kód v `app/app/akce/[eventId]/page.tsx` — všechny mají natvrdo `https://tyckety.cz`.

Na produkci je to OK. Při přejmenování domény nebo white-label prodeji je potřeba projít a nahradit. Doporučení: vytvořit `lib/config.ts` se `siteUrl = process.env.APP_URL ?? "https://tyckety.cz"` a importovat.

### R3 — Demo slug hardcoded na třech místech

`"demo-podnik"` jako string literal v `app/page.tsx`, `app/[organizerSlug]/[eventSlug]/page.tsx`, `app/objednavka/[orderToken]/page.tsx`. Pokud pořadatel změní slug, disclaimer pro demo akci zmizí. Pro MVP to je přijatelné.

Doporučení: přesunout do konstanty nebo env proměnné `DEMO_ORGANIZER_SLUG`.

### R4 — `classifyOrder` logika duplicitně

`STATUS_PRIORITY` v `app/app/akce/[eventId]/page.tsx` (pro sort) a `classifyOrder` v `OrdersTable.tsx` (pro section grouping) pokrývají stejnou doménu různým způsobem. Pokud se přidá nový status, je potřeba změnit obě místa.

Doporučení: přesunout `classifyOrder` do `lib/orders.ts`.

### R5 — `app/objednavka/[orderToken]/page.tsx` je 487 řádků

Největší page komponenta. Obsahuje: async data fetching, QR generování, SPD string building, 6 různých render bloků pro různé statusy, print styling. Je čitelná, ale obtížně testovatelná.

Doporučení: extrahovat `buildPaymentQr(order)` do lib/. Rozdělit render bloky do subkomponent.

### R6 — `app/internal/events/[eventId]/page.tsx` je 519 řádků

Serverová komponenta s komplexním DB query, payment records tabulkou, orders tabulkou a email status. Čitelná, ale velká.

Doporučení: extrahovat payment records a orders do samostatných komponent (pro přehlednost, ne pro korektnost).

### R7 — Bankovní účet v seed souboru

`prisma/seed.ts` obsahuje `bankAccount: "8216903002/5500"` — reálné číslo účtu demo organizátora. Seed je v gitu ale bez secrets — číslo účtu je veřejná informace, takže to není security risk. Potenciální zákazník ale uvidí tento účet.

Doporučení: nahradit `"000000000/0000"` nebo placeholderem před prodejem.

### R8 — Bez unit testů

Žádné unit ani integration testy. Všechno je ověřováno ručně. Hlavní business logika (CSV parsing, SPD string, kapacitní guard) by měla mít unit testy.

Doporučení: přidat vitest/jest pro `lib/csv/raiffeisen.ts`, `lib/spd.ts`, `lib/orders.ts`.

### R9 — Vazba na Vercel

`next.config.ts` pravděpodobně neobsahuje Vercel-specific konfig, ale `docs/ARCHITECTURE.md` a seed uvažují Vercel jako hosting. Projekt je standardní Next.js App Router — běží na jakémkoli Node.js hostingu (Railway, Render, VPS). Není technicky závislý na Vercelu.

### R10 — Vazba na Supabase

Projekt používá standardní PostgreSQL. Žádný Supabase-specific kód — jen dvě connection strings. Lze migrovat na libovolný PostgreSQL (Railway, Neon, self-hosted).

### R11 — Vazba na Resend

`lib/email/provider.ts` používá Resend SDK. Pro jiného email providera stačí upravit tento soubor (~30 řádků). Interface je čistý: `sendEmail({ to, subject, html }) → { ok, error? }`.

---

## Recommended cleanup before sale

1. Nahradit bankovní účet v `prisma/seed.ts` placeholderem.
2. Extrahovat `DEMO_ORGANIZER_SLUG` do konstanty.
3. Přidat `lib/config.ts` se `siteUrl` (vyřeší R2 systemicky).
4. Přesunout `classifyOrder` do `lib/orders.ts`.

---

## Recommended cleanup later

- Unit testy pro `lib/csv/raiffeisen.ts`, `lib/spd.ts`, `lib/orders.ts`.
- Extrahovat render bloky v `objednavka/page.tsx` do subkomponent.
- Přidat kamerový QR scan do scanneru (`ScannerForm.tsx` má TODO).
- Přidat automatické párování plateb (Fio API nebo jiné).

---

## Do not touch before first real test

- Payment flow (order creation, expiry, capacity guard)
- Email outbox architektura
- Ticket issuance transakce
- Scanner API (validate + use)
- CSV import idempotence logika
