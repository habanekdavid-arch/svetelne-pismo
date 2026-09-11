// GA4 ecommerce tracking via GTM's dataLayer. No GTM container is installed
// on the site yet (see app/layout.tsx) — these pushes are inert until one is
// added, but are ready to fire the moment it is.

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

// The order form (components/configurator/OrderModal.tsx) has no backend —
// nothing is persisted or paid, so there is no server-issued order number.
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
