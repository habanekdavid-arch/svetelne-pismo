This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Platby (Stripe) a doprava (Packeta)

Obchod funguje aj bez oboch: objednávka sa uloží a dohodne sa e-mailom. Keď
doplníte kľúče, checkout automaticky prepne na platbu kartou a na výber
výdajného miesta. Všetky premenné sú v `.env.example`.

### Ako to ide za sebou

1. Zákazník dá nápisy do košíka a otvorí objednávku.
2. `POST /api/quote` — **server** si nápisy premeria z rovnakého fontu
   (`lib/sign-metrics.server.ts`, opentype.js) a spočíta cenu. Z prehliadača sa
   neberie žiadne číslo, ktoré by mohlo ovplyvniť sumu.
3. Podľa odhadnutej hmotnosti a rozmeru balíka (`lib/shipping.ts`) server
   povolí len tie spôsoby dopravy, ktoré zásielku naozaj unesú — dvojmetrový
   alurol nápis Packetu vôbec neponúkne.
4. `POST /api/orders` — vznikne `order_groups` (jedna objednávka) a k nej
   `orders` (jeden riadok na nápis). Cena sa ráta znova, tu, na serveri.
5. `POST /api/checkout` — Stripe Checkout Session zo **sumy uloženej v
   objednávke**, nie z requestu. Zákazník odchádza na Stripe.
6. `POST /api/stripe/webhook` — až podpísaný webhook označí objednávku ako
   zaplatenú. Návrat do prehliadača nič neoznačuje.
7. Hneď po zaplatení sa pri doprave Packetou vytvorí zásielka
   (`lib/packeta.ts`, REST/XML `https://www.zasilkovna.cz/api/rest`) a číslo sa
   uloží k objednávke. Ak to zlyhá, dôvod je vidieť v admine a zásielka sa dá
   vytvoriť ručne — objednávka zostáva zaplatená.

### Stripe

1. `STRIPE_SECRET_KEY` z <https://dashboard.stripe.com/apikeys>.
2. Webhook na `https://<doména>/api/stripe/webhook` s udalosťami
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `charge.refunded`; jeho `whsec_…` ide do `STRIPE_WEBHOOK_SECRET`.
3. Lokálne: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. `NEXT_PUBLIC_SITE_URL` nastavte na produkčnú doménu.

### Packeta

1. `NEXT_PUBLIC_PACKETA_API_KEY` — 16-znakový kľúč pre widget (je verejný,
   ide do prehliadača).
2. `PACKETA_API_PASSWORD` — 32-znakové API heslo (**tajné**, vytvára zásielky).
3. `PACKETA_SENDER_LABEL` — odosielateľ z <https://client.packeta.com/senders/>.
4. `PACKETA_HOME_CARRIER_ID` — id dopravcu pre doručenie na adresu; je
   špecifické pre účet a krajinu. Bez neho sa ponúka len výdajné miesto.

### Ceny a limity dopravy

`NEXT_PUBLIC_DELIVERY_PRICE_PICKUP` / `_HOME` sú ceny s DPH, ktoré vidí
zákazník. `NEXT_PUBLIC_PACKETA_*_MAX_KG` / `_MAX_CM` hovoria, čo Packeta
unesie — predvolené hodnoty sú zámerne opatrné (10 kg / 70 cm na výdajné
miesto, 30 kg / 120 cm kuriérom) a treba ich porovnať s vašou zmluvou.
Hmotnosť balíka sa odhaduje z plochy písmen, hrúbky a materiálu
(`lib/shipping.ts`).
