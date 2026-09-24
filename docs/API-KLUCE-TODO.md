# TODO — API kľúče a nastavenia pre spustenie rozsvieťTO

Web je pripravený: každá služba sa zapne sama, keď doplníte jej kľúče. Kým kľúč chýba, web funguje bez tej služby (nič sa nerozbije, len sa daná možnosť neponúka).

**Kam kľúče zadať:** Vercel → projekt **rozsvietto** → *Settings → Environment Variables*.
Zadajte pre prostredie **Production** (a ak chcete testovať aj na náhľadoch, aj **Preview**).
Po uložení treba spraviť **Redeploy** (Deployments → posledné nasadenie → ⋯ → Redeploy). Premenné `NEXT_PUBLIC_…` sa bez nového buildu neprejavia.

**Kontrola:** po redeploy otvorte `/admin` → rámček **„Stav integrácií“**. Zelená bodka znamená, že služba je zapnutá, oranžová, že jej ešte niečo chýba.

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

## 4. Packeta (Zásielkovňa)

Všetko nájdete v klientskej sekcii <https://client.packeta.com>.

- [ ] **`NEXT_PUBLIC_PACKETA_API_KEY`**
  API kľúč, 16 znakov (*Nastavenia klienta*). Zapne mapu výdajných miest v košíku.
- [ ] **`PACKETA_API_PASSWORD`**
  API heslo, 32 znakov, na tom istom mieste. **Tajné.** Po zaplatení s ním web sám vytvorí zásielku.
- [ ] **`PACKETA_SENDER_LABEL`**
  Označenie odosielateľa z *Odosielatelia* (<https://client.packeta.com/senders/>). Predvolené je `rozsvietTO`.
- [ ] **`PACKETA_HOME_CARRIER_ID`**
  ID dopravcu pre doručenie kuriérom na adresu na Slovensku (zo zoznamu dopravcov Packety). Bez neho zásielky ku kuriérovi zadávate ručne.
- [ ] Porovnajte limity balíka so zmluvou. Predvolené sú 10 kg / 70 cm na výdajné miesto a 30 kg / 120 cm pre kuriéra. Ak máte iné, nastavte `NEXT_PUBLIC_PACKETA_PICKUP_MAX_KG`, `NEXT_PUBLIC_PACKETA_PICKUP_MAX_CM`, `NEXT_PUBLIC_PACKETA_HOME_MAX_KG` a `NEXT_PUBLIC_PACKETA_HOME_MAX_CM`.
- [ ] **Test:** zaplatená objednávka na výdajné miesto. V admine sa musí objaviť číslo zásielky a zákazníkovi príde e-mail s odkazom na sledovanie.

## 5. E-maily — rovnaké ako na vytlacto3d

Web posiela e-maily presne tak ako vytlacto3d: cez Microsoft 365 (`smtp.office365.com`) zo schránky **info@4frommedia.sk**, so záložným Gmailom. Posielajú sa:
- potvrdenie objednávky,
- oznámenie o novej objednávke pre vás,
- cenová ponuka k objednávke s montážou,
- potvrdenie platby,
- číslo zásielky,
- správy z kontaktného formulára,
- obnova hesla.

Názvy premenných sú rovnaké ako vo Verceli pri projekte **vytlacto3d-5mxw**. Vercel ich tam má ako „Sensitive“, takže sa nedajú prečítať ani automaticky skopírovať. Hodnoty zadajte znovu, rovnaké ako pri vytlacto3d:

- [ ] **`SMTP_USER`**
  Prihlasovací e-mail schránky.
- [ ] **`SMTP_PASSWORD`**
  Heslo schránky (pri Microsoft 365 heslo aplikácie).
- [ ] **`SMTP_HOST`** a **`SMTP_PORT`**
  Len ak sa pri vytlacto3d líšia od `smtp.office365.com` a `587`. Tieto hodnoty sa použijú aj bez vyplnenia.
- [ ] **`GMAIL_USER`** a **`GMAIL_APP_PASSWORD`**
  Záložný Gmail, rovnaký ako pri vytlacto3d. Voliteľné, ale odporúčané.
- [ ] **`ADMIN_ORDER_EMAIL`**
  Len ak majú objednávky chodiť inam než na `info@4frommedia.sk`.
- **`EMAIL_FROM` nekopírujte.** Pri vytlacto3d je v ňom meno VytlačTo3D. rozsvieťTO odosiela z tej istej adresy pod menom `rozsvieťTO <info@4frommedia.sk>`.
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
| `NEXT_PUBLIC_DELIVERY_PRICE_PICKUP` | 4.92 | cena Packety na výdajné miesto (€ s DPH) |
| `NEXT_PUBLIC_DELIVERY_PRICE_HOME` | 6.15 | cena kuriéra (€ s DPH) |
