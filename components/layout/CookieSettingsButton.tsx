"use client";

import { clearConsent } from "@/lib/consent";

// Footer control that brings the cookie banner back, so a visitor can change
// a choice they already made. vytlacto3d's footer carries the same control
// next to the legal links.
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={clearConsent}
      className="transition hover:opacity-70"
      style={{ color: "inherit" }}
    >
      Nastavenia cookies
    </button>
  );
}
