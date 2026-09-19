import Link from "next/link";
import Image from "next/image";
import CookieSettingsButton from "@/components/layout/CookieSettingsButton";

// Footer built to the shape of vytlacto3d's: three columns — brand, contact,
// the workshop behind it — a gradient hairline instead of a drawn border, a
// bottom row with the copyright and the legal links, and the maker's credit
// on its own strip at the very end.
//
// Its Instagram link is deliberately not carried over: rozsvieťTO has no
// account of its own, and pointing customers at the sister brand's feed from
// here would be a dead end.

const LEGAL_LINKS = [
  { label: "GDPR", href: "/gdpr" },
  { label: "Obchodné podmienky", href: "/obchodne-podmienky" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

export default function Footer() {
  return (
    <footer className="mt-20 shadow-v3d-footer" style={{ background: "var(--color-background)" }}>

      {/* Main grid */}
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">

        {/* Brand */}
        <div>
          <Link href="/" className="inline-block">
            <Image
              src="/logo.svg"
              alt="rozsvieťTO"
              width={237}
              height={64}
              unoptimized
              className="h-8 w-auto"
            />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6" style={{ color: "var(--color-muted)" }}>
            Online konfigurátor a výroba svetelných nápisov. Napíšte text,
            nastavte materiál a rozmery, a cenu uvidíte hneď.
          </p>
        </div>

        {/* Contact */}
        <div>
          <FooterHeading>Kontakt</FooterHeading>
          <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--color-muted)" }}>
            <div>
              Email:{" "}
              <a href="mailto:info@4frommedia.sk" className="transition hover:underline hover:opacity-80">
                info@4frommedia.sk
              </a>
            </div>
            <div>
              Tel:{" "}
              <a href="tel:+421907907097" className="transition hover:underline hover:opacity-80">
                +421 907 907 097
              </a>
            </div>
          </div>
        </div>

        {/* Workshop */}
        <div>
          <FooterHeading>Výroba</FooterHeading>
          <address className="mt-4 space-y-1 text-sm not-italic" style={{ color: "var(--color-muted)" }}>
            <div>4from media, s.r.o.</div>
            <div>M. Hodžu 393/5</div>
            <div>971 01 Prievidza</div>
            <div>Email: info@4frommedia.sk</div>
          </address>
        </div>
      </div>

      {/* Hairline — a gradient that fades out at both ends, not a full-width rule */}
      <div
        className="mx-auto h-px max-w-6xl"
        style={{
          background:
            "linear-gradient(to right, transparent, var(--color-border), transparent)",
        }}
      />

      {/* Bottom row */}
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm md:flex-row md:items-center md:justify-between"
        style={{ color: "var(--color-muted)" }}
      >
        <div>
          © {new Date().getFullYear()} rozsvieťTO • Projekt spoločnosti{" "}
          <a
            href="https://www.4frommedia.sk"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition hover:opacity-80"
            style={{ color: "var(--color-foreground-soft)" }}
          >
            4from media, s.r.o.
          </a>
        </div>

        <nav aria-label="Právne dokumenty" className="flex flex-wrap gap-x-6 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:opacity-70">
              {link.label}
            </Link>
          ))}
          <CookieSettingsButton />
        </nav>
      </div>

      {/* Maker's credit */}
      <div className="border-t py-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <div className="mx-auto flex max-w-6xl justify-center px-6">
          <a
            href="https://dnabs.online/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs transition hover:opacity-80"
            style={{ color: "var(--color-muted-light)" }}
          >
            <span>Created by</span>
            <Image src="/dnabs-logo.svg" alt="" width={14} height={14} unoptimized className="h-3.5 w-3.5" />
            <span className="font-semibold">DNABS</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
      {children}
    </div>
  );
}
