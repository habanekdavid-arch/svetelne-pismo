"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Config } from "@/lib/types";
import { calculatePrice } from "@/lib/pricing";

// Cart of configured signs. Each entry is one complete Config — the same shape
// the configurator publishes and /api/orders already accepts — plus the price
// as shown when it was added.
//
// The price stored here is only ever used for display. The server recomputes
// every item's price from its Config on checkout (app/api/orders/route.ts), so
// a tampered localStorage cannot change what a customer is charged.

export type CartItem = {
  id: string;
  config: Config;
  price: number;
  addedAt: number;
};

type Ctx = {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  add: (config: Config) => void;
  checkout: (config: Config) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const STORAGE_KEY = "rozsvietto.cart.v1";

const CartContext = createContext<Ctx>({
  items: [], count: 0, total: 0, isOpen: false,
  add: () => {}, checkout: () => {}, remove: () => {}, clear: () => {}, open: () => {}, close: () => {},
});

function makeId(): string {
  // crypto.randomUUID is unavailable on http:// origins in some browsers.
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Two configurations describe the same sign when every ordered property
// matches. `rotation` is excluded on purpose: it only turns the sign in the 3D
// preview and is not something the workshop makes differently.
function sameConfig(a: Config, b: Config): boolean {
  return (
    a.text === b.text &&
    a.font === b.font &&
    a.material === b.material &&
    a.signType === b.signType &&
    a.lightMode === b.lightMode &&
    a.lightColor === b.lightColor &&
    a.bodyColor === b.bodyColor &&
    a.height === b.height &&
    a.thickness === b.thickness
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Start empty on both server and first client render so the markup matches,
  // then adopt the stored cart. Items and the hydrated flag are one piece of
  // state so restoring the cart is a single update, not two cascading ones.
  const [stored, setStored] = useState<{ items: CartItem[]; hydrated: boolean }>({
    items: [],
    hydrated: false,
  });
  const { items, hydrated } = stored;
  const setItems = useCallback(
    (update: (prev: CartItem[]) => CartItem[]) =>
      setStored((s) => ({ ...s, items: update(s.items) })),
    [],
  );

  useEffect(() => {
    let restored: CartItem[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          restored = parsed.filter(
            (i): i is CartItem =>
              !!i && typeof i === "object" && "config" in i && "id" in i,
          );
        }
      }
    } catch {
      // Corrupt or unavailable storage (private mode, quota, bad JSON) —
      // start with an empty cart rather than breaking the whole page.
    }
    // localStorage does not exist during SSR, so the stored cart can only be
    // adopted after mount. Reading it in a state initialiser would make the
    // first client render disagree with the server HTML and trip a hydration
    // error. This is one call, once, and it settles immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored({ items: restored, hydrated: true });
  }, []);

  useEffect(() => {
    if (!hydrated) return; // don't overwrite stored items with the empty initial state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked — the cart still works for this page view.
    }
  }, [items, hydrated]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const add = useCallback((config: Config) => {
    setItems((prev) => [
      ...prev,
      { id: makeId(), config, price: calculatePrice(config), addedAt: Date.now() },
    ]);
    setIsOpen(true);
  }, [setItems]);

  // "Objednať" in the configurator. It opens the cart rather than a checkout
  // of its own, so the sign being configured has to be in the cart first —
  // otherwise the customer would land in an empty drawer. Adding it again when
  // it is already there would just duplicate the line, so an identical sign
  // only opens the cart. (Ordering two identical signs is still possible: use
  // "Pridať do košíka" twice, which never deduplicates.)
  const checkout = useCallback((config: Config) => {
    setItems((prev) =>
      prev.some((i) => sameConfig(i.config, config))
        ? prev
        : [...prev, { id: makeId(), config, price: calculatePrice(config), addedAt: Date.now() }],
    );
    setIsOpen(true);
  }, [setItems]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, [setItems]);

  const clear = useCallback(() => setItems(() => []), [setItems]);
  const open  = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);

  const value = useMemo<Ctx>(
    () => ({ items, count: items.length, total, isOpen, add, checkout, remove, clear, open, close }),
    [items, total, isOpen, add, checkout, remove, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

// One-line spec of a configured sign, shared by the cart drawer, the order
// modal and the order history so they never drift apart.
export function describeConfig(config: Config): string {
  const parts = [
    `${config.height} cm`,
    `${config.thickness} mm`,
    config.signType === "illuminated" ? "svetelné" : "nesvetelné",
  ];
  return parts.join(" · ");
}
