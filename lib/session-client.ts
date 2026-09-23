// Tiny cross-component signal for "the customer session just changed" —
// used when the checkout's inline sign-in/sign-up (see
// components/checkout/AuthGate.tsx) authenticates someone without a
// full page navigation, so HeaderNav can refetch /api/auth/me and update
// immediately instead of waiting for the next page load.

const EVENT = "rozsvietto:session-change";

export function notifySessionChange() {
  window.dispatchEvent(new Event(EVENT));
}

export function onSessionChange(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
