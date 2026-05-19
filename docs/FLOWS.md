# FLOWS.md — Hlavní flows Tyckety.cz

## 1. Přihlášení pořadatele (Magic Link)

1. Pořadatel přejde na `/prihlaseni`
2. Zadá email a odešle formulář
3. `POST /api/auth/request-link`
   - Pokud organizer neexistuje → vytvoří se automaticky (slug z emailu + random suffix)
   - Předchozí nepoužité tokeny jsou invalidovány
   - Vytvoří se `MagicLinkToken` (platnost 15 minut)
   - Odešle se email s odkazem přes Resend (v dev: zobrazí se link button v UI)
4. **Produkce**: UI zobrazí "Zkontrolujte e-mail"
   **Dev**: UI zobrazí tlačítko s odkazem
5. Kliknutí na odkaz → `GET /api/auth/verify?token=...&next=...`
   - Token ověřen → vytvoří se `Session` (platnost 30 dní)
   - Cookie `session` nastavena (httpOnly, secure)
   - Redirect na `?next=` nebo `/app`

## 2. Vytvoření akce

1. Pořadatel přejde na `/app/akce/nova`
2. Vyplní: název, datum, místo, cena vstupenky, kapacita, (volitelně) popis, URL plakátu, číslo účtu
3. `POST /api/akce`
   - Vytvoří se `Event` (status: `draft`)
   - Vytvoří se `TicketCategory` (jedna, základní)
   - Vytvoří se `ScanAccessToken` (pro vstupní kontrolu)
4. Redirect na `/app/akce/{eventId}`

## 3. Zveřejnění akce

1. Na `/app/akce/{eventId}` klikne pořadatel "Zveřejnit akci"
2. `PATCH /api/akce/{eventId}/status` body: `{ status: "published" }`
3. Akce je viditelná na `/{organizerSlug}/{eventSlug}`

## 4. Zákaznický nákup

1. Zákazník přijde na `/{organizerSlug}/{eventSlug}`
2. Vidí info o akci (plakát, datum, místo, cena, zbývající místa)
3. Vyplní: jméno, email, počet vstupenek (max 10 nebo kapacita)
4. Klikne "Vytvořit objednávku"

## 5. Vytvoření objednávky

`POST /api/objednavka`:

1. Lazy expiration: `expireStaleOrders(eventId)` — uvolní kapacitu po prošlých rezervacích
2. Serializable transakce:
   - Načte kategorii, zkontroluje kapacitu (`capacity - soldCount - activeReservations`)
   - Vygeneruje variabilní symbol (10 číslic, max 3 pokusy při konfliktu)
   - Vytvoří `Order` (status: `awaiting_payment`, deadline +15 min)
3. Po transakci (v odděleném try/catch): pošle emaily zákazníkovi + pořadateli
4. Redirect zákazníka na `/objednavka/{publicToken}`

## 6. QR platba

Na `/objednavka/{orderToken}`:
1. Zákazník vidí QR kód (SPD formát pro mobilní bankovnictví)
2. QR obsahuje: IBAN pořadatele, částku v Kč, variabilní symbol, zprávu
3. Zákazník naskenuje QR svou bankovní aplikací a odešle platbu
4. Odpočet 15 minut; po vypršení stránka zobrazí "Platební lhůta vypršela"
5. Zákazník může zadat platbu i ručně (číslo účtu + VS zobrazeny textově)

## 7. Ruční potvrzení platby

1. Pořadatel přijde na `/app/akce/{eventId}` — vidí tabulku objednávek
2. Najde objednávku podle jména nebo VS (shodný s platbou na výpisu)
3. Klikne "Označit zaplaceno" → `PATCH /api/objednavka/{id}/paid`
   - Ochrana: objednávka musí patřit pořadateli (session check + event organizerId)
   - Idempotentní: 409 pokud již zaplaceno

## 8. Vystavení vstupenek

1. V tabulce objednávek se u `paid` objednávky zobrazí "Vystavit vstupenky"
2. Kliknutí → `PATCH /api/objednavka/{id}/issue-tickets`
   - Transakce: znovu čte stav (guard against double-click)
   - Vytvoří `Ticket` záznamy (každý s UUID tokenem)
   - Inkrementuje `soldCount` na `TicketCategory`
   - Nastaví objednávku na `tickets_issued`
3. Po transakci (v odděleném try/catch): pošle email zákazníkovi s potvrzením
4. Zákazníkova stránka `/objednavka/{token}` nyní zobrazuje QR vstupenky

## 9. Tisk vstupenek

1. Zákazník na `/objednavka/{token}` vidí vstupenky s QR kódy
2. Klikne "Tisknout vstupenky" → `window.print()`
3. CSS třídy `no-print` skryjí navigaci, odpočet, platební instrukce
4. Každá vstupenka má vlastní QR s URL `https://tyckety.cz/vstupenka/{ticketToken}`

## 10. Scanner validace u vstupu

1. Obsluha vstupu otevře URL `/scan/{scanToken}` (odkaz z detailu akce v adminu)
2. **Validate** (ověření bez označení): zadá nebo naskenuje token vstupenky
   - `POST /api/scan/{scanToken}/validate`
   - Odpovědi: `valid`, `already_used`, `wrong_event`, `cancelled`, `not_found`
3. Pokud valid → klikne "Označit jako použito"
   - `POST /api/scan/{scanToken}/use`
   - `updateMany` s podmínkou `status === "issued"` — race condition safe
4. Scan token je tajný UUID; deaktivuje se přes `/internal` nebo `/app`

## 11. Expirace rezervace

- Rezervace expirují lazy (on-demand), ne cron jobem
- `expireStaleOrders(eventId)` je voláno:
  - Před každou novou objednávkou (`POST /api/objednavka`)
  - Při načtení admin stránky akce (`/app/akce/{eventId}`)
- Kapacita se uvolní při dalším requestu, ne okamžitě po vypršení
- Na stránce objednávky: pokud `now > paymentDisplayDeadlineAt`, zobrazí se "Lhůta vypršela" (bez DB dotazu)

## 12. Demo TEST koncert

- Organizer slug: `demo-podnik`
- Akce dostupná na: `/{organizerSlug}/{eventSlug}` (slug viz seed)
- Slouží pro testování a jako demo pro potenciální zákazníky
- Na stránce akce i objednávky se zobrazí amber banner: "TEST je demo akce. Nevzniká nárok na vstup..."
- Platba 299 Kč je symbolická podpora vývoje
- Seed je idempotentní — lze spustit opakovaně bez duplikátů

## 13. Co se stane při chybě emailu

Email je vždy v odděleném try/catch bloku, **nikdy** neovlivní hlavní flow:

- **Objednávka**: email selže → objednávka je stále vytvořena, zákazník dostane `orderToken` a může zaplatit. Email status v DB: `failed`.
- **Magic link**: email selže → přihlášení je stále úspěšné (token vznikl). V dev prostředí se link stejně zobrazí v UI.
- **Vystavení vstupenek**: email selže → vstupenky jsou vystaveny, status `tickets_issued` je nastaven. Email status: `failed`.
- Chyby emailu jsou logovány: `[objednavka:email]`, `[request-link:email]`, `[issue-tickets:email]`
- Správce vidí email status ve sloupci "E-mail" v tabulce objednávek na `/internal/events/{eventId}`
