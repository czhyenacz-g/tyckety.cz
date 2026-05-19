# ROUTES.md — Tabulka rout Tyckety.cz

## Veřejné stránky

| Route | Účel | Auth | Hlavní entity | Index | Poznámky |
|-------|------|------|---------------|-------|----------|
| `/` | Homepage | Žádná | — | ✅ | Landing page |
| `/[organizerSlug]` | Profil pořadatele + seznam akcí | Žádná | Organizer, Event | ✅ | Jen published events |
| `/[organizerSlug]/[eventSlug]` | Detail akce + formulář pro nákup | Žádná | Event, TicketCategory | ✅ | `generateMetadata` s OG; lazy expiration kapacity |
| `/objednavka/[orderToken]` | Stav objednávky, QR platba, vstupenky | Žádná | Order, Ticket | ❌ | Dostupné přes `publicToken`; lazy display expiry |
| `/vstupenka/[ticketToken]` | Detail vstupenky (QR, stav) | Žádná | Ticket | ❌ | Token z QR vstupenky |
| `/scan/[scanToken]` | Vstupní kontrola / scanner | Žádná | ScanAccessToken, Ticket | ❌ | Přístup jen s tajným tokenem |
| `/scan/demo` | Demo stránka scanneru | Žádná | — | ❌ | Statická ukázka |
| `/embed/[eventId]` | Embeddovatelný nákupní formulář | Žádná | Event, TicketCategory | ❌ | Pro iframe; `frame-ancestors *` CSP header |
| `/podminky` | Podmínky použití | Žádná | — | ✅ | Statická stránka |
| `/robots.txt` | Robots soubor | Žádná | — | — | Generovaný v `app/robots.ts` |
| `/sitemap.xml` | XML sitemap | Žádná | Event | — | Generovaný v `app/sitemap.ts`; jen published events |
| `/api/og` | Dynamický OG image | Žádná | — | — | Query params: `title`, `sub` |

## App / Organizer admin

| Route | Účel | Auth | Hlavní entity | Index | Poznámky |
|-------|------|------|---------------|-------|----------|
| `/prihlaseni` | Magic link přihlášení | Žádná | MagicLinkToken | ✅ | Podporuje `?next=` redirect; `?error=expired` |
| `/app` | Dashboard pořadatele | Session | Organizer, Event | ❌ | Redirect na `/prihlaseni?next=/app` bez session |
| `/app/akce` | Seznam akcí pořadatele | Session | Event | ❌ | |
| `/app/akce/nova` | Vytvoření nové akce | Session | Event, TicketCategory | ❌ | Validace bankAccount + notificationEmail |
| `/app/akce/[eventId]` | Detail akce + správa objednávek | Session | Event, Order, Ticket | ❌ | Lazy expiration; statistiky; embed kód; scan URL |

## Internal / Super admin

| Route | Účel | Auth | Hlavní entity | Index | Poznámky |
|-------|------|------|---------------|-------|----------|
| `/internal` | Super admin dashboard | Super admin | vše | ❌ | `robots: { index: false, follow: false }` |
| `/internal/events/[eventId]` | Detail akce pro super admina | Super admin | Event, Order, EmailMessage | ❌ | Email status sloupec v tabulce |

## API routes

### Auth

| Route | Method | Auth | Popis |
|-------|--------|------|-------|
| `/api/auth/request-link` | POST | Žádná | Vytvoří magic link token, odešle email; body: `{ email, next? }` |
| `/api/auth/verify` | GET | Žádná | Ověří token, vytvoří session, redirect; query: `?token=&next=` |
| `/api/auth/logout` | POST | Session | Zruší session cookie |

### Akce

| Route | Method | Auth | Popis |
|-------|--------|------|-------|
| `/api/akce` | POST | Session | Vytvoří akci + kategorii + scan token; body: formFields |
| `/api/akce/[eventId]/status` | PATCH | Session (vlastník) | Změní status akce; body: `{ status }` |

### Objednávky

| Route | Method | Auth | Popis |
|-------|--------|------|-------|
| `/api/objednavka` | POST | Žádná | Vytvoří objednávku; body: `{ eventId, categoryId, buyerName, buyerEmail, quantity }` |
| `/api/objednavka/[orderId]/paid` | PATCH | Session (vlastník) | Označí objednávku jako zaplacenou |
| `/api/objednavka/[orderId]/issue-tickets` | PATCH | Session (vlastník) | Vystaví vstupenky k objednávce |

### Scanner

| Route | Method | Auth | Popis |
|-------|--------|------|-------|
| `/api/scan/[scanToken]/validate` | POST | Žádná (tajný token) | Ověří vstupenku bez označení; body: `{ ticketToken }` |
| `/api/scan/[scanToken]/use` | POST | Žádná (tajný token) | Označí vstupenku jako použitou; body: `{ ticketToken }` |

### Internal

| Route | Method | Auth | Popis |
|-------|--------|------|-------|
| `/api/internal/events/[eventId]/status` | PATCH | Super admin | Změní status akce (admin override); body: `{ status }` |
| `/api/internal/events/[eventId]/deactivate-scanner` | POST | Super admin | Deaktivuje všechny aktivní scan tokeny akce |

## Pozn. k autorizaci

- **Session auth**: `getSession()` z `lib/auth.ts` — čte cookie `session`, ověří expiry
- **Vlastník akce**: `db.event.findFirst({ where: { id, organizerId: session.organizer.id } })`
- **Super admin**: `isSuperAdmin(session.organizer.email)` — kontroluje `SUPER_ADMIN_EMAILS` env var
- **Scanner**: nevyžaduje auth — přístup jen s tajným `ScanAccessToken.token`
- **`?next=` security**: `safeNext()` — musí začínat `/`, nesmí začínat `//` (open redirect protection)
