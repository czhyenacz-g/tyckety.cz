# TESTING.md — Testovací checklisty

Tyckety nemá automatizované testy. Vše se testuje ručně. Níže jsou checklisty pro jednotlivé oblasti.

---

## Local smoke test (před každým commitem)

```bash
npm run dev  # spusť dev server

npx tsc --noEmit        # typecheck — musí projít bez chyb
npx next build          # build — musí projít bez chyb
```

Ověř v prohlížeči (`http://localhost:3000`):
- [ ] Homepage se načte
- [ ] `/prihlaseni` zobrazí formulář
- [ ] Po zadání emailu se zobrazí link button (dev)
- [ ] Kliknutí na link tě přihlásí → redirect na `/app`

---

## Production smoke test (po každém deployi)

- [ ] `https://tyckety.cz` se načte
- [ ] `/prihlaseni` → zadej email → zkontroluj doručení emailu
- [ ] Přihlašovací odkaz funguje → redirect na `/app`
- [ ] `/app/akce` zobrazí seznam akcí
- [ ] Veřejná stránka akce se načte s formulářem a kapacitou

---

## Demo TEST koncert flow (end-to-end)

Toto je hlavní integration test — otestuje celý happy path.

### Příprava
- [ ] Demo akce existuje: `/{demo-podnik-slug}/{event-slug}` je dostupná
- [ ] Amber disclaimer se zobrazuje

### Nákup
- [ ] Vyplň jméno, email, počet vstupenek → "Vytvořit objednávku"
- [ ] Redirect na `/objednavka/{token}`
- [ ] QR kód se zobrazuje (bílý čtverec s QR)
- [ ] Variabilní symbol je 10-místné číslo
- [ ] Odpočet 15 minut tikající
- [ ] Číslo účtu pořadatele správně: `8216903002/5500`

### Potvrzení platby (jako pořadatel)
- [ ] Přihlas se jako pořadatel demo-podnik
- [ ] `/app/akce/{demo-eventId}` — objednávka se zobrazuje v tabulce
- [ ] Klikni "Označit zaplaceno" → tlačítko zmizí, status se změní
- [ ] Zobrazí se "Vystavit vstupenky"
- [ ] Klikni "Vystavit vstupenky"

### Vstupenky
- [ ] Na `/objednavka/{token}` jsou viditelné QR vstupenky
- [ ] Každá vstupenka má QR kód
- [ ] Tisk: klikni "Tisknout vstupenky" → print dialog, nav skrytá

### Scanner
- [ ] Otevři scan URL ze stránky akce v adminu
- [ ] Zadej token vstupenky (nebo naskenuj QR z URL `/vstupenka/{token}`)
- [ ] Odpověď: zelená "Platná vstupenka", jméno zákazníka
- [ ] Klikni "Označit jako použito"
- [ ] Druhý scan stejné vstupenky: červená "Již použitá"

---

## Email deliverability test

Po nasazení nebo změně email konfigurace otestuj na třech klientech:

### Gmail
- [ ] Email dorazí do složky Doručená pošta (ne spam)
- [ ] HTML se zobrazí správně (tmavý background, amber tlačítko)
- [ ] Odkaz v emailu funguje

### Seznam.cz
- [ ] Email dorazí do složky Doručená pošta
- [ ] HTML se zobrazí — Seznam má přísnější filtry
- [ ] Zkontroluj, že SPF/DKIM záznamy jsou správně

### Outlook / Hotmail
- [ ] Email dorazí do složky Doručená pošta
- [ ] Zkontroluj DMARC — Outlook ho vyžaduje pro dobrý deliverability

### Checklist DNS
- [ ] SPF záznam přidán pro `tyckety.cz`
- [ ] DKIM CNAME záznamy přidány (z Resend dashboardu)
- [ ] DMARC záznam přidán
- [ ] Doména ověřena v Resend dashboardu (zelená)

---

## Scanner test

- [ ] `/scan/{validToken}` — stránka se otevře bez přihlášení
- [ ] `/scan/{invalidToken}` — stránka zobrazí chybu nebo 403
- [ ] Zadání neexistujícího ticketTokenu → odpověď `not_found`
- [ ] Zadání tokenu jiné akce → odpověď `wrong_event`
- [ ] Po deaktivaci tokenu: `POST /api/scan/{token}/validate` → 403
- [ ] Race condition: dvě paralelní "Označit jako použito" → jen jedno uspěje (updateMany guard)

---

## Capacity / expiration test

- [ ] Vytvoř 2 objednávky až na hranici kapacity — třetí musí selhat s "Kapacita vyčerpána"
- [ ] Počkej 15+ minut nebo nastav `paymentDisplayDeadlineAt` do minulosti
- [ ] Vytvoř novou objednávku — kapacita se uvolní (lazy expiration spustí)
- [ ] Zkontroluj stats na `/app/akce/{eventId}` — "Zbývá míst" se aktualizuje

---

## Internal admin test

- [ ] `/internal` bez přihlášení → redirect na `/prihlaseni?next=/internal`
- [ ] `/internal` přihlášen jako normální pořadatel → 403 nebo redirect
- [ ] `/internal` přihlášen jako super admin → dashboard viditelný
- [ ] Stats cards zobrazují reálná čísla
- [ ] Tabulka akcí se načte
- [ ] "Detail ↗" odkaz otevře `/internal/events/{eventId}`
- [ ] Změna statusu akce funguje
- [ ] "Deakt. scanner" funguje (scan URL přestane fungovat)

---

## SEO test

```bash
# Lokálně
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```

- [ ] `robots.txt` povoluje crawling pro `/`, `/[slug]`, `/[slug]/[slug]`
- [ ] `robots.txt` zakazuje (nebo neindexuje) `/internal`, `/app`, `/objednavka/*`
- [ ] `sitemap.xml` obsahuje published events
- [ ] Event page má správný `<title>` a `<meta description>`
- [ ] OG image funguje: `https://tyckety.cz/api/og?title=Test`
- [ ] Event page má `og:image` (pokud má posterUrl)

---

## Před každým releasem

```bash
npx tsc --noEmit     # musí projít
npx next build       # musí projít
```

Manual happy path:
1. [ ] Přihlášení magic linkem
2. [ ] Vytvoření akce (draft)
3. [ ] Zveřejnění akce
4. [ ] Zákaznický nákup
5. [ ] Ověření objednávky v adminu
6. [ ] Označení jako zaplaceno
7. [ ] Vystavení vstupenek
8. [ ] Zobrazení QR vstupenek zákazníkem
9. [ ] Scanner validace
