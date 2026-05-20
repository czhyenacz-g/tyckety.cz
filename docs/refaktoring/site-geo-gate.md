# Site Geo Gate — Tyckety.cz

## Cíl

Omezit veřejné používání Tyckety.cz na návštěvníky z ČR a SR.
Uživatelům mimo povolené země se zobrazí obecná chyba bez vysvětlení důvodu.

## Implementace

Soubor: `middleware.ts` v kořeni projektu (Next.js Edge Middleware).

### Jak funguje

1. Middleware čte country kód z HTTP hlaviček:
   - `x-vercel-ip-country` (Vercel automaticky přidává)
   - `cf-ipcountry` (Cloudflare, fallback)
2. Pokud country kód odpovídá `ALLOWED_SITE_COUNTRIES` → požadavek projde.
3. Pokud country kód chybí v **local development** (`NODE_ENV=development`) → požadavek projde.
4. Pokud country kód chybí v **production/staging** → požadavek je blokovaný.
5. Pokud country kód není v povolených zemích → blokuj (viz výjimka níže).

### Povolené země

```
ALLOWED_SITE_COUNTRIES=CZ,SK
```

Výchozí hodnota je v kódu `"CZ,SK"`. Lze přepsat env proměnnou.

### Odpověď pro blokované požadavky

```
HTTP 404 text/plain
Něco se nepodařilo. Zkuste to prosím později.
```

Důvod blokace se záměrně nezobrazuje.

### Výjimka pro vstupenku/objednávku z e-mailu

Mimo CZ/SK jsou dostupné **pouze** tyto routes, pokud obsahují UUID token:

| Route | Popis | Token |
|---|---|---|
| `/objednavka/{uuid}` | Detail objednávky | `publicToken` (UUID v4) |
| `/vstupenka/{uuid}` | Detail vstupenky | `ticketToken` (UUID v4) |

UUID je neuhodnutelný (kryptograficky náhodný, 122 bitů entropie).
Jiné routes (demo, listing, admin, embed, objednavka/demo) jsou blokovány normálně.

### Co je blokováno mimo CZ/SK

- Homepage
- Detail akce, listing akcí
- Admin/organizer stránky (`/app/*`, `/internal/*`)
- Legal stránky (`/legal/*`, `/podminky`)
- Embed stránky (`/embed/*`)
- Demo a scan stránky
- API routes (obecné)
- Vytvoření objednávky

### Co není blokováno (matcher výjimky)

- `_next/static/*` — JS/CSS chunks
- `_next/image/*` — image optimization
- `favicon.ico` a běžné asset přípony (svg, png, jpg, gif, webp)

### Logování při blokaci

Každý blokovaný požadavek se loguje do stdout (Vercel Log Drain):

```json
{
  "ts": "2025-06-01T12:00:00.000Z",
  "path": "/",
  "method": "GET",
  "country": "DE",
  "ua": "Mozilla/5.0 ...",
  "reason": "site_geo_not_allowed"
}
```

Neukládá se: cookies, authorization header, celé headers, IP adresa.

## Revertování

Smazat `middleware.ts` v kořeni projektu. Žádné další soubory nejsou dotčeny.

## TODO

- **ALLOWED_SITE_COUNTRIES** přidat do Vercel environment variables jako `ALLOWED_SITE_COUNTRIES=CZ,SK`
- Zvážit přidání `objednavka/demo` a `scan/demo` explicitně do blokovaných (jsou blokovány i bez toho, protože neobsahují UUID)
- Pokud bude potřeba blokovat konkrétní API route selektivně (např. `/api/og`), upřesnit matcher nebo přidat podmínku v middleware
- Monitoring: sledovat počet geo-blokovaných requestů přes Vercel Log Drain nebo externím nástrojem
