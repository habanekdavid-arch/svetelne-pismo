"use client";

import { useEffect, useState } from "react";
import { oneLine } from "@/lib/sign-text";
import Link from "next/link";
import { useCart, describeConfig } from "@/lib/cart-context";
import { MATERIALS, fontOptions, faceColorOf } from "@/lib/options";
import { formatEur } from "@/lib/vat";
import CheckoutPanel, { type PlacedNotice } from "@/components/cart/CheckoutPanel";

// Cart drawer, built to the shape of vytlacto3d's: a dimmed backdrop, a panel
// pinned to the right edge at most 440px wide, a slim header with the cart
// glyph, and then one scrollable column — first the list of items as a card of
// numbered rows, then the whole checkout (components/cart/CheckoutPanel.tsx):
// delivery, contact, payment, the price breakdown, the terms tick and the
// order button.
//
// Icons are inline SVG with the source's stroke weights rather than lucide, so
// the drawer is drawn with the same hand as the sister site.

function CartGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function CartSidebar() {
  const { items, total, isOpen, close, remove, beginEdit, editingId } = useCart();
  // "Thank you" for an order that stayed on this page — kept until the drawer
  // is closed, since the cart it came from is already empty.
  const [placed, setPlaced] = useState<PlacedNotice | null>(null);
  // The server's prices, once the checkout has them: the cart's own are a
  // preview measured in this browser and can differ by a euro in rounding,
  // and the drawer must not show two totals for one basket.
  const [quoted, setQuoted] = useState<number[] | null>(null);
  const linePrice = (idx: number, fallback: number) =>
    quoted && quoted.length === items.length ? quoted[idx] : fallback;
  const shownTotal = quoted && quoted.length === items.length
    ? quoted.reduce((a, b) => a + b, 0)
    : total;
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => setPlaced(null), 300); // after the slide-out
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Košík"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col shadow-v3d-modal transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-background)" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2" style={{ color: "var(--color-foreground)" }}>
            <CartGlyph />
            <span className="text-base font-extrabold">Košík</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Zavrieť košík"
            className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ color: "var(--color-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">

            {/* Items */}
            <div
              className="overflow-hidden rounded-3xl shadow-sm"
              style={{ background: "var(--color-background)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <div className="text-sm font-extrabold" style={{ color: "var(--color-foreground)" }}>
                  Nápisy
                  <span
                    className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    {items.length}
                  </span>
                </div>
                <Link
                  href="/#konfigurator"
                  onClick={close}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                  style={{ background: "var(--color-surface)", color: "var(--color-foreground-soft)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
                       strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <line x1="5" y1="1" x2="5" y2="9" />
                    <line x1="1" y1="5" x2="9" y2="5" />
                  </svg>
                  Pridať nápis
                </Link>
              </div>

              {items.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
                  Zatiaľ žiadne nápisy.
                  <br />
                  Nastavte si nápis v konfigurátore.
                </div>
              ) : (
                <ul>
                  {items.map((item, idx) => {
                    const mat  = MATERIALS.find((m) => m.id === item.config.material);
                    const font = fontOptions.find((f) => f.id === item.config.font);
                    return (
                      <li
                        key={item.id}
                        className="px-4 py-3"
                        style={{ borderTop: idx === 0 ? "none" : "1px solid var(--color-border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                          >
                            {idx + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-semibold" style={{ color: "var(--color-foreground)" }}>
                              {oneLine(item.config.text) || "Váš text"}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                              {[font?.name, mat?.displayName].filter(Boolean).join(" · ")} · {describeConfig(item.config)}
                            </div>
                            {editingId === item.id ? (
                              <div className="text-[11px] font-bold" style={{ color: "var(--color-accent-text)" }}>
                                Práve upravujete v konfigurátore
                              </div>
                            ) : item.draft ? (
                              /* Uložilo sa sem samo, ako sa nápis skladal —
                                 nech je jasné, ktorý riadok je ten otvorený
                                 v konfigurátore a prečo sa mení sám. */
                              <div className="text-[11px] font-bold" style={{ color: "var(--color-accent-text)" }}>
                                Rozpracované v konfigurátore
                              </div>
                            ) : null}
                            {/* The one part of the spec a line of text can't
                                carry: the body colour, and the LED colour when
                                the sign is illuminated. */}
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className="h-3 w-3 rounded-full"
                                // čelo vnútri, hrana ako okraj — tak ako vyzerá písmeno
                                style={{ background: faceColorOf(item.config), boxShadow: `inset 0 0 0 2px ${item.config.bodyColor}, 0 0 0 1px var(--color-border)` }}
                                aria-hidden="true"
                              />
                              {item.config.signType === "illuminated" && (
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ background: item.config.lightColor, boxShadow: "0 0 0 1px var(--color-border)" }}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right text-xs font-bold" style={{ color: "var(--color-foreground)" }}>
                            {formatEur(linePrice(idx, item.price))}
                          </div>

                          <button
                            type="button"
                            onClick={() => beginEdit(item.id)}
                            title="Upraviť"
                            aria-label={`Upraviť ${item.config.text || "nápis"}`}
                            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:opacity-70"
                            style={{ color: editingId === item.id ? "var(--accent)" : "var(--color-muted)" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            title="Odstrániť"
                            aria-label={`Odobrať ${item.config.text || "nápis"} z košíka`}
                            className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-500"
                            style={{ color: "var(--color-muted)" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {items.length > 0 && (
                <div className="flex items-center justify-between px-5 py-4 text-sm" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <span style={{ color: "var(--color-muted)" }}>Výroba celkom (s DPH)</span>
                  <span className="font-extrabold" style={{ color: "var(--color-foreground)" }}>{formatEur(shownTotal)}</span>
                </div>
              )}
            </div>

            {/* Checkout — everything from delivery to the order button,
                right here in the drawer, the way vytlacto3d has it. */}
            {placed ? (
              <div
                className="rounded-3xl px-5 py-8 text-center"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-base font-extrabold" style={{ color: "var(--color-foreground)" }}>
                  {placed.title}
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-muted)" }}>{placed.text}</p>
                <Link
                  href="/ucet/objednavky"
                  onClick={close}
                  className="mt-5 inline-block rounded-2xl px-5 py-3 text-xs font-extrabold"
                  style={{ background: "var(--color-foreground)", color: "var(--color-background)" }}
                >
                  Moje objednávky
                </Link>
              </div>
            ) : items.length > 0 ? (
              <CheckoutPanel items={items} isOpen={isOpen} onPlaced={setPlaced} onQuoted={setQuoted} />
            ) : (
              <div
                className="rounded-2xl px-5 py-8 text-center text-sm"
                style={{ border: "2px dashed var(--color-border)", color: "var(--color-muted)" }}
              >
                Pridajte nápis v konfigurátore a objaví sa tu.
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
