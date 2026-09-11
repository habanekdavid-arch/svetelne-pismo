"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getConsent, setConsent, subscribeConsent } from "@/lib/consent";

// Bottom banner shown until the visitor accepts or rejects analytics
// cookies. Reads/writes the same lib/consent.ts state the /cookies settings
// page uses, so a choice made there also dismisses this banner elsewhere.
// useSyncExternalStore (not useState+useEffect) because localStorage is an
// external store: the server always renders "no decision yet" (getServerSnapshot),
// and the real value is read once the client subscribes — no manual effect,
// no hydration flash.
export default function CookieConsent() {
  const consentStatus = useSyncExternalStore(subscribeConsent, getConsent, () => null);

  if (consentStatus !== null) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6"
      role="region"
      aria-label="Súhlas s cookies"
    >
      <div
        className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl p-5 shadow-2xl sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p className="text-[13px] leading-5" style={{ color: "var(--color-muted)" }}>
          Používame cookies na meranie návštevnosti a zlepšovanie
          konfigurátora.{" "}
          <Link
            href="/cookies"
            className="underline underline-offset-2"
            style={{ color: "var(--color-foreground)" }}
          >
            Viac o cookies
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent("rejected")}
            className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-80"
            style={{
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            Odmietnuť
          </button>
          <button
            type="button"
            onClick={() => setConsent("accepted")}
            className="rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-wide transition hover:opacity-85"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Prijať všetko
          </button>
        </div>
      </div>
    </div>
  );
}
