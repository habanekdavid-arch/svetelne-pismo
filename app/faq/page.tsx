"use client";

import { useState } from "react";
import Link from "next/link";
import { faqCategories } from "@/lib/faq-data";

const iconMap: Record<string, React.ReactNode> = {
  cart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  layers: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  truck: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  card: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  wrench: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
};

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-xl transition-colors"
      style={{
        border: "1px solid var(--color-border)",
        background: open ? "var(--color-surface)" : "transparent",
      }}
    >
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span
          className="pr-4 text-[14px] font-black leading-snug"
          style={{ color: "var(--color-foreground)" }}
        >
          {q}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform"
          style={{
            background: open ? "var(--color-yellow)" : "var(--color-surface-raised)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            color: open ? "#000" : "var(--color-muted)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="px-6 pb-6 text-[13px] leading-6"
          style={{ color: "var(--color-muted)" }}
        >
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [activeCategory, setActiveCategory] = useState(faqCategories[0].id);
  const current = faqCategories.find((c) => c.id === activeCategory)!;

  return (
    <main style={{ background: "var(--color-background)" }}>
      {/* Hero */}
      <section className="pb-12 pt-20">
        <div className="mx-auto max-w-7xl px-5 text-center">
          <p
            className="reveal mb-4 text-[10px] font-black tracking-[0.35em]"
            style={{ color: "var(--color-muted)" }}
          >
            Časté otázky
          </p>
          <h1
            className="reveal delay-1 main-heading text-4xl md:text-6xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Máte otázky?
            <br />
            Máme odpovede.
          </h1>
          <p
            className="reveal delay-2 mx-auto mt-5 max-w-md text-sm leading-6"
            style={{ color: "var(--color-muted)" }}
          >
            Zozbierali sme najčastejšie otázky od našich zákazníkov.
            Ak ste nenašli odpoveď, napíšte nám.
          </p>
        </div>
      </section>

      {/* Category tabs + accordion */}
      <section className="py-12 pb-24">
        <div className="mx-auto max-w-4xl px-5">
          {/* Category nav */}
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {faqCategories.map((cat) => {
              const active = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[12px] font-black tracking-wide transition-all"
                  style={
                    active
                      ? {
                          background: "var(--color-yellow)",
                          color: "#000",
                        }
                      : {
                          background: "var(--color-surface)",
                          color: "var(--color-muted)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  <span style={{ color: active ? "#000" : "var(--color-yellow)" }}>
                    {iconMap[cat.icon]}
                  </span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Active category heading */}
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--color-yellow)", color: "#000" }}
            >
              {iconMap[current.icon]}
            </div>
            <h2
              className="main-heading text-xl"
              style={{ color: "var(--color-foreground)" }}
            >
              {current.label}
            </h2>
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {current.items.map((item) => (
              <AccordionItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section
        className="py-16"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto max-w-xl px-5 text-center">
          {/* Yellow icon */}
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-yellow)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2
            className="main-heading text-2xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Nenašli ste odpoveď?
          </h2>
          <p
            className="mt-3 text-sm leading-6"
            style={{ color: "var(--color-muted)" }}
          >
            Napíšte nám priamo na e-mail alebo zavolajte — radi pomôžeme.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:info@4frommedia.sk"
              className="inline-block rounded-full px-8 py-3 text-sm font-black tracking-wide transition hover:opacity-85"
              style={{ background: "var(--color-yellow)", color: "#000" }}
            >
              Napísať e-mail
            </a>
            <a
              href="tel:+421907907097"
              className="inline-block rounded-full px-8 py-3 text-sm font-black tracking-wide transition"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              }}
            >
              +421 907 907 097
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
