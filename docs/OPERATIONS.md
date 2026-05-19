# OPERATIONS.md — Provozní manuál

## Env proměnné na Vercelu

Spravovány přes Vercel dashboard → Project → Settings → Environment Variables, nebo přes CLI.

| Proměnná | Kde | Popis |
|----------|-----|-------|
| `DATABASE_URL` | Production + Preview | Supabase pooler, port 6543 (`?pgbouncer=true`) |
| `DIRECT_URL` | Production + Preview | Supabase direct, port 5432 (pro migrace/push) |
| `RESEND_API_KEY` | Production + Preview | Resend API klíč (`re_...`) |
| `EMAIL_FROM` | Production + Preview | `Tyckety.cz <noreply@tyckety.cz>` |
| `APP_URL` | Production + Preview | `https://tyckety.cz` |
| `SUPER_ADMIN_EMAILS` | Production + Preview | Čárkou oddělené emaily super adminů |

```bash
# Přidat env var přes CLI
vercel env add NAZEV_PROMENNE production
vercel env add NAZEV_PROMENNE preview "" --value "hodnota" --yes

# Zobrazit seznam
vercel env ls

# Odstranit
vercel env rm NAZEV_PROMENNE
```

## Jak spustit seed

Seed je idempotentní — lze spustit opakovaně, nevytvoří duplikáty.

```bash
# Lokálně (vyžaduje .env.local)
export $(grep -v '^#' .env.local | xargs) && npm run db:seed
```

Seed vytvoří/aktualizuje:
- Organizer `demo-podnik` (bankAccount: `8216903002/5500`, notificationEmail: `czhyenacz@gmail.com`)
- Event "TEST Heavy Metal Koncert" (status: `published`, posterUrl: `/images/test_koncert_web.webp`, priceCzk: 299, capacity: 120)
- TicketCategory "Základní vstupenka" (299 Kč, 120 míst)
- ScanAccessToken (pokud neexistuje)

## Jak zkontrolovat produkční DB

```bash
# Přímý dotaz přes Prisma (lokálně s DIRECT_URL)
export $(grep -v '^#' .env.local | xargs)
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.organizer.findMany().then(r => console.log(JSON.stringify(r, null, 2))).finally(() => db.\$disconnect());
"
```

Nebo přes Supabase dashboard → Table Editor.

## Jak používat /internal

1. Přihlaš se emailem, který je v `SUPER_ADMIN_EMAILS`
2. Přejdi na `tyckety.cz/internal`
3. Vidíš: globální statistiky, tabulku všech akcí

Dostupné akce pro každou akci:
- **Publikovat / Depublikovat** — změní status (draft ↔ published)
- **Zrušit akci** (s potvrzením) — status `cancelled`
- **Ukončit akci** — status `ended`
- **Deakt. scanner** — deaktivuje všechny aktivní scan tokeny akce

Detail akce: `tyckety.cz/internal/events/{eventId}` — kompletní info, všechny objednávky s email statusem.

## Jak zrušit / depublikovat akci

**Pořadatel** (přes vlastní admin):
- `/app/akce/{eventId}` → StatusButton → změna statusu

**Super admin** (přes internal panel):
- `/internal` → řádek akce → tlačítka Publikovat/Depublikovat/Zrušit/Ukončit
- API: `PATCH /api/internal/events/{eventId}/status` body: `{ status: "cancelled" }`

## Jak deaktivovat scanner

**Super admin**:
- `/internal` → řádek akce → "Deakt. scanner"
- API: `POST /api/internal/events/{eventId}/deactivate-scanner`

Po deaktivaci je scan token neplatný — URL `/scan/{token}` vrátí 403.

Nový scan token se nyní negeneruje automaticky — pokud je potřeba, musí se přidat přes DB.

## Jak ověřit objednávky a příspěvky

**Pořadatel** na `/app/akce/{eventId}`:
- Tabulka objednávek s: jméno, email, počet, částka, VS, status, datum
- Kliknutí na VS zobrazí objednávku zákazníka

**Super admin** na `/internal/events/{eventId}`:
- Kompletní tabulka se vším včetně email statusu
- Odkaz "Zobrazit ↗" na každou objednávku

Platbu ověřit: zkontrolovat bankovní výpis — variabilní symbol musí souhlasit.

## Jak řešit failed email

1. Otevři `/internal/events/{eventId}` — sloupec "E-mail" ukazuje `failed`
2. Zkontroluj logy ve Vercelu: Vercel dashboard → Project → Functions → konkrétní request
3. Nejčastější příčiny:
   - Chybí nebo neplatný `RESEND_API_KEY` → přidej/obnov na Vercelu
   - Doména odesílatele není ověřená v Resendu → ověř DNS záznamy
   - Adresát odmítl email (bounce) → Resend dashboard → Logs
4. V MVP neexistuje retry mechanismus — pokud je email kritický, kontaktuj zákazníka ručně

## Jak řešit pozdní platbu

Situace: platba dorazila po vypršení `paymentDisplayDeadlineAt` (15 min), ale ještě před `paymentGraceDeadlineAt` (60 min).

1. Pořadatel vidí platbu na bankovním výpisu s VS
2. Najde objednávku v `/app/akce/{eventId}` nebo `/internal/events/{eventId}` podle VS
3. Objednávka může mít status `payment_window_expired` — pořadatel/super admin označí manuálně jako zaplacenou:
   - Pořadatel: "Označit zaplaceno" tlačítko (dostupné i pro expired objednávky)
4. Pak vystaví vstupenky standardně

## Co dělat před veřejným sdílením akce

Checklist:
- [ ] Akce má status `published`
- [ ] Datum a místo jsou správně
- [ ] Cena vstupenky a kapacita jsou správně
- [ ] `bankAccount` pořadatele je vyplněno (jinak QR kód nefunguje)
- [ ] Plakát se zobrazuje (lokální `/images/...` nebo platná HTTPS URL)
- [ ] Odkaz `/{organizerSlug}/{eventSlug}` se otevře a zobrazí formulář
- [ ] Scan token existuje (vidí ho pořadatel na detailu akce)
- [ ] Email odesílání funguje — otestuj magic link na produkci

## Deploy

Auto-deploy: push do větve `main` → Vercel začne build automaticky.

```bash
git push origin main
```

Ruční deploy:
```bash
vercel --prod
```

Build skript: `prisma db push && prisma generate && next build`
— `prisma db push` na Vercelu při každém deployi ověří/aplikuje schema změny.
