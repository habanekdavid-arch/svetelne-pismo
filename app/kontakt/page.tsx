import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kontakt | rozsvieťTO",
  description:
    "Kontakt na výrobu svetelných nápisov rozsvieťTO — 4from media, s.r.o., Prievidza. Napíšte alebo zavolajte.",
};

// The page the footer's "Kontakt" link goes to — the same shape as
// vytlacto3d's: eyebrow, heading, a line about what to write about, and one
// card with the details. Its Instagram row is left out; rozsvieťTO has no
// account of its own.
export default function KontaktPage() {
  return (
    <main className="px-6 py-16" style={{ background: "var(--color-background)" }}>
      <div className="mx-auto max-w-3xl">
        <div className="text-sm font-semibold" style={{ color: "var(--color-accent-text)" }}>
          Kontakt
        </div>
        <h1
          className="section-heading mt-2 text-4xl tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          Kontaktujte nás
        </h1>

        <p className="mt-4 text-base leading-7" style={{ color: "var(--color-muted)" }}>
          Ak máte otázku k svetelnému nápisu, k montáži alebo k objednávke,
          napíšte alebo zavolajte. Ak si chcete nápis najprv navrhnúť a pozrieť
          cenu, začnite v{" "}
          <Link href="/#konfigurator" className="underline underline-offset-2" style={{ color: "var(--color-foreground)" }}>
            konfigurátore
          </Link>
          .
        </p>

        <div
          className="mt-10 rounded-2xl p-6"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <div className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            rozsvieťTO / 4from media, s.r.o.
          </div>

          <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--color-foreground-soft)" }}>
            <div>
              Email:{" "}
              <a className="underline underline-offset-2" href="mailto:info@4frommedia.sk">
                info@4frommedia.sk
              </a>
            </div>
            <div>
              Tel:{" "}
              <a className="underline underline-offset-2" href="tel:+421907907097">
                +421 907 907 097
              </a>
            </div>
            <div className="pt-3 text-sm" style={{ color: "var(--color-muted)" }}>
              Sídlo: M. Hodžu 393/5, 971 01 Prievidza
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
