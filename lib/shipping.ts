import type { Config } from "@/lib/types";
import type { SignSize } from "@/lib/useSignSize";
import { materialById, depthMmFor } from "@/lib/options";
import { priceBreakdown } from "@/lib/pricing";

// How a finished sign gets to the customer.
//
// This is where the shop's physical reality meets Packeta's: a 120 mm "PIZZA"
// in printed plexi is a parcel, and a 2 m alurol channel letter is a pallet.
// Packeta must only ever be offered for what Packeta will actually carry, so
// every option below is filtered through an estimate of the packed sign
// (estimateParcel) before the customer ever sees it.

export type DeliveryMethodId =
  | "packeta-pickup"  // Packeta pick-up point / Z-BOX, chosen in the widget
  | "packeta-home"    // courier to an address
  | "freight";        // too big for a parcel — quoted and arranged by hand

export type DeliveryMethod = {
  id: DeliveryMethodId;
  name: string;
  description: string;
  /** € incl. VAT. `null` means "quoted separately", not "free". */
  price: number | null;
  /** Does this method need the Packeta pick-up point widget? */
  needsPoint: boolean;
  /** Does this method need a postal address from the customer? */
  needsAddress: boolean;
};

// ── Parcel limits ────────────────────────────────────────────────────────────
// Packeta's own limits, which change with their terms and with what a given
// account has enabled — so they live here, in one place, and can be overridden
// from the environment without a deploy. The defaults are deliberately
// conservative; check them against your current Packeta contract.
export const PARCEL_LIMITS = {
  /** Pick-up point / Z-BOX. */
  pickup: {
    maxWeightKg: num(process.env.NEXT_PUBLIC_PACKETA_PICKUP_MAX_KG, 10),
    maxLongestCm: num(process.env.NEXT_PUBLIC_PACKETA_PICKUP_MAX_CM, 70),
  },
  /** Courier to an address. */
  home: {
    maxWeightKg: num(process.env.NEXT_PUBLIC_PACKETA_HOME_MAX_KG, 30),
    maxLongestCm: num(process.env.NEXT_PUBLIC_PACKETA_HOME_MAX_CM, 120),
  },
} as const;

