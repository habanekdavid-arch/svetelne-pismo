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
    <header
      className="sticky top-0 z-50 transition-colors duration-400"
      style={{
        background: "var(--color-background)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)",
      }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
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
