# ARCHITECTURE.md — Technická architektura Tyckety.cz

## Stack

| Vrstva | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Hosting | Vercel (auto-deploy z GitHubu na push do `main`) |
| Databáze | Supabase PostgreSQL |
| ORM | Prisma 6 |
| Email | Resend |
| Styling | Tailwind CSS 3 |
| Analytics | Vercel Analytics + GoatCounter (volitelné) |
| QR kódy | `qrcode` npm package (SVG, server-side) |

## Next.js App Router

- `app/` — stránky a API routes
- Server components všude kde jde; client komponenty označeny `"use client"` jen kde je nutný stav/interakce
- `params` jsou vždy `Promise<{...}>` — musí se `await params` před použitím
- `generateMetadata` pro SEO — async, čte z DB

## Vercel

- Deploy: push do `main` → automatický build + deploy
- Build script: `prisma db push && prisma generate && next build`
- Env proměnné spravovány přes Vercel dashboard nebo CLI (`vercel env`)
- Serverless functions — každý API route handler je samostatná lambda
- Fluid Compute (výchozí) — sdílení instancí, Node.js runtime

## Supabase PostgreSQL

Dvě connection strings (nutné obě):
- `DATABASE_URL` — `pooler.supabase.com:6543` (pgbouncer, pro runtime/Prisma queries)
- `DIRECT_URL` — `pooler.supabase.com:5432` (přímé spojení, pro `prisma db push` a migrace)

## Prisma

- Schema: `prisma/schema.prisma`
- Žádné migrace — používáme `prisma db push` (schema-first, dev-friendly)
- Seed: `prisma/seed.ts` spouštěný přes `npm run db:seed` (idempotentní)
- Serializable transakce pro order creation (ochrana kapacity)

## Public assets

- `public/images/` — lokální plakáty (posterUrl ve formátu `/images/...`)
- Externě hostované plakáty: URLs musí projít validací v `next.config.ts` (remotePatterns)
- OG image: generováno dynamicky přes `/api/og`

---

## Datový model

### Organizer
Pořadatel akcí. Vzniká automaticky při prvním magic-link přihlášení.

| Pole | Popis |
|------|-------|
| `id` | UUID |
| `name` | Zobrazované jméno (defaultně část emailu) |
| `slug` | URL slug (unikátní, generovaný z emailu) |
| `email` | Přihlašovací email (unikátní) |
| `bankAccount` | Číslo účtu ve formátu `XXXXXXXX/XXXX` (pro QR platbu) |
| `notificationEmail` | Kam posílat email notifikace o objednávkách |

### Event
Akce pořadatele.

| Pole | Popis |
|------|-------|
| `status` | `draft` / `published` / `cancelled` / `ended` |
| `slug` | URL slug (unikátní) |
| `posterUrl` | Lokální `/images/...` nebo absolutní URL |
| `startsAt` | Datum a čas začátku akce |

Veřejně viditelné jsou jen akce se statusem `published`.

### TicketCategory
Kategorie vstupenek k akci. MVP používá jednu kategorii, model podporuje více.

| Pole | Popis |
|------|-------|
| `priceCzk` | Cena v Kč |
| `capacity` | Celková kapacita |
| `soldCount` | Počet potvrzených (vydaných) vstupenek — inkrementuje se při `issue-tickets` |

### Order
Objednávka zákazníka.

| Status | Popis |
|--------|-------|
| `awaiting_payment` | Čeká na platbu (deadline 15 min zobrazení, 60 min grace) |
| `payment_window_expired` | Platební lhůta vypršela (lazy expiration) |
| `paid` | Pořadatel potvrdil platbu |
| `tickets_issued` | Vstupenky vystaveny |
| `payment_received_late` | Platba dorazila po lhůtě |
| `manual_review` | Ruční řešení |
| `expired` | Finálně expirováno |

`variableSymbol` — 10-místný string (7 číslic timestamp % 10M + 3 náhodné), unikátní. Max 3 pokusy o vygenerování při konfliktu (P2002).

`publicToken` — UUID, veřejně sdílené v URL `/objednavka/[token]`.

`paymentDisplayDeadlineAt` — +15 minut od vytvoření (zobrazení zákazníkovi)
`paymentGraceDeadlineAt` — +60 minut od vytvoření (grace pro pozdní platby)

### Ticket
Individuální vstupenka. Vzniká při "Vystavit vstupenky", ne při objednávce.

