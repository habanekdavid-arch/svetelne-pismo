"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

// Header cart control. Shape copied from vytlacto3d's Navbar: a square
// rounded button that picks up an amber border on hover, with the item count
// in an amber bubble clipped to its top-right corner. Like there, it only
// appears once the cart has something in it.

export default function CartButton() {
  const { count, open } = useCart();

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Otvoriť košík (${count})`}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition hover:shadow-md"
      style={{
        background: "var(--color-background)",
        border: "1px solid var(--color-border)",
        color: "var(--color-foreground-soft)",
      }}
    >
      <ShoppingCart size={18} strokeWidth={2} />
      <span
        className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold"
        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
      >
        {count}
      </span>
    </button>
  );
}
