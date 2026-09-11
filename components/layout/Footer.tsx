import Link from "next/link";

const links = [
  { label: "GDPR", href: "/gdpr" },
  { label: "Obchodné podmienky", href: "/obchodne-podmienky" },
  { label: "Cookies", href: "/cookies" },
  { label: "Kontakt", href: "mailto:info@4frommedia.sk" },
] as const;

export default function Footer() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 md:gap-6">

        {/* Brand */}
        <div>
          <Link
            href="/"
            className="mb-3 inline-block text-sm font-black tracking-tight"
            style={{ fontFamily: "var(--font-anton), sans-serif" }}
          >
            rozsvieť<span style={{ color: "var(--color-primary)" }}>TO</span>
          </Link>
          <p
            className="max-w-55 text-[13px] leading-5"
            style={{ color: "var(--color-muted)" }}
          >
            Konfigurátor svetelného písma a 3D nápisov na mieru. Navrhnite,
            pozrite si náhľad, objednajte.
          </p>
        </div>

        {/* Contact */}
        <div>
          <FooterLabel>Kontakt</FooterLabel>
          <ul className="space-y-1">
            <li>
              <a
                href="mailto:info@4frommedia.sk"
                className="text-[13px] transition hover:opacity-70"
                style={{ color: "var(--color-foreground)" }}
              >
                info@4frommedia.sk
              </a>
            </li>
            <li>
              <a
                href="tel:+421907907097"
                className="text-[13px] transition hover:opacity-70"
                style={{ color: "var(--color-foreground)" }}
              >
                +421 907 907 097
              </a>
            </li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <FooterLabel>Výroba</FooterLabel>
          <address
            className="not-italic"
            style={{ color: "var(--color-muted)" }}
          >
            <p className="text-[13px] font-black" style={{ color: "var(--color-foreground)" }}>
              4from media, s.r.o.
            </p>
            <p className="mt-0.5 text-[13px] leading-5">
              M. Hodžu 393/5
              <br />
              971 01 Prievidza
            </p>
          </address>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-5 py-5 sm:flex-row sm:items-center">
          <p
            className="text-[11px]"
            style={{ color: "var(--color-muted)" }}
          >
            © {new Date().getFullYear()} rozsvieťTO — Projekt spoločnosti 4from media, s.r.o.
          </p>

          <nav aria-label="Právne dokumenty">
            <ul className="flex items-center gap-4">
              {links.map((link, i) => (
                <li key={link.href + i} className="flex items-center gap-4">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="text-[11px]"
                      style={{ color: "var(--color-border-strong)" }}
                    >
                      ·
                    </span>
                  )}
                  <a
                    href={link.href}
                    className="text-[11px] font-black uppercase tracking-widest transition hover:opacity-70"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2.5 text-[11px] font-black uppercase tracking-widest"
      style={{ color: "var(--color-foreground)" }}
    >
      {children}
    </p>
  );
}
