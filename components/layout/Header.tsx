"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

const cgBlack: React.CSSProperties = {
  fontFamily: "var(--font-century-gothic)",
  fontWeight: 900,
};

const cgRegular: React.CSSProperties = {
  fontFamily: "var(--font-century-gothic)",
  fontWeight: 400,
};

export default function Header() {
  const [open, setOpen] = useState(false);

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
        {/* Brand */}
        <Link
          href="/"
          className="whitespace-nowrap text-[20px] transition-opacity hover:opacity-70"
          style={{ ...cgBlack, color: "var(--color-foreground)" }}
        >
          ROZSVIEŤTO
        </Link>

        {/* Nav — desktop only */}
        <nav
          className="hidden items-center gap-8 text-[14px] md:flex"
          style={cgRegular}
          aria-label="Hlavná navigácia"
        >
          <Link href="/#materialy" className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            MATERIÁLY
          </Link>
          <Link href="/#konfigurator" className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            CENY
          </Link>
          <Link href="/faq" className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            FAQ
          </Link>
          <Link href="/blog" className="nav-link whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            BLOG
          </Link>
          <a
            href="https://www.4frommedia.sk"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link whitespace-nowrap"
            style={{ color: "var(--color-muted)" }}
          >
            4FROM MEDIA
          </a>
          <Show when="signed-in">
            <Link
              href="/moje-objednavky"
              className="nav-link whitespace-nowrap"
              style={{ color: "var(--color-foreground)" }}
            >
              MOJE OBJEDNÁVKY
            </Link>
          </Show>
        </nav>

        {/* Account — desktop only */}
        <div className="hidden items-center md:flex">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="whitespace-nowrap rounded-full px-6 py-2.5 text-[13px] transition hover:opacity-85"
                style={{ ...cgBlack, background: "var(--accent)", color: "#000" }}
              >
                PRIHLÁSIŤ SA
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div
              className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
              style={{ background: "var(--color-surface)" }}
            >
              <UserButton />
              <span className="text-[12px] font-black uppercase tracking-wide" style={{ color: "var(--color-foreground)" }}>
                Môj účet
              </span>
            </div>
          </Show>
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
      </div>

      {/* Mobile menu panel */}
      <div
        id="mobile-nav"
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out md:hidden"
        style={{
          maxHeight: open ? "420px" : "0px",
          opacity: open ? 1 : 0,
          borderTop: open ? "1px solid var(--color-border)" : "none",
        }}
      >
        <nav
          className="flex flex-col gap-1 px-5 py-4"
          style={cgRegular}
          aria-label="Mobilná navigácia"
        >
          <Link
            href="/#materialy"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
            style={{ color: "var(--color-foreground)" }}
          >
            MATERIÁLY
          </Link>
          <Link
            href="/#konfigurator"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
            style={{ color: "var(--color-foreground)" }}
          >
            CENY
          </Link>
          <Link
            href="/faq"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
            style={{ color: "var(--color-foreground)" }}
          >
            FAQ
          </Link>
          <Link
            href="/blog"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
            style={{ color: "var(--color-foreground)" }}
          >
            BLOG
          </Link>
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
          <Show when="signed-in">
            <Link
              href="/moje-objednavky"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] transition hover:opacity-70"
              style={{ color: "var(--color-foreground)" }}
            >
              MOJE OBJEDNÁVKY
            </Link>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 whitespace-nowrap rounded-full px-6 py-3 text-center text-[14px]"
                style={{ ...cgBlack, background: "var(--accent)", color: "#000" }}
              >
                PRIHLÁSIŤ SA
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="mt-2 flex items-center gap-3 px-3">
              <UserButton />
              <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                Váš účet
              </span>
            </div>
          </Show>
        </nav>
      </div>
    </header>
  );
}
