"use client";

import { useState } from "react";
import Link from "next/link";
import { faqCategories } from "@/lib/faq-data";
import ContactForm from "@/components/contact/ContactForm";

// FAQ + contact, built from vytlacto3d's own FAQ section: the amber glow behind
// the heading, accordions that expand on a grid-rows 0fr→1fr transition, the
// amber "?" badge that tilts when its row is open, and the "+" that rotates 45°
// into an ×. Only the content differs.
//
// The questions are read from lib/faq-data.ts rather than written fresh here.
// This section is the whole FAQ now — the separate /faq page is gone — and it
// shows the five a first-time visitor asks; the rest of the answers stay in
// that file, ready if this list should ever grow.

const HOME_QUESTIONS = [
  "Ako prebieha objednávka?",
  "Ako dlho trvá výroba?",
  "Z akých materiálov vyrábate nápisy?",
  "Ktorý materiál je vhodný na vonkajšie použitie?",
  "Aké sú platobné možnosti?",
];

const allItems = faqCategories.flatMap((c) => c.items);
const faqItems = HOME_QUESTIONS.map((q) => allItems.find((i) => i.q === q)).filter(
  (i): i is { q: string; a: string } => !!i,
);

export default function FaqContactSection() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="relative overflow-hidden px-6 py-24"
      style={{ background: "var(--color-background)" }}
    >
      {/* Amber glow behind the heading */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-[#FFAE00]/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
            style={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted)",
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            FAQ a užitočné informácie
          </div>

          <h2
            className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Často kladené otázky
          </h2>

          <p
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Odpovede na najčastejšie otázky o materiáloch, svietení, cenách,
            priebehu objednávky a doručení.
          </p>
        </div>

        {/* Accordions */}
        <div className="mt-12 space-y-4">
          {faqItems.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={`faq-card group rounded-3xl shadow-sm transition-all duration-300 ${isOpen ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 ${
                        isOpen ? "rotate-6 scale-110" : "group-hover:scale-110"
                      }`}
                      style={
                        isOpen
                          ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                          : {
                              background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                              color: "var(--color-accent-text)",
                            }
                      }
                      aria-hidden="true"
                    >
                      ?
                    </div>
                    <h3
                      className="text-base font-extrabold sm:text-lg"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {item.q}
                    </h3>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-light transition-all duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    style={{
                      background: "var(--color-background)",
                      border: `1px solid ${isOpen ? "var(--accent)" : "var(--color-border)"}`,
                      color: isOpen ? "var(--color-foreground)" : "var(--color-muted)",
                    }}
                    aria-hidden="true"
                  >
                    +
                  </div>
                </button>

                {/* grid-rows 0fr → 1fr: animates to the answer's natural height
                    without measuring it in JS */}
                <div
                  className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className="px-6 pb-6 text-sm leading-7 sm:px-20"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact card */}
        <div className="faq-contact-card group/card relative mt-12 overflow-hidden rounded-3xl p-8 shadow-sm transition-all duration-300 sm:p-10">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-[#FFAE00]/10 blur-3xl transition-opacity duration-300 group-hover/card:opacity-70" />
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <div
              className="mx-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm"
              style={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                color: "var(--color-muted)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              Napíšte nám
            </div>
            <h3
              className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Nenašli ste odpoveď?
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              Napíšte nám priamo cez formulár nižšie, odpovieme vám čo najskôr.
            </p>
          </div>

          <ContactForm />
        </div>

        {/* Shortcut — "Všetky otázky" pointed at the /faq page and went with it */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/#konfigurator"
            className="rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            Prejsť na konfigurátor
          </Link>
        </div>
      </div>
    </section>
  );
}
