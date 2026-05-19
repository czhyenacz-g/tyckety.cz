# EMAILS.md — Email implementace

## Provider: Resend

[Resend](https://resend.com) — transakční emaily. API wrapper v `lib/email/provider.ts`.

### Env proměnné

| Proměnná | Popis | Příklad |
|----------|-------|---------|
| `RESEND_API_KEY` | API klíč z Resend dashboardu | `re_...` |
| `EMAIL_FROM` | Odesílatel v plném formátu | `Tyckety.cz <noreply@tyckety.cz>` |
| `APP_URL` | Absolutní URL aplikace (pro odkazy v emailech) | `https://tyckety.cz` |

Všechny tři jsou nastaveny na Vercelu pro Production + Preview.

## Datový model: EmailMessage

`prisma/schema.prisma` — model `EmailMessage`

| Pole | Typ | Popis |
|------|-----|-------|
| `id` | UUID | |
| `type` | EmailType enum | Typ emailu |
| `status` | EmailStatus enum | Stav doručení |
| `to` | String | Adresát |
| `subject` | String | Předmět |
| `html` | Text | HTML obsah |
| `orderId` | String? | FK na Order (nullable) |
| `eventId` | String? | FK na Event (nullable) |
| `error` | String? | Chybová zpráva při failed |
| `sentAt` | DateTime? | Čas úspěšného odeslání |
| `createdAt` | DateTime | |

## Typy emailů (EmailType)

| Typ | Kdy se odesílá | Adresát |
|-----|----------------|---------|
| `magic_link` | Při requestu magic linku | Pořadatel (email z formuláře) |
| `order_created_customer` | Po úspěšném vytvoření objednávky | Zákazník (buyerEmail) |
| `order_created_organizer` | Po úspěšném vytvoření objednávky | Pořadatel (notificationEmail) |
| `tickets_issued_customer` | Po vystavení vstupenek | Zákazník (buyerEmail) |

## Statusy (EmailStatus)

```
queued → sending → sent
                 ↘ failed
```

| Status | Popis |
|--------|-------|
| `queued` | Záznam vytvořen v DB, odeslání ještě neproběhlo |
| `sending` | Probíhá volání Resend API |
| `sent` | Resend potvrdil přijetí |
| `failed` | Resend vrátil chybu nebo je `RESEND_API_KEY` chybí v produkci |

## Implementace: Outbox pattern

`lib/email/outbox.ts`

```typescript
// 1. Vždy nejdřív ulož do DB (outbox record)
enqueueEmail(params) → EmailMessage

// 2. Pokus o odeslání
sendEmailMessage(id) → aktualizuje status na sent/failed

// 3. Kombinace (používá se v routes)
enqueueAndTrySend(params) → enqueueEmail + sendEmailMessage v try/catch
```

`enqueueAndTrySend` nikdy nevyhazuje výjimku — chyby jsou logovány do konzole.

## Fallback bez RESEND_API_KEY

`lib/email/provider.ts`:

- **Dev** (`NODE_ENV !== "production"`): zaloguje email do konzole (`[email:dev] to=... subject="..."`), vrátí `{ ok: true }`. Aplikace funguje normálně.
- **Produkce** bez klíče: vrátí `{ ok: false, error: "Resend not configured" }`, EmailMessage dostane status `failed`. **Hlavní flow (objednávka, vstupenky) není ovlivněn.**

## Chyba emailu nesmí rozbít hlavní flow

V každé route je email v **odděleném try/catch bloku**:

```typescript
// Správně — email je izolován
try {
  // DB transakce (objednávka)
} catch { /* order errors */ }

try {
  await enqueueAndTrySend(...)
} catch (err) {
  console.error("[objednavka:email]", err)
}

return NextResponse.json({ orderToken })  // vždy se vrátí
```

Logy emailových chyb:
- `[objednavka:email]` — při chybě odesílání po vytvoření objednávky
- `[request-link:email]` — při chybě odesílání magic linku
- `[issue-tickets:email]` — při chybě odesílání po vystavení vstupenek

## Šablony

`lib/email/templates.ts` — 4 funkce, každá vrací `{ subject, html }`.

Styl: tmavý background (#111827), amber akcent (#f59e0b), tabulkový layout pro detaily. Kompatibilní s většinou emailových klientů (table-based, inline styles).

## Doručitelnost

Aby emaily nedošly do spamu:

1. **Ověřená doména v Resend** — doména odesílatele musí být přidána a ověřena v Resend dashboardu
2. **DNS záznamy**:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: přidej CNAME záznamy z Resend dashboardu
   - DMARC: `v=DMARC1; p=none; rua=mailto:...` (začni s `none`, pak zpřísni)
3. **Testovat na různých klientech**: Gmail, Seznam.cz, Outlook (chování se liší)
4. **`EMAIL_FROM` musí být na ověřené doméně** — `noreply@tyckety.cz` pokud je `tyckety.cz` ověřená

## Co NOT dělat

- Nepřidávat hromadné/marketingové emaily do tohoto systému — to je jiná infrastruktura
- Nepřidávat retry logiku / queue — MVP je synchronní
- Nespoléhat na `sent` status jako potvrzení doručení — Resend potvrzuje přijetí, ne doručení
