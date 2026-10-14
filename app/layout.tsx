import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/layout/ScrollReveal";
import Script from "next/script";
import { CONSENT_DEFAULT_SCRIPT, COOKIE_SCRIPT_SRC, GOOGLE_ADS_ID, GTM_ID, GTM_SCRIPT } from "@/lib/cookie-script";
import { CartProvider } from "@/lib/cart-context";
import CartSidebar from "@/components/cart/CartSidebar";
import FourFromFloatingButton from "@/components/layout/FourFromFloatingButton";
import VerifyEmailNotice from "@/components/auth/VerifyEmailNotice";
import AccountDetailsReminder from "@/components/account/AccountDetailsReminder";
import { Suspense } from "react";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { dictionaryFor } from "@/lib/i18n/messages";

const centuryGothic = localFont({
  src: [
    {
      path: "../public/fonts/CenturyGothicPaneuropeanRegular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/CenturyGothicPaneuropeanSemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/CenturyGothicPaneuropeanBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/CenturyGothicPaneuropeanBlack.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-century-gothic",
});



export const metadata: Metadata = {
  // Shared links and social previews resolve against the live domain.
  metadataBase: new URL(SITE_URL),
  title: "rozsvieťTO | Konfigurátor svetelného písma",
  description: "Navrhnite si vlastné svetelné písmo a 3D písmo na mieru. Živý náhľad aj cena.",
  // Google Search Console — proves the site is ours (meta tag method).
  verification: { google: "hZXx031MDVjId5fbByhAM1EkZmquyg9FxEAhInTCpXM" },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The visitor's language (lib/i18n): its dictionary goes to the client
  // components through LocaleProvider, Server Components read it with getT().
  const locale = await getLocale();
  return (
    <html lang={locale}>
      {/* Body chrome mirrors vytlacto3d's <body>: a min-height flex column with
          the content area flexing, so short pages push the footer to the
          bottom of the viewport instead of leaving it mid-screen. */}
      <body
        className={`${centuryGothic.variable} flex min-h-screen flex-col antialiased`}
      >
        {/* Google Tag Manager (noscript) — right after <body>, as Google asks. */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* CartProvider wraps Header too — the header's cart badge and the
            drawer both read the same state. */}
        <LocaleProvider locale={locale} dict={dictionaryFor(locale)}>
        <CartProvider>
          <Header />
          {/* "Overte svoj e-mail" for a new account, and how clicking the link
              went. Suspense: it reads the query string. */}
          <Suspense fallback={null}>
            <div className="px-5">
              <VerifyEmailNotice />
            </div>
          </Suspense>
          {/* A plain div, not <main>: every page already renders its own
              <main>, and nesting them is invalid HTML. */}
          <div className="flex-1">{children}</div>
          <Footer />
          <CartSidebar />
          <FourFromFloatingButton />
          {/* "Doplňte si detaily účtu" — a quiet card in the corner. */}
          <AccountDetailsReminder />
        </CartProvider>
        <ScrollReveal />
        </LocaleProvider>
        {/* Cookies and Google tags (lib/cookie-script.ts). Order matters:
            Consent Mode defaults first (everything denied), then the
            CookieScript banner that updates them, then Google Tag Manager
            and the Google Ads tag, which both obey that consent.
            beforeInteractive scripts run in this order, before hydration. */}
        <Script id="consent-default" strategy="beforeInteractive">
          {CONSENT_DEFAULT_SCRIPT}
        </Script>
        <Script id="cookie-script" src={COOKIE_SCRIPT_SRC} charSet="UTF-8" strategy="beforeInteractive" />
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {GTM_SCRIPT}
        </Script>
        <Script
          id="google-tag"
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}