import type { Metadata } from "next";
import localFont from "next/font/local";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ScrollReveal from "@/components/layout/ScrollReveal";

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

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
      <body
        className={`${centuryGothic.variable} ${anton.variable} ${inter.variable}`}
      >
        <Header />
        {children}
        <Footer />
        <ScrollReveal />
      </body>
    </html>
  );
}