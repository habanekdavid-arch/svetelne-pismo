import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/layout/ScrollReveal";
import CookieConsent from "@/components/layout/CookieConsent";
import TagManager from "@/components/layout/TagManager";
import { CartProvider } from "@/lib/cart-context";
import CartSidebar from "@/components/cart/CartSidebar";
import FourFromFloatingButton from "@/components/layout/FourFromFloatingButton";
import VerifyEmailNotice from "@/components/auth/VerifyEmailNotice";
import AccountDetailsReminder from "@/components/account/AccountDetailsReminder";
import { Suspense } from "react";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      {/* Body chrome mirrors vytlacto3d's <body>: a min-height flex column with
          the content area flexing, so short pages push the footer to the
          bottom of the viewport instead of leaving it mid-screen. */}
      <body
        className={`${centuryGothic.variable} flex min-h-screen flex-col antialiased`}
      >
        {/* CartProvider wraps Header too — the header's cart badge and the
            drawer both read the same state. */}
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
        <CookieConsent />
        <TagManager />
      </body>
    </html>
  );
}