| Status | Popis |
|--------|-------|
| `issued` | Platná, nevyužita |
| `used` | Naskenována u vstupu |
| `cancelled` | Zrušena |

`token` — UUID, kóduje se do QR. URL: `https://tyckety.cz/vstupenka/{token}`

### ScanAccessToken
Tajný token pro přístup ke scanneru. Jeden token na akci, aktivní = `active: true`.

URL pro obsluhu vstupu: `/scan/{token}` — bez auth, přístup jen s tokenem.

Deaktivace: `POST /api/internal/events/{eventId}/deactivate-scanner`

### MagicLinkToken
Jednorázový přihlašovací token. Expiruje za 15 minut. Po použití nastaví `usedAt`.

Nový login invaliduje všechny předchozí nepoužité tokeny daného organizer.

### Session
Cookie-based session. Expiruje za 30 dní. Cookie: `session` (httpOnly, secure v produkci, sameSite: lax).

### EmailMessage
Záznam každého odeslaného nebo pokusovaného emailu.

| Status | Popis |
|--------|-------|
| `queued` | Vytvořen v DB, ještě neodeslán |
| `sending` | Odesílání probíhá |
| `sent` | Úspěšně odesláno |
| `failed` | Odeslání selhalo (viz `error` pole) |

Detaily v `docs/EMAILS.md`.

---

## Auth model

1. Organizer zadá email na `/prihlaseni`
2. `POST /api/auth/request-link` → vytvoří `MagicLinkToken`, odešle email s odkazem
3. Zákazník klikne na odkaz → `GET /api/auth/verify?token=...&next=...`
4. Token je ověřen, `Session` je vytvořena, cookie `session` je nastavena
5. Redirect na `?next=` (bezpečnostní validace: musí začínat `/`, nesmí začínat `//`)

**SUPER_ADMIN_EMAILS** — env var, čárkou oddělené emaily. Kontroluje se v `isSuperAdmin(email)` (`lib/super-admin.ts`). `/internal` a jeho API routes vyžadují super admin.

## Kapacitní model

```
dostupná kapacita = category.capacity - category.soldCount - activeReservations
```

- `soldCount` = počet potvrzených vstupenek (inkrementuje se při `issue-tickets`)
- `activeReservations` = suma `quantity` objednávek se statusem `awaiting_payment` a `paymentDisplayDeadlineAt > now()`

**Lazy expiration**: `expireStaleOrders(eventId)` je voláno před každou novou objednávkou a při načtení admin stránky akce. Označí prošlé `awaiting_payment` objednávky jako `payment_window_expired`.

Order creation používá **Serializable isolation** transakci pro ochranu před race condition.

## Payment model

1. Zákazník dostane QR kód ve SPD formátu (Czech banking standard, `lib/spd.ts`)
2. QR obsahuje: IBAN pořadatele, částku, variabilní symbol, zprávu
3. IBAN se generuje z čísla účtu formátu `XXXXXXXX/XXXX` pomocí `czechAccountToIBAN()`
4. Zákazník zaplatí přes mobilní bankovnictví → pořadatel vidí platbu na svém účtu
5. Pořadatel ručně klikne "Označit zaplaceno" → `PATCH /api/objednavka/{id}/paid`
6. Žádné automatické párování plateb v MVP

## Ticket model

- Vstupenky se **nevytvářejí při objednávce** — pouze při "Vystavit vstupenky"
- `PATCH /api/objednavka/{id}/issue-tickets` — vytvoří `Ticket` záznamy, inkrementuje `soldCount`
- Ochrana proti double-click: transakce znovu čte stav objednávky uvnitř
- Scanner validace: `POST /api/scan/{scanToken}/validate` — vrátí stav bez označení
- Scanner použití: `POST /api/scan/{scanToken}/use` — `updateMany` s podmínkou `status === "issued"` (race condition safe)

## Internal admin

`/internal` — super admin dashboard (noindex, robots: follow: false)
- Globální statistiky přes 9 paralelních DB queries
- Tabulka všech akcí s per-event stats
- Akce: změna statusu, deaktivace scanneru
- Detail akce: `/internal/events/{eventId}` — objednávky s email statusem

## SEO

- `app/sitemap.ts` — generuje XML sitemap pro všechny published events
- `app/robots.ts` — `robots.txt`
- `/internal` a `/objednavka/*` mají `robots: { index: false }`
- OG image: `/api/og` (dynamický endpoint)
- `generateMetadata` v event page: title, description, OG, Twitter card
