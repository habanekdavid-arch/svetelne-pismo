"use client";

import { clearConsent } from "@/lib/consent";
import { useT } from "@/lib/i18n/client";

// Footer control that brings the cookie banner back, so a visitor can change
// a choice they already made. vytlacto3d's footer carries the same control
// next to the legal links.
export default function CookieSettingsButton() {
  const t = useT();
  return (
    <button
      type="button"
      onClick={clearConsent}
      className="transition hover:opacity-70"
      style={{ color: "inherit" }}
    >
      {t("Nastavenia cookies")}
    </button>
  );
}
