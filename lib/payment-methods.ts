// How an order is paid for — the same two ways vytlacto3d takes money: a card
// through Stripe, or a bank transfer against the order's variable symbol.
//
// Which of them is on offer is decided on the server (app/api/quote), because
// each depends on configuration the browser cannot see: a card needs the
// Stripe keys, a transfer needs the shop's IBAN. Neither set means the order
// is an enquiry and the shop gets back to the customer — nothing is offered
// that would lead to a dead end.
//
// This file holds only names and labels, so the checkout (a client component)
// and the admin can share them.

export type PaymentMethodId = "card" | "transfer";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodId, string> = {
  card:     "Platba kartou",
  transfer: "Bankový prevod",
};

export function isPaymentMethod(value: unknown): value is PaymentMethodId {
  return value === "card" || value === "transfer";
}

/**
 * What kind of order this is. A standard order is made, paid for and sent; an
 * installation consultation is a sign the customer wants mounted, so the shop
 * calls them about it first — nothing is paid or shipped until then.
 */
export type OrderKind = "standard" | "installation";

/** Stored as the order's delivery method, so no extra column is needed. */
export const INSTALLATION_METHOD = "installation";
