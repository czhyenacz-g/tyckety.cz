# HANDOVER_AND_DEPLOYMENT.md — Tyckety.cz

_Postup pro předání projektu nebo spuštění na jiném serveru / účtu._

---

## 1. Required accounts / services

| Služba | Účel | Alternativa |
|---|---|---|
| **GitHub** | Hosting kódu, CI trigger | GitLab, Bitbucket |
| **Vercel** | Hosting Next.js aplikace | Railway, Render, libovolný Node.js hosting |
| **PostgreSQL** | Databáze (aktuálně Supabase) | Neon, Railway Postgres, self-hosted |
| **Resend** | Transakční e-maily | Postmark, SendGrid, SMTP — stačí upravit `lib/email/provider.ts` |
| **tyckety.cz doména** | DNS, veřejný přístup | Lze změnit — viz R2 v CODE_QUALITY_AUDIT.md |

---

## 2. Environment variables

Všechny proměnné se nastavují ve Vercel dashboardu (Settings → Environment Variables) nebo `.env.local` lokálně. Viz `.env.example` pro formát bez secrets.

### `DATABASE_URL`
- **Účel**: Připojení k PostgreSQL přes pgbouncer connection pooler (pro Next.js runtime a Prisma queries)
- **Kde nastavit**: Vercel Production + Preview + Development; `.env.local` lokálně
- **Příklad**: `postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true`
- **Required**: ✅ Ano

### `DIRECT_URL`
- **Účel**: Přímé připojení k PostgreSQL (pro `prisma db push`, `prisma migrate`, seed)
- **Kde nastavit**: Vercel Development; `.env.local` lokálně; na CI kde spouštíš migrace
- **Příklad**: `postgresql://USER:PASSWORD@HOST:5432/postgres`
- **Required**: ✅ Ano (pro migrace/push; runtime funguje bez něj)

### `RESEND_API_KEY`
- **Účel**: Autentizace k Resend API pro odesílání e-mailů
- **Kde nastavit**: Vercel Production + Preview
- **Příklad**: `re_AbCdEfGh12345678`
- **Required**: ✅ Ano v produkci. V dev režimu (`NODE_ENV=development`) se emaily jen logují do konzole.

### `EMAIL_FROM`
- **Účel**: Odesílací adresa v hlavičce e-mailu
- **Kde nastavit**: Vercel Production + Preview
- **Příklad**: `Tyckety.cz <noreply@tyckety.cz>`
- **Required**: ✅ Ano — doména musí být ověřena v Resend. Bez nastavení se použije `Tyckety.cz <noreply@tyckety.cz>` jako fallback.

### `APP_URL`
- **Účel**: Veřejná URL aplikace — používá se v odkazech v e-mailech a v QR kódech vstupenek
- **Kde nastavit**: Vercel Production + Preview
- **Příklad**: `https://tyckety.cz`
- **Required**: ✅ Ano v produkci. Fallback je `https://tyckety.cz` — při změně domény je nastavení nutné.

### `SUPER_ADMIN_EMAILS`
- **Účel**: Čárkou oddělený seznam e-mailů s přístupem k `/internal` a `/api/internal/**`
- **Kde nastavit**: Vercel Production + Preview
- **Příklad**: `admin@example.com,backup@example.com`
- **Required**: ✅ Ano — bez nastavení není `/internal` přístupné nikomu.

---

## 3. Database setup

### Vytvoření databáze

