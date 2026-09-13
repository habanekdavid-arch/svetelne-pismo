"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { onSessionChange } from "@/lib/session-client";

const cgRegular: React.CSSProperties = {
  fontFamily: "var(--font-century-gothic)",
  fontWeight: 400,
};

// The exact glyph vytlacto3d's AccountButton draws — a head and shoulders,
// not lucide's User, whose proportions differ.
function UserGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

type SessionUser = { name: string };

// All the interactive parts of the header (mobile menu toggle, account
// state, logout). Fetches its own session from /api/auth/me instead of
// Header.tsx reading the cookie server-side — that would force every page
// using Header (i.e. the whole site, via app/layout.tsx) to opt out of
// static rendering.
export default function HeaderNav() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    function fetchUser() {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setUser(data.user); })
        .catch(() => {});
    }
    fetchUser();
    const unsubscribe = onSessionChange(fetchUser);
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOpen(false);
    router.replace("/");
    router.refresh();
  }

  const links = [
    { href: "/#materialy", label: "Materiály" },
    { href: "/#konfigurator", label: "Ceny" },
    { href: "/faq", label: "FAQ" },
    { href: "/blog", label: "Blog" },
  ];

  return (
    <>
      {/* Nav — desktop only */}
      {/* Centered in the viewport, not wedged between the logo and the account
          button — vytlacto3d's Navbar does exactly this. The offset parent is
          the sticky <header>, so left-1/2 is the middle of the page. */}
      <nav
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[14px] md:flex"
        style={cgRegular}
        aria-label="Hlavná navigácia"
      >
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            {l.label}
          </Link>
        ))}
        <a
          href="https://www.4frommedia.sk"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link whitespace-nowrap"
          style={{ color: "var(--color-muted)" }}
        >
          4from media
        </a>
        {user && (
          <Link href="/moje-objednavky" className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            Moje objednávky
          </Link>
        )}
      </nav>

      {/* Account — desktop only.
          Both states copied from vytlacto3d's AccountButton: a white pill with
          a hairline border and a round 32px chip on the left. Signed out, the
          chip is a tinted amber circle holding the user glyph; signed in, it
          is solid amber with the account's initial. Colours go through tokens
          so the pill follows dark mode. */}
      <div className="hidden items-center gap-2 md:flex">
        {user ? (
          <>
            <Link
              href="/moje-objednavky"
              className="account-pill inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {(user.name?.trim()?.charAt(0) || "U").toUpperCase()}
              </span>
              <span className="hidden sm:inline">Môj účet</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm transition hover:opacity-70 disabled:opacity-50"
              style={{ color: "var(--color-muted)" }}
            >
              {loggingOut ? "Odhlasujem…" : "Odhlásiť sa"}
            </button>
          </>
        ) : (
          <Link
            href="/prihlasenie"
            className="account-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                color: "var(--accent)",
              }}
            >
              <UserGlyph />
            </span>
            <span className="hidden sm:inline">Prihlásiť sa</span>
          </Link>
        )}
      </div>

      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70 md:hidden"
        style={{ color: "var(--color-foreground)" }}
        aria-label={open ? "Zavrieť menu" : "Otvoriť menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu panel */}
      <div
        id="mobile-nav"
        className="absolute inset-x-0 top-full overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden"
        style={{
          maxHeight: open ? "440px" : "0px",
          opacity: open ? 1 : 0,
          borderTop: open ? "1px solid var(--color-border)" : "none",
          background: "var(--color-background)",
        }}
      >
        <nav className="flex flex-col gap-1 px-5 py-4" style={cgRegular} aria-label="Mobilná navigácia">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
              style={{ color: "var(--color-foreground)" }}
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://www.4frommedia.sk"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
            style={{ color: "var(--color-muted)" }}
          >
            4from media
          </a>

          {user && (
            <Link
              href="/moje-objednavky"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
              style={{ color: "var(--color-foreground)" }}
            >
              Moje objednávky
            </Link>
          )}

          {user ? (
            <div className="mt-2 flex items-center justify-between px-3">
              <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                {user.name || "Môj účet"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full px-4 py-2 text-[11px] font-black transition hover:opacity-70 disabled:opacity-50"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
              >
                Odhlásiť
              </button>
            </div>
          ) : (
            <Link
              href="/prihlasenie"
              onClick={() => setOpen(false)}
              className="account-pill mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                  color: "var(--accent)",
                }}
              >
                <UserGlyph />
              </span>
              Prihlásiť sa
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
