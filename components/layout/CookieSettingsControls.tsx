"use client";

import { useSyncExternalStore } from "react";
import { getConsent, setConsent, subscribeConsent, type ConsentStatus } from "@/lib/consent";

const STATUS_LABEL: Record<ConsentStatus, string> = {
  accepted: "Analytické cookies povolené",
  rejected: "Analytické cookies odmietnuté",
};

// The interactive half of /cookies — lets a visitor change their choice
// after the fact, without waiting for the banner to reappear. Same
// lib/consent.ts state (and useSyncExternalStore approach) as
// components/layout/CookieConsent.tsx.
export default function CookieSettingsControls() {
  const status = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p
        className="text-[11px] font-black uppercase tracking-widest"
        style={{ color: "var(--color-muted)" }}
      >
        Aktuálne nastavenie
      </p>
      <p className="mt-1.5 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
        {status ? STATUS_LABEL[status] : "Zatiaľ ste sa nerozhodli"}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConsent("rejected")}
          className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-80"
          style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
        >
          Odmietnuť analytické cookies
        </button>
        <button
          type="button"
          onClick={() => setConsent("accepted")}
          className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-85"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Povoliť analytické cookies
        </button>
      </div>
    </div>
  );
}
