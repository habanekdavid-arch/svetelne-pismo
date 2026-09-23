// GA4 ecommerce tracking via GTM's dataLayer. No GTM container is installed
// on the site yet (see app/layout.tsx) — these pushes are inert until one is
// added, but are ready to fire the moment it is.
//
// Gated on cookie consent (lib/consent.ts) — trackPurchase is a no-op until
// the visitor has accepted analytics cookies via the CookieConsent banner
// or the /cookies settings page.

import { hasAnalyticsConsent } from "@/lib/consent";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export type PurchaseItem = {
  item_name: string;
  item_id: string;
  price: number;
  quantity: number;
};

export type PurchasePayload = {
  transactionId: string;
  value: number;
  currency: string;
  items: PurchaseItem[];
};

// The checkout (components/cart/CheckoutPanel.tsx) reports a purchase without
// the server's order number, which it does not pass to analytics.
// This generates a client-side stand-in so `transaction_id` isn't empty.
// Replace with a real backend-issued ID if/when the order flow gets one.
export function generateClientOrderId(): string {
  return `ROZ-${Date.now().toString(36).toUpperCase()}`;
}

export function trackPurchase(payload: PurchasePayload) {
  if (!hasAnalyticsConsent()) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // clear previous ecommerce object first, per GA4/GTM convention
  window.dataLayer.push({
    event: "purchase",
    ecommerce: {
      transaction_id: payload.transactionId,
      value: payload.value,
      currency: payload.currency,
      items: payload.items,
    },
  });
}