function num(raw: string | undefined, fallback: number): number {
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// ── Prices ───────────────────────────────────────────────────────────────────
// The same tariff as vytlacto3d (its lib/shipping.ts SHIPPING_RATES): final,
// VAT-inclusive prices the customer pays — 3,99 € to a pick-up point, 5,99 €
// by courier. Overridable from the environment so a change in the carrier's
// tariff does not need a code change.
export const DELIVERY_PRICES = {
  pickup: numOrZero(process.env.NEXT_PUBLIC_DELIVERY_PRICE_PICKUP, 3.99),
  home:   numOrZero(process.env.NEXT_PUBLIC_DELIVERY_PRICE_HOME, 5.99),
} as const;

function numOrZero(raw: string | undefined, fallback: number): number {
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

// ── How heavy and how big is the packed sign? ────────────────────────────────

/**
 * What a sign weighs, per build.
 *
 * A channel letter is a box, not a block: a face, a back and a band round the
 * edge. `faceKgPerM2` is what the flat parts weigh whatever the depth is, and
 * the depth adds only the band — which is why `hollow` is small for anything
 * built as a shell and 1 for anything cut from solid sheet. Multiplying the
 * whole face area by the depth (as if the letter were solid aluminium) would
 * put a 1,5 m alurol sign at a tonne.
 *
 * These are workshop rules of thumb. They decide which delivery methods are
 * offered, and the packed weight is confirmed before the label is bought.
 */
const WEIGHT_MODEL: Record<string, { faceKgPerM2: number; densityKgPerM3: number; hollow: number }> = {
  // Aluminium band with a plexi face — light for its size, and the depth
  // barely tells.
  "alurol-upper": { faceKgPerM2: 4.0, densityKgPerM3: 2700, hollow: 0.012 },
  "alurol-lower": { faceKgPerM2: 4.0, densityKgPerM3: 2700, hollow: 0.012 },
  // Cut from solid 30 mm cast acrylic: the depth is all material.
  "plexi30":      { faceKgPerM2: 0,   densityKgPerM3: 1190, hollow: 1 },
  // Printed shell with a plexi face, infilled rather than solid.
  "print3d":      { faceKgPerM2: 0.8, densityKgPerM3: 1250, hollow: 0.06 },
  // Solid acrylic sheet, UV printed.
  "plexi-uv":     { faceKgPerM2: 0,   densityKgPerM3: 1190, hollow: 1 },
};

const DEFAULT_WEIGHT_MODEL = { faceKgPerM2: 2.0, densityKgPerM3: 1200, hollow: 0.2 };

/** Printed PLA/PETG, g/cm³ — the one build whose volume we already know. */
const SOLID_PRINT_DENSITY = 1.25;

/** Packaging a sign adds crate, foam and cardboard, never nothing. */
const PACKAGING_KG = 0.6;
const PACKAGING_CM = 8;

export type Parcel = {
  /** Estimated gross weight in kilograms, packaging included. */
  weightKg: number;
  /** Longest outer dimension of the packed sign, in centimetres. */
  longestCm: number;
};

/** What the finished sign will weigh and measure once it is boxed. */
export function estimateParcel(config: Config, size: SignSize | null): Parcel {
  const material = materialById(config.material);
  const depthMm = depthMmFor(config.material, config.height);
  const b = priceBreakdown(config, size);

  let weightKg: number;
  if (b.volumeCm3 !== null) {
    // Solid print: the volume is already the real thing.
    weightKg = (b.volumeCm3 * SOLID_PRINT_DENSITY) / 1000;
  } else {
    const model = WEIGHT_MODEL[material.id] ?? DEFAULT_WEIGHT_MODEL;
    const depthM = depthMm / 1000;
    weightKg = b.areaM2 * (model.faceKgPerM2 + depthM * model.densityKgPerM3 * model.hollow);
  }

  // A sign is made and packed letter by letter, so the box is sized by the
  // BIGGEST LETTER — not by the width of the whole nápis, which is only how
  // far apart they end up on the wall.
  const letterWcm = (size?.maxLetterWidthMm ?? config.height * 0.9) / 10;
  const letterHcm = (size?.maxLetterHeightMm ?? config.height) / 10;
  const longestCm = Math.max(letterWcm, letterHcm, depthMm / 10) + PACKAGING_CM;

  return {
    weightKg: round2(weightKg + PACKAGING_KG),
    longestCm: Math.round(longestCm),
  };
}

/** The whole basket as one consignment: weights add up, the box is the biggest. */
export function totalParcel(parcels: Parcel[]): Parcel {
  return {
    weightKg: round2(parcels.reduce((s, p) => s + p.weightKg, 0)),
    longestCm: parcels.reduce((m, p) => Math.max(m, p.longestCm), 0),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function fits(parcel: Parcel, limit: { maxWeightKg: number; maxLongestCm: number }): boolean {
  return parcel.weightKg <= limit.maxWeightKg && parcel.longestCm <= limit.maxLongestCm;
}

// ── What can this order actually be sent by? ─────────────────────────────────

const FREIGHT: DeliveryMethod = {
  id: "freight",
  name: "Preprava na dohodu",
  description:
    "Nápis je na balík príliš veľký alebo ťažký. Dopravu dohodneme individuálne a cenu potvrdíme pred výrobou.",
  price: null,
  needsPoint: false,
  needsAddress: true,
};

/**
 * The delivery methods this consignment may be sent by, in the order they
 * should be shown — Packeta and courier, as on vytlacto3d, each only when the
 * parcel is within its limits. A sign too big for both is arranged by hand.
 */
export function deliveryMethodsFor(parcel: Parcel): DeliveryMethod[] {
  const methods: DeliveryMethod[] = [];

  // A pick-up point is chosen on Packeta's map, and without the widget key
  // there is no map — offering it would strand the customer on the last step.
  const canPickup = Boolean(process.env.NEXT_PUBLIC_PACKETA_API_KEY?.trim());

  if (canPickup && fits(parcel, PARCEL_LIMITS.pickup)) {
    methods.push({
      id: "packeta-pickup",
      name: "Packeta",
      description: "Výdajné miesto alebo Z-BOX podľa vášho výberu.",
      price: DELIVERY_PRICES.pickup,
      needsPoint: true,
      needsAddress: false,
    });
  }
  // A courier only needs an address. With Packeta's courier set up
  // (PACKETA_HOME_CARRIER_ID) the label is created on payment; without it the
  // parcel is booked by hand from the admin — either way the customer is done.
  if (fits(parcel, PARCEL_LIMITS.home)) {
    methods.push({
      id: "packeta-home",
      name: "Kuriér",
      description: "Doručenie na vašu adresu.",
      price: DELIVERY_PRICES.home,
      needsPoint: false,
      needsAddress: true,
    });
  }

  if (methods.length === 0) methods.push(FREIGHT);
  return methods;
}

/** One method by id, or null when this consignment may not be sent that way. */
export function deliveryMethod(
  id: DeliveryMethodId,
  parcel: Parcel,
): DeliveryMethod | null {
  return deliveryMethodsFor(parcel).find((m) => m.id === id) ?? null;
}

/** "4,90 €" / "Zadarmo" / "Cena na dohodu" — how a delivery price reads. */
export function formatDeliveryPrice(price: number | null): string {
  if (price === null) return "Cena na dohodu";
  if (price === 0) return "Zadarmo";
  return `${price.toFixed(2).replace(".", ",")} €`;
}
