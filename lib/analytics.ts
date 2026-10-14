// GA4 ecommerce tracking via GTM's dataLayer. The container itself is loaded
// by components/layout/TagManager.tsx once NEXT_PUBLIC_GTM_ID is set.
//
// Consent is not checked here: the visitor's choice in the CookieScript
// banner reaches every Google tag through Consent Mode (lib/cookie-script.ts),
// and a tag without consent stores nothing.

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
