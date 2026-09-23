"use client";

import { useState } from "react";
import { oneLine } from "@/lib/sign-text";
import Link from "next/link";
import { useCart, describeConfig } from "@/lib/cart-context";
import { MATERIALS, fontOptions, faceColorOf } from "@/lib/options";
import { formatEur, netFromGross, vatFromGross, VAT_RATE } from "@/lib/vat";
import OrderModal from "@/components/configurator/OrderModal";

// Cart drawer, built to the shape of vytlacto3d's: a dimmed backdrop, a panel
// pinned to the right edge at most 440px wide, a slim header with the cart
// glyph, and then one scrollable column — first the list of items as a card of
// numbered rows, then the checkout panel with the price breakdown, the terms
// tick and the order button.
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
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // calculatePrice() is the VAT-inclusive figure the customer sees in the
  // configurator (see lib/vat.ts), so the base and the VAT are derived from it.
  const net = netFromGross(total);
  const vat = vatFromGross(total);

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
                            {formatEur(item.price)}
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
            </div>

            {/* Checkout */}
            {items.length > 0 ? (
              <div className="space-y-5">

                {/* Price summary */}
                <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--color-surface)" }}>
                  <div className="flex justify-between" style={{ color: "var(--color-muted)" }}>
                    <span>Výroba ({items.length} {items.length === 1 ? "nápis" : items.length < 5 ? "nápisy" : "nápisov"})</span>
                    <span className="font-semibold">{formatEur(net)}</span>
                  </div>
                  <div className="mt-1 flex justify-between" style={{ color: "var(--color-muted)" }}>
                    <span>DPH {Math.round(VAT_RATE * 100)} %</span>
                    <span className="font-semibold">{formatEur(vat)}</span>
                  </div>
                  <div
                    className="mt-2 flex justify-between border-t pt-2 text-base font-extrabold"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                  >
                    <span>Celkom s DPH</span>
                    <span>{formatEur(total)}</span>
                  </div>
                  <p className="mt-2 text-[11px]" style={{ color: "var(--color-muted)" }}>
                    Doprava Packetou 3,99 € alebo kuriérom 5,99 € — vyberiete v ďalšom kroku. Ak chcete nápis aj namontovať, zvoľte tam konzultáciu k montáži.
                  </p>
                </div>

                {/* Terms + order */}
                <div className="space-y-3">
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors"
                    style={{
                      border: `2px solid ${termsAccepted ? "var(--accent)" : "var(--color-border)"}`,
                      background: termsAccepted ? "color-mix(in srgb, var(--accent) 5%, transparent)" : "var(--color-background)",
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors"
                      style={{
                        border: `2px solid ${termsAccepted ? "var(--accent)" : "var(--color-border)"}`,
                        background: termsAccepted ? "var(--accent)" : "var(--color-background)",
                      }}
                      aria-hidden="true"
                    >
                      {termsAccepted && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-xs leading-5" style={{ color: "var(--color-foreground-soft)" }}>
                      Súhlasím s{" "}
                      <a
                        href="/obchodne-podmienky"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold underline"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        obchodnými podmienkami
                      </a>
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!termsAccepted}
                    onClick={() => setCheckoutOpen(true)}
                    className="btn-press w-full rounded-2xl px-5 py-3.5 text-sm font-extrabold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                  >
                    Objednať {items.length === 1 ? "nápis" : `${items.length} nápisy`}
                  </button>
                </div>
              </div>
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

      {checkoutOpen && (
        <OrderModal cartItems={items} termsAccepted={termsAccepted} onClose={() => setCheckoutOpen(false)} />
      )}
    </>
  );
}
