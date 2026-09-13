// VAT helpers for the price breakdown.
//
// IMPORTANT — which way round the headline price runs:
// calculatePrice() returns the single number the configurator has always shown
// the customer as "Orientačná cena". It is treated here as the GROSS price,
// i.e. VAT already included, and the net base is derived from it. That keeps
// the headline figure identical to what customers see today; reading it as a
// net price instead would silently raise every quote by 23 %.
//
// If the catalogue prices in lib/pricing.ts are in fact net, flip to
// netToGross() for the headline and this file is the only place to change.

export const VAT_RATE = 0.23; // Slovakia, 23 % since 2025

/** Net (VAT-exclusive) base contained in a gross price. */
export function netFromGross(gross: number): number {
  return gross / (1 + VAT_RATE);
}

/** The VAT portion contained in a gross price. */
export function vatFromGross(gross: number): number {
  return gross - netFromGross(gross);
}

/** Add VAT to a net price. */
export function netToGross(net: number): number {
  return net * (1 + VAT_RATE);
}

/** Slovak money formatting: comma decimal separator, space thousands, € suffix. */
export function formatEur(value: number): string {
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
