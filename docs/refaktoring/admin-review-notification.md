# Admin Review Notification — Tyckety.cz

## Cíl

Provozovatel (admin) dostane e-mail, kdykoli pořadatel odešle akci ke schválení (`pending_review`).
Jde o provozní upozornění, ne anti-fraud systém.

## Kdy se notifikace posílá

- Přechod stavu akce **z jiného stavu → `pending_review`**
- **Neduplikuje se:** pokud je akce již v `pending_review` a pořadatel by znovu odeslal
  (v praxi nemožné přes UI, ale guarda je i v API)
- Pokud pořadatel stáhne akci zpět do `draft` a znovu odešle, e-mail se pošle znovu

## Env proměnná

```
ADMIN_REVIEW_EMAIL=admin@example.com
```

Přidat do Vercel environment variables (Production + Preview).

**Pokud proměnná není nastavena:** notifikace se přeskočí, do logu se vypíše warning.
Změna statusu akce **vždy proběhne úspěšně** bez ohledu na e-mail.

## Co se stane při selhání e-mailu

Chyba posílání se zaloguje do stdout (`console.error`), ale:
- akce zůstane v `pending_review`,
- API vrátí `{ ok: true }`,
- uživatel nic nepozná.

E-mail se posílá **fire-and-forget** (`.then().catch()`) — neblokuje HTTP response.

## Kde je implementováno

- **`app/api/akce/[eventId]/status/route.ts`** — notifikace volána po úspěšném DB update
- **`lib/email/templates.ts`** — `pendingReviewAdminTemplate()` — HTML šablona e-mailu
- **`lib/email/provider.ts`** — `sendEmail()` — Resend / dev log

## Obsah e-mailu

- Předmět: `Nová akce čeká na schválení: {eventTitle}`
- Název akce, slug, datum a čas, místo
- Pořadatel: jméno, e-mail, IČO (pokud vyplněno), bankovní účet
- Počet typů vstupenek, celková kapacita
- Přímý odkaz na `/internal/events/{eventId}` pro schválení/blokaci
- Čas odeslání ke schválení

## TODO

- Přidat `ADMIN_REVIEW_EMAIL` do Vercel env variables pro produkci
- Zvážit notifikaci pořadateli při blokaci akce adminem (záměrně v TODO)
- Pokud bude více adminů, rozšířit `ADMIN_REVIEW_EMAIL` na comma-separated list
