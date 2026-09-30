# TODO — API kľúče a nastavenia pre spustenie rozsvieťTO

Web je pripravený: každá služba sa zapne sama, keď doplníte jej kľúče. Kým kľúč chýba, web funguje bez tej služby (nič sa nerozbije, len sa daná možnosť neponúka).

**Kam kľúče zadať:** Vercel → projekt **rozsvietto** → *Settings → Environment Variables*.
Zadajte pre prostredie **Production** (a ak chcete testovať aj na náhľadoch, aj **Preview**).
Po uložení treba spraviť **Redeploy** (Deployments → posledné nasadenie → ⋯ → Redeploy). Premenné `NEXT_PUBLIC_…` sa bez nového buildu neprejavia.

**Kontrola:** po redeploy otvorte `/admin` → rámček **„Stav integrácií“**. Zelená bodka znamená, že služba je zapnutá, oranžová, že jej ešte niečo chýba.

## Čo musíte doplniť vy (všetko ostatné je hotové alebo nastavené v kóde)

| Čo | Kľúč vo Verceli | Odkiaľ |
|---|---|---|
| Heslo e-mailovej schránky | `SMTP_PASSWORD` | heslo k info@4frommedia.sk, rovnaké ako pri vytlacto3d |
| Platba kartou | `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| Potvrdenie platieb | `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks (návod v časti 2) |
| Doména | `NEXT_PUBLIC_SITE_URL` = `https://rozsvietto.sk` | až keď bude doména nasmerovaná na Vercel |
| *Voliteľné:* záložný Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` | ako pri vytlacto3d |
| *Voliteľné:* analytika | `NEXT_PUBLIC_GTM_ID` | Google Tag Manager |

---

## 1. Doména a adresa webu

- [ ] **Doména `rozsvietto.sk` vo Verceli.** Pridajte ju cez Vercel → Settings → Domains a u registrátora nastavte DNS podľa pokynov Vercelu.
- [ ] **`NEXT_PUBLIC_SITE_URL`** = `https://rozsvietto.sk`
  Používa sa v odkazoch v e-mailoch a ako návratová adresa zo Stripe.

## 2. Platba kartou — Stripe

- [ ] Účet na <https://dashboard.stripe.com>: dokončite overenie firmy a pridajte bankový účet na výplaty.
- [ ] **`STRIPE_SECRET_KEY`**
  Nájdete ho v *Developers → API keys → Secret key*. Na testovanie použite `sk_test_…`, naostro `sk_live_…`.
- [ ] Webhook v *Developers → Webhooks → Add endpoint*:
  - URL: `https://rozsvietto.sk/api/stripe/webhook`
  - Udalosti: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
- [ ] **`STRIPE_WEBHOOK_SECRET`**
  Signing secret daného webhooku (`whsec_…`).
- [ ] **Test:** objednávka s platbou kartou (testovacia karta `4242 4242 4242 4242`). Objednávka musí byť v admine „Zaplatené“.

## 3. Bankový prevod — ✅ hotové, rovnaký účet ako vytlacto3d

Nič netreba dopĺňať. Prevody chodia na ten istý účet ako na vytlacto3d:
**4from media, s.r.o., Tatra banka, IBAN SK35 1100 0000 0029 4526 7328, BIC TATRSKBX.**

- Variabilný symbol rozsvieťTO je 10-miestny a začína číslicou 9 (napr. `9000000042`), aby sa na spoločnom účte nikdy nezhodol s objednávkou vytlacto3d (tie majú 8 číslic).
- Iný účet by sa nastavil cez `BANK_IBAN`, `BANK_ACCOUNT_HOLDER` a `BANK_BIC`.
- [ ] **Test:** objednávka s prevodom. Stránka objednávky musí ukázať IBAN, variabilný symbol a sumu. Po príchode peňazí kliknite v admine na **„Platba prijatá“**.

## 4. Doprava — osobný odber a DPD

Packeta sa už nepoužíva a nič pre ňu netreba zadávať. V košíku sú tri možnosti:
- **Osobný odber — Prievidza** (zadarmo): 4from media, s.r.o., M. Hodžu 393/5, 971 01 Prievidza.
- **Osobný odber — Bratislava** (zadarmo): zákazník zadá miesto v Bratislave, čas odovzdania dohodnete telefonicky.
- **Kuriér DPD** (6,15 € s DPH): zásielku podávate v DPD ručne. Nápis, ktorý je na balík DPD príliš veľký, sa ponúkne ako „Preprava na dohodu“.

## 5. E-maily — rovnaké ako na vytlacto3d

Web posiela e-maily presne tak ako vytlacto3d: cez Microsoft 365 (`smtp.office365.com`) zo schránky **info@4frommedia.sk**, so záložným Gmailom. Posielajú sa:
- potvrdenie objednávky,
- oznámenie o novej objednávke pre vás,
- cenová ponuka k objednávke s montážou,
- potvrdenie platby,
- správy z kontaktného formulára,
- obnova hesla.

Adresa schránky, server (`smtp.office365.com`, port `587`) aj meno odosielateľa `rozsvieťTO <info@4frommedia.sk>` sú v kóde nastavené predvolene. Doplniť treba **len heslo**. Vercel má hodnoty pri vytlacto3d označené ako „Sensitive“, takže sa nedajú skopírovať automaticky:

- [ ] **`SMTP_PASSWORD`**
  Heslo schránky info@4frommedia.sk, rovnaké ako pri vytlacto3d (pri Microsoft 365 s dvojfázovým overením heslo aplikácie).
- [ ] **`GMAIL_USER`** a **`GMAIL_APP_PASSWORD`**
  Záložný Gmail, rovnaký ako pri vytlacto3d. Voliteľné, ale odporúčané.
- `SMTP_USER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `EMAIL_FROM`, `ADMIN_ORDER_EMAIL` **nezadávajte**, predvolené hodnoty sú správne. `EMAIL_FROM` z vytlacto3d nekopírujte, obsahuje meno VytlačTo3D.
- [ ] **Test:** kontaktný formulár, objednávka a na stránke *Zabudli ste heslo?* pošlite odkaz na obnovu.

## 6. Analytika (voliteľné)

- [ ] **`NEXT_PUBLIC_GTM_ID`**
  ID kontajnera Google Tag Manager (`GTM-XXXXXXX`). Načíta sa až po súhlase s cookies. Nákupy sa do `dataLayer` posielajú ako GA4 udalosť `purchase`.

## 7. Už nastavené (len skontrolovať)

- [x] `DATABASE_URL` a ostatné `POSTGRES_…` / `PG…` z integrácie Neon.
- [x] `USER_SESSION_SECRET` a `ADMIN_SESSION_SECRET`.
- [x] `ADMIN_EMAILS`

---

### Voliteľné úpravy bez kľúčov

Tieto premenné majú rozumné predvolené hodnoty a meniť ich netreba.

| Premenná | Predvolene | Čo mení |
|---|---|---|
| `NEXT_PUBLIC_DELIVERY_PRICE_DPD` | 6.15 | cena kuriéra DPD (€ s DPH) |
| `NEXT_PUBLIC_DPD_MAX_KG` / `NEXT_PUBLIC_DPD_MAX_CM` | 31.5 / 175 | najväčší balík pre DPD, väčší ide prepravou na dohodu |