Doporučeno: [Supabase](https://supabase.com) (bezplatný plán, EU region, dvojí connection string ihned k dispozici).

Alternativy: Neon, Railway, libovolný PostgreSQL 14+.

```bash
# Po vytvoření DB zkopíruj connection strings do .env.local nebo Vercel env
DATABASE_URL="postgresql://..."   # pooler, port 6543, ?pgbouncer=true
DIRECT_URL="postgresql://..."     # direct, port 5432
```

### Inicializace schématu

```bash
npm install
npx prisma generate       # generuje Prisma client
npx prisma db push        # aplikuje schema.prisma na DB (idempotentní)
npm run db:seed           # vytvoří demo data (idempotentní, lze opakovat)
```

### Seed

Seed (v `prisma/seed.ts`) vytvoří:
- Organizer `demo-podnik` s demo bankovním účtem
- Akci "TEST Heavy Metal Koncert" (status: published)
- Ticket kategorii "Základní vstupenka" (299 Kč, 120 míst)
- ScanAccessToken (pokud neexistuje)

Seed je idempotentní — opakované spuštění nepřidá duplikáty.

```bash
# Lokálně
npm run db:seed

# Na Vercelu (výjimečně, nespouštěj na produkci)
DIRECT_URL="..." npx prisma db seed
```

> ⚠️ **NIKDY nespouštěj `prisma migrate reset` na produkci.** Smaže všechna data. Používej výhradně `prisma db push`.

---

## 4. Email setup

### Resend

1. Registruj se na [resend.com](https://resend.com)
2. Přidej doménu: Settings → Domains → Add Domain
3. Přidej DNS záznamy dle instrukcí Resend (SPF, DKIM, DMARC)
4. Počkej na verifikaci (obvykle 5–30 minut)
5. Vytvoř API klíč: API Keys → Create API Key (Full access nebo Send access)
6. Nastav `RESEND_API_KEY` a `EMAIL_FROM`

### Doručitelnost

Před prvním ostrým provozem ověř doručitelnost na:
- Gmail (nejdůležitější)
- Seznam.cz
- Outlook / Hotmail

Postup:
1. Vytvoř testovací objednávku
2. Zkontroluj, zda e-mail dorazil do inbox (ne spam)
3. Zkontroluj email status v `/internal/events/{id}` (EmailMessage tabulka)

Pokud e-mail padá do spamu:
- Ověř DMARC záznam v DNS
- Zkontroluj `from` adresu — musí odpovídat ověřené doméně
- Zkontroluj, že `RESEND_API_KEY` je nastaven pro Production

---

## 5. Domain / DNS

### Připojení domény k Vercelu

1. Vercel dashboard → Project → Settings → Domains → Add
2. Přidej `tyckety.cz` a `www.tyckety.cz`
3. Vercel zobrazí DNS záznamy (A záznam nebo CNAME)
4. Nastav záznamy u registrátora domény
5. Vercel automaticky vydá SSL certifikát

### APP_URL

Po připojení domény nastav `APP_URL=https://tyckety.cz` (bez trailing slash) jako env var ve Vercelu.

### Search Console

Po indexování přidej doménu do [Google Search Console](https://search.google.com/search-console/) a ověř vlastnictví (Vercel automaticky přidává HTML tag). Odešli `https://tyckety.cz/sitemap.xml`.

---

## 6. Super admin

### Nastavení

```bash
# Vercel
vercel env add SUPER_ADMIN_EMAILS production
# → zadej: admin@example.com

# Nebo přes Vercel dashboard → Settings → Environment Variables
```

### Přístup k /internal

1. Přejdi na `https://tyckety.cz/prihlaseni`
2. Zadej e-mail, který je v `SUPER_ADMIN_EMAILS`
3. Klikni na magic link (přijde e-mailem nebo v dev konzoli)
4. Přejdi na `https://tyckety.cz/internal`

### Akce dostupné super adminovi

| Akce | Kde |
|---|---|
| Globální statistiky | `/internal` |
| Tabulka všech akcí | `/internal` |
| Publikovat / Depublikovat akci | `/internal` → řádek akce |
| Zrušit / Ukončit akci | `/internal` → řádek akce |
| Deaktivovat scanner | `/internal` → řádek akce |
| Detail akce (objednávky, platby, emaily) | `/internal/events/{id}` |

---

## 7. Demo data

### Co vytváří seed

- **Organizer** `demo-podnik` — demo pořadatel, slouží pro homepage demo flow
- **Bankovní účet v seed** — v `prisma/seed.ts` je nastaveno demo číslo účtu (`000000000/0000` po cleanup nebo původní). **Upozornění:** pokud je v seed reálný bankovní účet, zákazníci na demo akci pošlou reálné peníze na reálný účet. Před ostrým provozem ověř, že v seed je buď sandbox účet nebo plně dummy hodnota.
- **Demo akce** — `TEST Heavy Metal Koncert`, `published`, cena 299 Kč

### Co je bezpečné změnit v seed

- `name`, `slug`, `email`, `bankAccount` organizátora
- `title`, `slug`, `description`, `startsAt`, `venueName` akce
- `priceCzk`, `capacity` kategorie vstupenek

### Přegenerování seed dat

```bash
npm run db:seed   # idempotentní — aktualizuje stávající záznamy
```

---

## 8. Moving to another server

### Obecný postup

1. **Fork / clone repozitáře**
   ```bash
   git clone https://github.com/czhyenacz-g/tyckety.cz.git
   cd tyckety.cz
   npm install
   ```

2. **Nastavit env proměnné** — viz sekce 2 výše. Lokálně do `.env.local`, na hostingu přes dashboard nebo CLI.

3. **Vytvořit DB** a aplikovat schema:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

4. **Nastavit email provider** — Resend nebo alternativa (upravit `lib/email/provider.ts`)

5. **Nastavit doménu** — připojit k hostingu, nastavit SSL, DNS záznamy

6. **Build a deploy**:
   ```bash
   npx next build
   npx next start  # nebo hosting-specific deploy příkaz
   ```

7. **Smoke test** — viz sekce 9 níže

### Node.js runtime

Projekt vyžaduje Node.js 18+ (doporučeno 20 LTS). Next.js 15 App Router — není kompatibilní se statickými exporty, potřebuje server runtime.

### Hostingové alternativy k Vercelu

| Hosting | Kompatibilita | Poznámka |
|---|---|---|
| Railway | ✅ Plná | `npm run build && npm start` |
| Render | ✅ Plná | Web Service, Node env |
| Fly.io | ✅ Plná | Docker nebo buildpack |
| DigitalOcean App Platform | ✅ Plná | Node.js buildpack |
| VPS (Ubuntu) | ✅ Plná | PM2 + Nginx reverse proxy |

---

## 9. Production smoke test checklist

Po každém nasazení nebo migraci proveď tento test:

```
[ ] Login — přihlašovací e-mail dorazí do inbox (ne spam)
[ ] Magic link funguje, session se vytvoří
[ ] Vytvoření akce — /app/akce/nova
[ ] Zveřejnění akce — StatusButton → Zveřejnit
[ ] Veřejná stránka akce — /{slug}/{slug} je přístupná
[ ] Nákup vstupenky — PurchaseForm → objednávka vytvořena
[ ] Objednávková stránka — QR kód, VS, odpočet zobrazeny
[ ] E-mail zákazníkovi dorazí (nová objednávka)
[ ] E-mail pořadateli dorazí (nová objednávka)
[ ] Ruční označení platby — Označit zaplaceno
[ ] Vystavení vstupenek — Vystavit vstupenky
[ ] E-mail se vstupenkami dorazí zákazníkovi
[ ] Wallet view — vstupenky s QR kódy zobrazeny
[ ] QR kód vstupenky vede na správnou URL (APP_URL)
[ ] Scanner — /scan/{token} funguje bez přihlášení
[ ] Validace vstupenky — platná / použitá
[ ] CSV import — Raiffeisenbank CSV se zpracuje
[ ] Internal panel — /internal dostupný pro super admin e-mail
[ ] Sitemap — /sitemap.xml obsahuje akci
[ ] Robots — /robots.txt vrátí správná pravidla
```
