// Minimal cookie-consent state, persisted in localStorage. Two real states —
// "accepted" / "rejected" — plus `null` meaning "not decided yet" (the
// CookieConsent banner shows until the visitor picks one). No cookie
// category granularity (necessary/analytics/marketing) since the site only
// has one optional category today (GA4 purchase tracking — see
// lib/analytics.ts); add per-category keys here if that ever grows.

export type ConsentStatus = "accepted" | "rejected";

const STORAGE_KEY = "rozsvietto:cookie-consent";
const CHANGE_EVENT = "rozsvietto:cookie-consent-change";

export function getConsent(): ConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null; // localStorage blocked (private mode, cookies disabled) — treat as undecided
  }
}

export function setConsent(status: ConsentStatus) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, status);
  } catch {
    // can't persist — the choice still applies for the rest of this page load
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: status }));
}

// useSyncExternalStore-compatible subscribe: fires on a change made in this
// tab (the banner vs. the /cookies settings page can both be mounted at
// once) or in another tab (native `storage` event), no arguments in, no
// arguments out — callers re-read the current value with getConsent().
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// "Nastavenia cookies" in the footer: forget the stored decision so the
// banner comes back and the visitor can choose again. Deliberately not a
// third stored state — undecided is exactly what a first visit looks like.
export function clearConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing persisted to clear
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: null }));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent() === "accepted";
}
