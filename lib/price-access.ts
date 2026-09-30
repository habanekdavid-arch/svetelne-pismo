"use client";

import { useEffect, useState } from "react";
import { onSessionChange } from "@/lib/session-client";

// Prices are shown only to a signed-in customer whose e-mail is confirmed.
// Everyone else sees a blurred placeholder and the next step: sign in, or
// confirm the e-mail. Used by the configurator's price card and the cart.
//
//   null         — still asking /api/auth/me
//   "anon"       — not signed in
//   "unverified" — signed in, e-mail not confirmed yet
//   "ok"         — prices may be shown
export type PriceAccess = "anon" | "unverified" | "ok" | null;

export function usePriceAccess(): PriceAccess {
  const [access, setAccess] = useState<PriceAccess>(null);
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setAccess(!d?.user ? "anon" : d.user.verified === false ? "unverified" : "ok");
        })
        .catch(() => { if (!cancelled) setAccess("anon"); });
    check();
    const off = onSessionChange(check);
    // The e-mail is confirmed in another tab (the link) — look again when the
    // customer comes back to this one.
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      off();
      window.removeEventListener("focus", check);
    };
  }, []);
  return access;
}

/** Stands in for a price that may not be shown yet — not the real amount, so it cannot be read out of the page. */
export const PRICE_PLACEHOLDER = "888,88 €";
