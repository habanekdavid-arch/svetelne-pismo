// VAT helpers for the price breakdown.
//
// IMPORTANT — which way round the headline price runs:
// The figures in the price list (e-shop_rozsvietto_cennik_nova_schema_nizsie_ceny.xlsx, sheet "ceny":
// 816 / 739,5 / 552,5 €/m² and so on) are read as NET, trade prices. calculatePrice()
// in lib/pricing.ts therefore adds VAT — netToGross() — and the number the
// customer sees as "Orientačná cena s DPH" is that gross figure; this file
// splits it back for the breakdown underneath.
//
// If the price list turns out to be quoted WITH VAT already in it, the fix is
// one line: drop the netToGross() in lib/pricing.ts's calculatePrice() and
// every quote falls by 23 %. Nothing else needs to change.

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

/**
 * Cents only where there are any: a whole amount reads "1 004 €", one with
 * cents keeps them — "18,45 €" — so a sum the customer has to pay (a bank
 * transfer, the delivery) is never shown rounded.
 */
function fractionDigits(value: number): number {
  return Math.abs(value - Math.round(value)) < 0.005 ? 0 : 2;
}

/**
 * The bare amount, Slovak style — "604,80", "816", no currency symbol. For
 * places that supply their own unit ("… €/m²"), where formatEur's symbol would
 * be doubled up.
 */
export function formatAmount(value: number): string {
  const digits = fractionDigits(value);
  return new Intl.NumberFormat("sk-SK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Slovak money formatting: comma decimal separator, space thousands, € suffix. */
export function formatEur(value: number): string {
  const digits = fractionDigits(value);
  return new Intl.NumberFormat("sk-SK", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
