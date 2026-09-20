"use client";

import { useState } from "react";

/**
 * Sends the customer (back) to Stripe for an order that is placed but not
 * paid — a closed tab, a declined card, a payment they abandoned. The amount
 * is not passed: app/api/checkout reads it off the stored order.
 */
export default function PayAgainButton({
  groupId,
  label = "Zaplatiť",
}: {
  groupId: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(
        data?.error === "payments_disabled"
          ? "Platba kartou zatiaľ nie je zapnutá. Ozveme sa vám e-mailom."
          : "Platbu sa nepodarilo otvoriť. Skúste to prosím znova.",
      );
    } catch {
      setError("Platbu sa nepodarilo otvoriť. Skúste to prosím znova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={busy}
        className="rounded-full px-8 py-3 text-xs font-black transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        {busy ? "Otváram platbu…" : label}
      </button>
      {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
