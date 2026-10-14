"use client";

import { openCookieSettings } from "@/lib/cookie-script";
import { useT } from "@/lib/i18n/client";

// The interactive half of /cookies — opens the CookieScript settings, where
// a visitor sees the current choice per category and can change it.
export default function CookieSettingsControls() {
  const t = useT();
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-sm" style={{ color: "var(--color-foreground)" }}>
        {t("Svoj súhlas môžete kedykoľvek zmeniť — pre každú kategóriu zvlášť.")}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openCookieSettings}
          className="rounded-full px-5 py-2.5 text-[11px] font-black tracking-wide transition hover:opacity-85"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {t("Nastavenia cookies")}
        </button>
      </div>
    </div>
  );
}
