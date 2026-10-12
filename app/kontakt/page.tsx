import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/contact/ContactForm";
import { getT } from "@/lib/i18n/server";
import { rich } from "@/lib/i18n/rich";

export const metadata: Metadata = {
  title: "Kontakt | rozsvieťTO",
  description: "Kontakt na výrobu svetelných nápisov rozsvieťTO — 4from media, s.r.o., Prievidza. Napíšte alebo zavolajte.",
};

// The page the footer's "Kontakt" link goes to — the same shape as
// vytlacto3d's: eyebrow, heading, a line about what to write about, and one
// card with the details. Its Instagram row is left out; rozsvieťTO has no
// account of its own.
export default async function KontaktPage() {
  const { t } = await getT();
  return (
    <main className="px-6 py-16" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="text-sm font-semibold" style={{ color: "var(--color-accent-text)" }}>
          {t("Kontakt")}
        </div>
        <h1
          className="section-heading mt-2 text-4xl tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          {t("Kontaktujte nás")}
        </h1>

        <p className="mt-4 text-base leading-7" style={{ color: "var(--color-muted)" }}>
          {rich(t("Ak máte otázku k svetelnému nápisu, k montáži alebo k objednávke, napíšte alebo zavolajte. Ak si chcete nápis najprv navrhnúť a pozrieť cenu, začnite v {link}."), {
            link: (
              <Link href="/#konfigurator" className="underline underline-offset-2" style={{ color: "var(--color-foreground)" }}>
                {t("konfigurátore")}
              </Link>
            ),
          })}
        </p>

        <div
          className="mt-10 rounded-2xl p-6"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            {t("rozsvieťTO / 4from media, s.r.o.")}
          </div>

          <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--color-foreground-soft)" }}>
            <div>
              {t("E-mail:")}{" "}
              <a className="underline underline-offset-2" href="mailto:info@4frommedia.sk">
                {t("info@4frommedia.sk")}
              </a>
            </div>
            <div>
              {t("Tel:")}{" "}
              <a className="underline underline-offset-2" href="tel:+421907907097">
                +421 907 907 097
              </a>
            </div>
            <div className="pt-3 text-sm" style={{ color: "var(--color-muted)" }}>
              {t("Sídlo: M. Hodžu 393/5, 971 01 Prievidza")}
            </div>
          </div>
        </div>

        <h2 className="mt-12 text-2xl font-extrabold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          {t("Napíšte nám")}
        </h2>
        <ContactForm />
      </div>
    </main>
  );
}
