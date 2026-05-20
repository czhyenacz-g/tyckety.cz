# PROJECT_OVERVIEW_FOR_BUYER.md — Tyckety.cz

_Věcný přehled projektu pro potenciálního kupce nebo technického poradce._

---

## Co je Tyckety

Tyckety je jednoduchý online ticketing systém pro české pořadatele malých akcí. Zákazníci platí přes QR bankovní platbu přímo na účet pořadatele — bez platební brány, bez poplatků za transakci, bez registrace zákazníka.

## Pro koho je projekt určený

Pořadatelé malých akcí v ČR: klubové koncerty, festivaly do 500 lidí, sportovní a kulturní akce, workshopy. Typický případ: pořadatel má Facebook event a potřebuje jednoduché předprodeje bez Ticketmasteru.

## Jaký problém řeší

Existující ticketing platformy (Ticketmaster, GoOut, Vstupenka.cz) berou 5–15 % z každé vstupenky a/nebo mají složité onboarding procesy. Tyckety umožňuje pořadateli spustit prodej za hodinu, platby chodí přímo na jeho bankovní účet a systém mu pomáhá spárovat platby s objednávkami.

---

## Aktuální MVP funkce

### Zákaznický flow
- **Demo landing page** — homepage ukazuje demo koncert jako fungující ukázku produktu
- **Veřejná stránka akce** — s plakátem, popisem, datem, místem, cenou a formulářem pro nákup
- **Bankovní QR platba** — generovaný SPD QR kód pro platbu přímo na účet pořadatele; variabilní symbol, částka a deadline automaticky
- **Stránka objednávky** — zákazník vidí status objednávky, QR platbu, odpočet; po potvrzení se přepne na wallet view s QR vstupenkami
- **QR vstupenky** — digitální, tisknutelné; odkaz na jednotlivou vstupenku; branding Tyckety.cz
- **Embed** — formulář pro nákup jako iframe na cizí web

### Pořadatelský flow
- **Magic-link přihlášení** — bez hesla, bez registrace třetí strany
- **Správa akcí** — vytvoření, zveřejnění, depublikování, ukončení, zrušení
- **Admin panel objednávek** — přehled ve 4 sekcích (Problematické / Objednávky / Zaplacené / Vyřízené), search
- **Ruční potvrzení platby** — jedním kliknutím, s capacity guardem pro expirované objednávky
- **Hromadné označení podle kódů** — vložit seznam variabilních symbolů, systém označí zaplacené
- **Raiffeisenbank CSV import** — automatické párování plateb z výpisu; rozlišuje exact match, amount_mismatch, unknown_symbol, duplicity
- **Vystavení vstupenek** — jedním kliknutím; generuje QR kódy, posílá e-mail zákazníkovi
- **Scanner** — token-based URL bez přihlášení; validace a označení vstupenky jako použité; race-condition safe

### Systémové funkce
- **E-mail outbox** — Resend; 4 typy e-mailů (magic link, nová objednávka zákazník, nová objednávka pořadatel, vstupenky vydány); audit v DB; chyba e-mailu nerozbíjí flow
- **Internal super admin panel** — globální statistiky, správa všech akcí, PaymentRecords přehled
- **SEO** — robots.txt, sitemap.xml, noindex pro transakční stránky, OG image generátor
- **Beta banner** — globální upozornění na MVP provoz

---

## Co projekt záměrně nedělá (a proč)

| Co chybí | Proč |
|---|---|
| Platební brána (Stripe, GoPay) | Záměrně — bankovní QR platba je pro ČR přirozená, nulové transakční poplatky |
| Marketplace více pořadatelů | MVP fokus — jeden pořadatel = jeden Tyckety účet |
| Číslované sezení | Nevhodné pro cílový segment (standing koncerty, festivaly) |
| Automatické bankovní API | Plánováno (Fio API) — ruční/CSV import je pro MVP dostačující |
| Mobilní app | Není potřeba — scanner funguje v prohlížeči |

---

## Technický stack

| Vrstva | Technologie | Poznámka |
|---|---|---|
| Framework | Next.js 15 App Router | Server components, React 19 |
| Hosting | Vercel | Není závislost — běží na libovolném Node.js |
| Databáze | PostgreSQL (Supabase) | Standardní Postgres — přenositelné |
| ORM | Prisma 6 | Schema-first, `db push` |
| Email | Resend | ~30 řádků wrapper — snadno vyměnitelné |
| Styling | Tailwind CSS | Dark theme, mobile-first |
| QR kódy | `qrcode` npm | Server-side SVG generování |
| Analytics | Vercel Analytics | Volitelné |

**Velikost codebase**: ~2 500 řádků TypeScript (bez node_modules, .next, docs). Jednoduchá orientace pro nového vývojáře.

---

## Hlavní aktiva projektu

1. **Doména tyckety.cz** — přímočará, zapamatovatelná, česká
2. **Kód a architektura** — funkční end-to-end flow od objednávky po scan; kapacitní ochrana; idempotentní CSV import; email isolation
3. **DB schema** — promyšlený datový model pro ticketing, orders, payments, emails
4. **Demo flow** — plně funkční ukázka na homepage s reálnou akcí; zákazník může koupit lístek bez zásahu pořadatele
5. **Dokumentace** — kompletní v `docs/` (architektura, flows, routes, emails, payments, operations, testing)
6. **Procesy** — ruční i CSV-based platební reconciliation; scanner flow pro vstup na akci

---

## Rizika / otevřené body

| Oblast | Stav | Poznámka |
|---|---|---|
| Email deliverability | ⚠️ Netestováno | Gmail/Seznam/Outlook inbox vs spam — potřeba ověřit s reálnými adresami |
| Bankovní párování | ⚠️ MVP | CSV import funguje; automatické API (Fio) není implementováno |
| Právní texty | ⚠️ Beta | `/podminky` je placeholder pro beta; potřeba doladit pro reálný provoz |
| Produkční test | ⚠️ Chybí | Projekt nebyl testován s reálným pořadatelem a reálnými zákazníky |
| Unit testy | ❌ Chybí | Žádné unit ani integration testy — main logika ověřena ručně |
| Kamerový QR scan | 📝 TODO | Scanner aktuálně vyžaduje ruční zadání token stringu |

---

## Doporučený roadmap po převzetí

**Týden 1 — produkční test**
- Provést ruční smoke test celého flow (viz `docs/TESTING.md`)
- Ověřit email deliverability na Gmail, Seznam, Outlook
- Spustit demo akci s reálnými zákazníky

**Měsíc 1 — stabilizace**
- Doladit právní texty
- Přidat unit testy pro CSV parsing a SPD string
- Opravit hardcoded doménu v `sitemap.ts`, `robots.ts`, `layout.tsx` přes `lib/config.ts`

**Měsíc 2–3 — growth**
- Automatické párování plateb (Fio API nebo Raiffeisen API)
- Kamerový QR scan v scanneru
- Více typů e-mailů (připomínka akce, vstupenka 1 den před)

**Dlouhodobě**
- Multi-currency / mezinárodní akce
- PDF export vstupenek
- Reporty a exporty pro pořadatele
