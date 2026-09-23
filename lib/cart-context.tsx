"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Config } from "@/lib/types";
import { calculatePrice } from "@/lib/pricing";
import type { SignSize } from "@/lib/useSignSize";
import { clampLightColor, depthMmFor, faceColorOf } from "@/lib/options";

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
  /**
   * The measured size of this sign. The price list bills by the square metre
   * of the whole inscription, and that is measured in the browser from the
   * real font (lib/useSignSize.ts) — so a line in the cart carries it, or it
   * would be re-quoted from an estimate the moment it is edited.
   */
  size: SignSize | null;
  addedAt: number;
  /**
   * The sign currently open in the configurator. It is put in the cart the
   * moment it has any text and kept in step with every parameter that gets
   * clicked, so nothing is ever lost to a closed tab — and because it lives
   * in the cart, it survives a refresh like everything else here.
   *
   * There is at most one. "Pridať do košíka" turns it into an ordinary line.
   */
  draft?: boolean;
};

type Ctx = {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  /** `open: false` adds without pulling the drawer over the configurator. */
  add: (config: Config, options?: { open?: boolean; size?: SignSize | null }) => void;
  /**
   * Keeps the configurator's current sign in the cart as it is configured.
   * Called on every change; creates the draft line, updates it in place, or
   * drops it when the text is emptied.
   */
  syncDraft: (config: Config, size?: SignSize | null) => void;
  checkout: (config: Config, size?: SignSize | null) => void;
  remove: (id: string) => void;
  /** Cart item currently open in the configurator, if any. */
  editingId: string | null;
  /** Send a cart item back into the configurator to be changed. */
  beginEdit: (id: string) => void;
  /** Store the changed sign back under the same cart line. */
  applyEdit: (config: Config, size?: SignSize | null) => void;
  cancelEdit: () => void;
  /**
   * Set by beginEdit for the configurator to pick up and then clear. A plain
   * value rather than a callback registry: the configurator is the only
   * consumer, and an effect there reads it exactly once.
   */
  pendingConfig: { config: Config; scroll: boolean } | null;
  consumePending: () => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

// v2: the catalogue changed to the official price list — build ids, light
// modes and the height unit are all different, so a v1 cart cannot be
// re-quoted and is left behind rather than silently mispriced.
const STORAGE_KEY = "rozsvietto.cart.v2";

const CartContext = createContext<Ctx>({
  items: [], count: 0, total: 0, isOpen: false,
  add: () => {}, syncDraft: () => {}, checkout: () => {}, remove: () => {}, clear: () => {}, open: () => {}, close: () => {},
  editingId: null, beginEdit: () => {}, applyEdit: () => {}, cancelEdit: () => {},
  pendingConfig: null, consumePending: () => {},
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
    faceColorOf(a) === faceColorOf(b) &&
    a.placement === b.placement &&
    a.height === b.height
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingConfig, setPendingConfig] = useState<{ config: Config; scroll: boolean } | null>(null);
  // The last sign the customer explicitly put in the cart. While the
  // configurator still shows exactly that sign there is nothing to draft —
  // the line is already there, and drafting it again would double it.
  const confirmedRef = useRef<Config | null>(null);
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
          restored = parsed
            .filter(
              (i): i is CartItem =>
                !!i && typeof i === "object" && "config" in i && "id" in i,
            )
            // A line saved before a light colour was taken off the list keeps
            // its sign, on the nearest colour still made.
            .map((i) => ({
              ...i,
              config: {
                ...i.config,
                lightColor: clampLightColor(i.config.lightMode, String(i.config.lightColor ?? "")),
              },
            }));
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

    // Pick the half-configured sign back up where it was left. No scrolling:
    // this happens on every page load, and a page that jumps to the
    // configurator by itself would be worse than one that does not.
    const draft = restored.find((i) => i.draft);
    if (draft) setPendingConfig({ config: draft.config, scroll: false });
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

  // ── The sign being configured ────────────────────────────────────────────
  // It is in the cart from its first letter, and every click keeps the same
  // line up to date rather than making a new one.
  const syncDraft = useCallback((config: Config, size: SignSize | null = null) => {
    // While a cart line is open for changes, the configurator is editing THAT
    // line — "Uložiť zmeny" writes it back, and a draft alongside it would be
    // the same sign twice.
    if (editingId) return;

    const dropIt =
      !config.text.trim() ||
      // Already in the cart as a confirmed line: nothing to draft until the
      // customer changes something.
      (confirmedRef.current !== null && sameConfig(confirmedRef.current, config));

    setItems((prev) => {
      const existing = prev.find((i) => i.draft);
      if (dropIt) return existing ? prev.filter((i) => !i.draft) : prev;

      const price = calculatePrice(config, size);
      if (existing) {
        // Nothing changed that the cart shows — leave the array alone so the
        // effect that writes localStorage does not fire on every keystroke.
        if (sameConfig(existing.config, config) && existing.price === price) return prev;
        return prev.map((i) =>
          i.draft ? { ...i, config, size, price } : i,
        );
      }
      return [
        ...prev,
        { id: makeId(), config, size, price, addedAt: Date.now(), draft: true },
      ];
    });
    // editingId changes only when a cart line is opened or closed for
    // changes — rare enough that this keeps its identity across the typing
    // the configurator's effect calls it for.
  }, [editingId, setItems]);

  /** Turns the draft into an ordinary cart line. */
  const confirmDraft = useCallback((config: Config, size: SignSize | null) => {
    confirmedRef.current = config;
    setItems((prev) => {
      const price = calculatePrice(config, size);
      const existing = prev.find((i) => i.draft);
      if (existing) {
        return prev.map((i) => (i.draft ? { ...i, config, size, price, draft: false } : i));
      }
      return [...prev, { id: makeId(), config, size, price, addedAt: Date.now() }];
    });
  }, [setItems]);

  const add = useCallback((config: Config, options?: { open?: boolean; size?: SignSize | null }) => {
    confirmDraft(config, options?.size ?? null);
    if (options?.open !== false) setIsOpen(true);
  }, [confirmDraft]);

  // ── Editing a sign that is already in the cart ──────────────────────────
  // The line stays where it is while it is being changed, so a customer who
  // wanders off mid-edit still has the sign they configured earlier.
  const beginEdit = useCallback((id: string) => {
    setStored((s) => {
      const item = s.items.find((i) => i.id === id);
      if (item) {
        setEditingId(id);
        setPendingConfig({ config: item.config, scroll: true });
        setIsOpen(false);
      }
      return s;
    });
  }, []);

  const consumePending = useCallback(() => setPendingConfig(null), []);

  const applyEdit = useCallback((config: Config, size: SignSize | null = null) => {
    setItems((prev) =>
      prev.map((i) => (i.id === editingId ? { ...i, config, size, price: calculatePrice(config, size) } : i)),
    );
    setEditingId(null);
    setIsOpen(true);
  }, [editingId, setItems]);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  // "Objednať" in the configurator. It opens the cart rather than a checkout
  // of its own, so the sign being configured has to be in the cart first —
  // otherwise the customer would land in an empty drawer. Adding it again when
  // it is already there would just duplicate the line, so an identical sign
  // only opens the cart. (Ordering two identical signs is still possible: use
  // "Pridať do košíka" twice, which never deduplicates.)
  const checkout = useCallback((config: Config, size: SignSize | null = null) => {
    // The sign being configured is already a draft line here, so this just
    // settles it and opens the drawer — no chance of the same sign twice.
    confirmDraft(config, size);
    setIsOpen(true);
  }, [confirmDraft]);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      // Throwing the draft away has to stick: without this, the configurator
      // still shows that sign and would put it straight back.
      if (gone?.draft) confirmedRef.current = gone.config;
      return prev.filter((i) => i.id !== id);
    });
    setEditingId((current) => (current === id ? null : current));
  }, [setItems]);

  const clear = useCallback(() => {
    setItems(() => []);
    setEditingId(null);
    // An emptied cart starts over: the next change in the configurator is a
    // new draft, not a repeat of what was just ordered.
    confirmedRef.current = null;
    // Written now, not left to the effect above: checkout empties the cart
    // and immediately leaves for Stripe or the order page, and the effect
    // would not get to run — the ordered signs would be back on return.
    try {
      localStorage.setItem(STORAGE_KEY, "[]");
    } catch {
      // Storage blocked — nothing was persisted to begin with.
    }
  }, [setItems]);
  const open  = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);

  const value = useMemo<Ctx>(
    () => ({
      items, count: items.length, total, isOpen,
      add, syncDraft, checkout, remove, clear, open, close,
      editingId, beginEdit, applyEdit, cancelEdit, pendingConfig, consumePending,
    }),
    [items, total, isOpen, add, syncDraft, checkout, remove, clear, open, close,
     editingId, beginEdit, applyEdit, cancelEdit, pendingConfig, consumePending],
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
    `${config.height} mm`,
    `hrúbka ${depthMmFor(config.material, config.height)} mm`,
    config.signType === "illuminated" ? "svetelné" : "nesvetelné",
    config.placement === "exterior" ? "exteriér" : "interiér",
  ];
  return parts.join(" · ");
}
