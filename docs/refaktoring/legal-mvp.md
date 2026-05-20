# Legal MVP — Tyckety.cz

Přidáno: 2025-05-20

## Co bylo přidáno

### 1. Právní stránky
- `/legal/terms` — Obchodní podmínky (platné od 1. 6. 2025)
- `/legal/privacy` — Zásady ochrany osobních údajů (platné od 1. 6. 2025)

Obsah zahrnuje:
- roli Tyckety jako technického poskytovatele (ne pořadatele)
- odpovědnost pořadatele za akci, platby a reklamace
- právo Tyckety blokovat podezřelé akce
- jaké osobní údaje se zpracovávají a za jakým účelem
- právní základ zpracování (plnění smlouvy, ne marketingový souhlas)

### 2. Footer
- Nová komponenta `app/components/Footer.tsx` s odkazem na terms + privacy + kontakt
- Použita na: `/legal/terms`, `/legal/privacy`, detail akce (`/[organizerSlug]/[eventSlug]`)
- Homepage má vlastní inline footer — doplněny tam links na legal pages

### 3. Detail akce — blok pořadatele
Na veřejném detailu akce je nový blok **"Pořadatel akce"** s:
- jménem pořadatele
- IČO (pokud vyplněno)
- e-mail pořadatele
- bankovní účet (kam jdou platby)
- disclaimer: Tyckety nejsou pořadatel

### 4. Nahlášení podezřelé akce
Na detailu akce je nenápadný odkaz **"Nahlásit podezřelou akci"** — mailto na `info@tyckety.cz`
s předvyplněným předmětem a URL akce.

### 5. Objednávkový formulář — terms + GDPR info
`PurchaseForm.tsx` obsahuje:
- **Povinný checkbox**: "Souhlasím s obchodními podmínkami" (odkaz na /legal/terms)
- **GDPR informační text** (bez checkboxu): účel zpracování + odkaz na /legal/privacy

### 6. Nové stavy akcí

| Stav | Kdo nastavuje | Popis |
|---|---|---|
| `draft` | pořadatel (výchozí) | Koncept, neviditelný |
| `pending_review` | pořadatel | Odesláno ke schválení interním adminem |
| `published` | **jen interní admin** | Veřejně dostupná, lze nakupovat |
| `blocked` | **jen interní admin** | Zablokovaná (podezřelá/porušení podmínek) |
| `cancelled` | pořadatel / admin | Zrušená |
| `ended` | pořadatel / admin | Ukončená |

**Organizer API** (`/api/akce/[eventId]/status`): smí nastavit pouze `draft`, `pending_review`, `cancelled`, `ended`.

**Internal API** (`/api/internal/events/[eventId]/status`): smí nastavit vše včetně `published` a `blocked`.

**StatusButton** (organizer admin):
- draft → tlačítko "Odeslat ke schválení" (nastaví `pending_review`)
- pending_review → badge "Čeká na schválení" (nelze klikat)
- blocked → badge "Zablokováno" (nelze klikat)
- published → tlačítko "Depublikovat"

**InternalTable** (internal panel): pro `pending_review` akce se zobrazí "✓ Schválit" a "✗ Blokovat".

### 7. Bezpečnost objednávek
`POST /api/objednavka` nyní ověřuje, že event má `status === "published"`.
Pokus o objednávku pro draft/pending_review/blocked event vrátí HTTP 403.

### 8. Export CSV
Pořadatel může exportovat CSV s objednávkami a vstupenkami pro konkrétní akci.

- **Endpoint**: `GET /api/akce/[eventId]/export-csv`
- **Auth**: vyžaduje session (jen pořadatel vlastní akce)
- **Tlačítko**: v admin detailu akce vedle nadpisu "Objednávky"

CSV obsahuje: datum objednávky, ID objednávky, jméno, e-mail, typ vstupenky, počet ks, cena, stav objednávky, stav platby, variabilní symbol, ID vstupenky, token vstupenky (QR), stav vstupenky.

### 9. Schema změny
- `EventStatus` enum: přidány `pending_review` a `blocked`
- `Organizer` model: přidáno volitelné pole `ico String?`

## Co zůstává TODO

- **Anonymizace/zkomolení osobních údajů po čase** — záměrně neřešeno v tomto PR
- **Marketing souhlas** — připraven text v privacy page; infrastruktura pro opt-in newsletter zatím neexistuje
- **KYC pořadatelů** — neřeší se; pořadatelé se registrují bez ověření identity
- **IČO validace** — pole existuje v modelu, ale není validováno ani zobrazeno v registračním formuláři; TODO přidat do `app/app/akce/nova` nebo nastavení pořadatele
- **Notifikace pořadatele při blokaci** — admin zablokuje akci, ale pořadatel nedostane e-mail; TODO přidat e-mailovou notifikaci
- **Notifikace admina při `pending_review`** — akce odeslána ke schválení, admin nedostane notifikaci; TODO přidat e-mail / Slack webhook
- **Platební podmínky reklamací** — pořadatel odpovídá, ale Tyckety nemají mechanismus pro vymáhání vrácení peněz
- **GDPR request handling** — práva subjektů dat (přístup, výmaz) zatím jen textově v privacy page; žádný automatizovaný tok

## Soubory změněny / přidány

### Nové soubory
- `app/legal/terms/page.tsx`
- `app/legal/privacy/page.tsx`
- `app/components/Footer.tsx`
- `app/api/akce/[eventId]/export-csv/route.ts`
- `docs/refaktoring/legal-mvp.md` (tento soubor)

### Upravené soubory
- `prisma/schema.prisma` — EventStatus enum, Organizer.ico
- `app/[organizerSlug]/[eventSlug]/page.tsx` — pořadatel blok, report link, footer
- `app/[organizerSlug]/[eventSlug]/PurchaseForm.tsx` — terms checkbox, GDPR info
- `app/app/akce/[eventId]/StatusButton.tsx` — pending_review flow
- `app/app/akce/[eventId]/page.tsx` — STATUS_LABEL/COLOR, CSV export button
- `app/api/akce/[eventId]/status/route.ts` — organizer VALID statuses
- `app/api/internal/events/[eventId]/status/route.ts` — internal ALLOWED_STATUSES
- `app/internal/InternalTable.tsx` — nové statusy + approve/block akce
- `app/api/objednavka/route.ts` — security check event.status === published
- `app/page.tsx` — footer links na legal pages
