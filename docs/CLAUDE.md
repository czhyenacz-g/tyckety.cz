# CLAUDE.md — Instrukce pro Claude Code

> Začni tady. Tento soubor je vstupní bod pro každý Claude Code task na Tyckety.cz.

## Co je Tyckety.cz

Jednoduchý ticketing systém pro české pořadatele. Bez platební brány — zákazníci platí přes QR bankovní platbu (SPD standard) přímo na účet pořadatele. Pořadatel platbu potvrdí ručně a vystaví vstupenky. Vstup se kontroluje scannerem přes tajný URL token.

## MVP scope

Tyckety.cz je záměrně minimální. MVP zahrnuje:
- Magic-link přihlášení pořadatele
- Vytvoření a zveřejnění akce (jedna kategorie vstupenek)
- Veřejný nákup s QR bankovní platbou
- Ruční potvrzení platby a vystavení vstupenek pořadatelem
- QR vstupenky (tisk)
- Scanner u vstupu přes tajný token
- Email notifikace přes Resend (magic link, objednávka, vstupenky)
- Super admin panel /internal

## Hlavní product principles

1. **Jednoduchost** — žádná registrace, žádná platební brána, žádné složité workflow
2. **Minimum kroků** — zákazník: vyplní jméno+email → zaplatí QR → dostane vstupenku
3. **Žádná platební brána** — platba jde přímo na účet pořadatele; spárování je ruční
4. **KISS** — nepřidávat abstrakce, nedesignovat pro budoucnost, neopakovat DRY za každou cenu

## Guardrails — CO NEDĚLAT

- **Nemaž data z DB** — žádné `DELETE`, ani `prisma migrate reset`
- **Nespouštěj `prisma migrate reset`** — vždy jen `prisma db push`
- **Necommituj secrets** — žádné API klíče, connection strings, tokeny do gitu
- **Nerozšiřuj scope bez explicitního souhlasu** — žádná nová entita/feature navíc
- **Ticketing flow nesmí shodit email failure** — email je vždy v odděleném try/catch
- **Scanner nepotřebuje auth** — funguje přes tajný `ScanAccessToken.token` v URL, záměrně
- **/internal pouze pro SUPER_ADMIN_EMAILS** — kontroluje `isSuperAdmin()` + `requireSuperAdmin()`
- **Nepřidávej queue ani cron** — MVP neřeší background jobs

## Doporučený postup před každou změnou

1. Přečti relevantní docs (tento soubor + cílový doc v `docs/`)
2. Zkontroluj `prisma/schema.prisma` pro aktuální datový model
3. Přečti konkrétní route/page před úpravou
4. Udělej malý scope — jedna věc na commit
5. `npx tsc --noEmit` — typecheck
6. `npx next build` — build check
7. Commit

## Důležité příkazy

```bash
# Vývoj
npm run dev                        # http://localhost:3000

# Databáze (vyžaduje .env.local s DATABASE_URL + DIRECT_URL)
npx prisma generate                # regeneruj Prisma client po změně schema
npx prisma db push                 # aplikuj schema změny (bez migrace)
npm run db:seed                    # spusť seed (idempotentní)

# Validace před commitem
npx tsc --noEmit                   # typecheck
npx next build                     # production build

# Env (vyžaduje .env.local pro lokální příkazy)
export $(grep -v '^#' .env.local | xargs) && npx prisma db push
```

## Commit message styl

```
typ: stručný popis v češtině nebo angličtině

feat:  nová funkcionalita
fix:   oprava chyby
docs:  dokumentace
chore: konfigurace, deps, seed
refactor: refaktoring bez změny chování
```

Přidej `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` na konec commit message.

## Kde co najít

| Co hledáš | Kde |
|-----------|-----|
| Technická architektura | `docs/ARCHITECTURE.md` |
| Hlavní flows krok za krokem | `docs/FLOWS.md` |
| Tabulka všech rout | `docs/ROUTES.md` |
| Email implementace | `docs/EMAILS.md` |
| Provozní postupy | `docs/OPERATIONS.md` |
| Testovací checklisty | `docs/TESTING.md` |
| DB schema | `prisma/schema.prisma` |
| Lib funkce | `lib/` |
| Env proměnné | `docs/OPERATIONS.md` |
