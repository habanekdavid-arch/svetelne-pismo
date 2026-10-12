"use client";

import { useSyncExternalStore } from "react";
import { getConsent, setConsent, subscribeConsent, type ConsentStatus } from "@/lib/consent";
import { useT } from "@/lib/i18n/client";
import { tk } from "@/lib/i18n/config";

const STATUS_LABEL: Record<ConsentStatus, string> = {
  accepted: tk("Analytické cookies povolené"),
  rejected: tk("Analytické cookies odmietnuté"),
};

// The interactive half of /cookies — lets a visitor change their choice
// after the fact, without waiting for the banner to reappear. Same
// lib/consent.ts state (and useSyncExternalStore approach) as
// components/layout/CookieConsent.tsx.
export default function CookieSettingsControls() {
  const t = useT();
  const status = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p
        className="text-[11px] font-black tracking-wide"
        style={{ color: "var(--color-muted)" }}
      >
        {t("Aktuálne nastavenie")}
      </p>
      <p className="mt-1.5 text-sm font-black" style={{ color: "var(--color-foreground)" }}>
        {status ? t(STATUS_LABEL[status]) : t("Zatiaľ ste sa nerozhodli")}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setConsent("rejected")}
          className="rounded-full px-5 py-2.5 text-[11px] font-black tracking-wide transition hover:opacity-80"
          style={{ color: "var(--color-foreground)", border: "1px solid var(--color-border)" }}
        >
          {t("Odmietnuť analytické cookies")}
        </button>
        <button
          type="button"
          onClick={() => setConsent("accepted")}
          className="rounded-full px-5 py-2.5 text-[11px] font-black tracking-wide transition hover:opacity-85"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {t("Povoliť analytické cookies")}
        </button>
      </div>
    </div>
  );
}
