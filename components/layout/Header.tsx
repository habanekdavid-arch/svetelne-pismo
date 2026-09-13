import Link from "next/link";
import Image from "next/image";
import HeaderNav from "@/components/layout/HeaderNav";
import CartButton from "@/components/cart/CartButton";

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
        {/* The wordmark, replacing the text version that stood in for it.
            unoptimized: an SVG is already tiny and vector — running it through
            the image optimiser gains nothing and needs dangerouslyAllowSVG. */}
        <Link href="/" aria-label="rozsvieťTO — domov" className="transition-opacity hover:opacity-70">
          <Image
            src="/logo.svg"
            alt="rozsvieťTO"
            width={237}
            height={64}
            priority
            unoptimized
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          <CartButton />
          <HeaderNav />
        </div>
      </div>
    </header>
  );
}
