import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        {/* Brand */}
        <Link
          href="/"
          className="font-black tracking-tight"
          style={{ fontFamily: "var(--font-anton), sans-serif", fontSize: "1.1rem" }}
        >
          rozsvieť<span style={{ color: "var(--accent)" }}>TO</span>
        </Link>

        {/* Nav */}
        <nav
          className="hidden items-center gap-8 text-[11px] font-black uppercase tracking-widest text-neutral-500 md:flex"
          aria-label="Hlavná navigácia"
        >
          <a href="#konfigurator" className="transition hover:text-black">
            3D písmo
          </a>
          <a href="#materialy" className="transition hover:text-black">
            Materiály
          </a>
          <a href="#ceny" className="transition hover:text-black">
            Ceny
          </a>
          <a href="#faq" className="transition hover:text-black">
            FAQ
          </a>
          <a href="#blog" className="transition hover:text-black">
            Blog
          </a>
        </nav>

        {/* CTA */}
        <a
          href="#konfigurator"
          className="rounded-full border border-black px-5 py-2 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white"
        >
          Prihlásiť sa
        </a>
      </div>
    </header>
  );
}
