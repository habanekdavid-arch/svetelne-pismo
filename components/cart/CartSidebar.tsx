"use client";

import { useState } from "react";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { useCart, describeConfig } from "@/lib/cart-context";
import { MATERIALS, fontOptions } from "@/lib/options";
import OrderModal from "@/components/configurator/OrderModal";

// Slide-over cart, modelled on vytlacto3d's CartSidebar: a dimmed backdrop, a
// panel on the right, one row per item, and the running total pinned to the
// bottom above the checkout button.

export default function CartSidebar() {
  const { items, total, isOpen, close, remove } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col shadow-v3d-modal transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "var(--color-background)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2
            className="flex items-center gap-2 text-lg font-extrabold"
            style={{ color: "var(--color-foreground)" }}
          >
            <ShoppingCart size={18} strokeWidth={2.25} />
            Košík
            {items.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {items.length}
              </span>
            )}
          </h2>
          <button
            onClick={close}
            aria-label="Zavrieť košík"
            className="rounded-full p-2 transition hover:opacity-70"
            style={{ color: "var(--color-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingCart size={32} style={{ color: "var(--color-muted-light)" }} />
              <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                Košík je zatiaľ prázdny.
                <br />
                Nastav si nápis a pridaj ho sem.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const mat = MATERIALS.find((m) => m.id === item.config.material);
                const font = fontOptions.find((f) => f.id === item.config.font);
                return (
                  <li key={item.id} className="field-card rounded-field p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="truncate text-base font-extrabold"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {item.config.text}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                          {[font?.name, mat?.displayName].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                          {describeConfig(item.config)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className="text-base font-black"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {item.price} €
                        </span>
                        <button
                          onClick={() => remove(item.id)}
                          aria-label={`Odobrať ${item.config.text} z košíka`}
                          className="rounded-lg p-1.5 transition hover:opacity-70"
                          style={{ color: "var(--color-muted)" }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Colour swatch — the one spec a line of text can't carry */}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          background: item.config.bodyColor,
                          boxShadow: "0 0 0 1px var(--color-border)",
                        }}
                        aria-hidden="true"
                      />
                      {item.config.signType === "illuminated" && (
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{
                            background: item.config.lightColor,
                            boxShadow: "0 0 0 1px var(--color-border)",
                          }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {item.config.signType === "illuminated"
                          ? "telo a svetlo"
                          : "farba materiálu"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer — total + checkout */}
        {items.length > 0 && (
          <div
            className="px-5 py-4"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                Orientačná cena spolu
              </span>
              <span
                className="text-2xl font-black"
                style={{ color: "var(--color-foreground)" }}
              >
                {total} €
              </span>
            </div>

            <button
              onClick={() => setCheckoutOpen(true)}
              className="btn-press w-full rounded-2xl px-6 py-4 text-sm font-black"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Objednať {items.length === 1 ? "nápis" : `${items.length} nápisy`}
            </button>

            <p className="mt-2 text-center text-[11px]" style={{ color: "var(--color-muted)" }}>
              Záväznú cenu dostanete po overení parametrov.
            </p>
          </div>
        )}
      </aside>

      {checkoutOpen && (
        <OrderModal cartItems={items} onClose={() => setCheckoutOpen(false)} />
      )}
    </>
  );
}
