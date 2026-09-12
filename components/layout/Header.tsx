import Link from "next/link";
import HeaderNav from "@/components/layout/HeaderNav";

const cgBlack: React.CSSProperties = {
  fontFamily: "var(--font-century-gothic)",
  fontWeight: 900,
};

// Plain Server Component — no cookies()/session read here on purpose, so
// pages that render it (i.e. every page, via app/layout.tsx) can stay
// statically rendered. HeaderNav (client) fetches /api/auth/me itself.
export default function Header() {
  return (
    // Chrome taken from vytlacto3d's Navbar: translucent background with a
    // backdrop blur and one very soft shadow, and no bottom border. The border
    // drew a hard line across the page; the blur is what makes content read as
    // sliding *under* the header the way it does on the sister site.
    <header
      className="sticky top-0 z-50 shadow-v3d-nav backdrop-blur transition-colors duration-400"
      style={{ background: "color-mix(in srgb, var(--color-background) 90%, transparent)" }}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="whitespace-nowrap text-[20px] transition-opacity hover:opacity-70"
          style={{ ...cgBlack, color: "var(--color-foreground)" }}
        >
          ROZSVIEŤTO
        </Link>

        <HeaderNav />
      </div>
    </header>
  );
}
