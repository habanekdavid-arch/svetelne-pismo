import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/layout/ScrollReveal";
import CookieConsent from "@/components/layout/CookieConsent";

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
        <Header />
        {/* A plain div, not <main>: every page already renders its own <main>,
            and nesting them is invalid HTML. */}
        <div className="flex-1">{children}</div>
        <Footer />
        <ScrollReveal />
        <CookieConsent />
      </body>
    </html>
  );
}