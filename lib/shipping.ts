import type { Config } from "@/lib/types";
import type { SignSize } from "@/lib/useSignSize";
import { materialById, depthMmFor } from "@/lib/options";
import { priceBreakdown } from "@/lib/pricing";

// How a finished sign gets to the customer.
//
// Three ways, nothing else: collected in person at the workshop in Prievidza,
// handed over in person anywhere in Bratislava, or sent by DPD courier. A sign
// that is too big or heavy for a DPD parcel — a 2 m alurol channel letter is a
// pallet — is sent by freight arranged by hand, so every courier option is
// filtered through an estimate of the packed sign (estimateParcel) first.

export type DeliveryMethodId =
  | "pickup-prievidza"   // collected at the workshop
  | "pickup-bratislava"  // handed over in person, anywhere in Bratislava
  | "dpd"                // DPD courier to an address
  | "freight";           // too big for a parcel — quoted and arranged by hand

export type DeliveryMethod = {
  id: DeliveryMethodId;
  name: string;
  description: string;
  /** € incl. VAT. `null` means "quoted separately", not "free". */
  price: number | null;
  /** Does this method need an address from the customer? */
  needsAddress: boolean;
};

/** Where a sign collected in Prievidza is picked up. */
export const PICKUP_ADDRESS = "4from media, s.r.o., M. Hodžu 393/5, 971 01 Prievidza";

// ── Parcel limits ────────────────────────────────────────────────────────────
// DPD Classic's own limits — 31,5 kg and 175 cm on the longest side. They live
// here, in one place, and can be overridden from the environment without a
// deploy if the contract says otherwise.
export const PARCEL_LIMITS = {
  dpd: {
    maxWeightKg: num(process.env.NEXT_PUBLIC_DPD_MAX_KG, 31.5),
    maxLongestCm: num(process.env.NEXT_PUBLIC_DPD_MAX_CM, 175),
  },
} as const;

function num(raw: string | undefined, fallback: number): number {
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// ── Prices ───────────────────────────────────────────────────────────────────
// Final, VAT-inclusive prices. Collecting in person costs nothing; DPD is
// 6,15 € (5 € + 23 % DPH). Overridable from the environment so a change in the
// carrier's tariff does not need a code change.
export const DELIVERY_PRICES = {
  dpd: numOrZero(process.env.NEXT_PUBLIC_DELIVERY_PRICE_DPD, 6.15),
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
    "Nápis je na balík DPD príliš veľký alebo ťažký. Dopravu dohodneme individuálne a cenu potvrdíme pred výrobou.",
  price: null,
  needsAddress: true,
};

/**
 * The delivery methods this consignment may go by, in the order they should be
 * shown. Collecting in person works for any size; DPD only when the parcel is
 * within its limits, and freight takes its place when it is not.
 */
export function deliveryMethodsFor(parcel: Parcel): DeliveryMethod[] {
  return [
    {
      id: "pickup-prievidza",
      name: "Osobný odber — Prievidza",
      description: PICKUP_ADDRESS,
      price: 0,
      needsAddress: false,
    },
    {
      id: "pickup-bratislava",
      name: "Osobný odber — Bratislava",
      description: "Odovzdáme vám ho osobne kdekoľvek v Bratislave. Miesto a čas dohodneme telefonicky.",
      price: 0,
      needsAddress: true,
    },
    fits(parcel, PARCEL_LIMITS.dpd)
      ? {
          id: "dpd",
          name: "Kuriér DPD",
          description: "Doručenie na vašu adresu.",
          price: DELIVERY_PRICES.dpd,
          needsAddress: true,
        }
      : FREIGHT,
  ];
}

/** Is this address somewhere in Bratislava — the only city handed over in person? */
export function isInBratislava(city: string): boolean {
  return /bratislava/i.test(city.normalize("NFD").replace(/\p{M}/gu, ""));
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

/** How each delivery method reads on an order — the old Packeta ones too. */
export const DELIVERY_METHOD_LABEL: Record<string, string> = {
  "pickup-prievidza":  "Osobný odber — Prievidza",
  "pickup-bratislava": "Osobný odber — Bratislava",
  dpd:                 "Kuriér DPD",
  freight:             "Preprava na dohodu",
  personal:            "Osobný odber",
  "packeta-pickup":    "Packeta — výdajné miesto",
  "packeta-home":      "Kuriér",
};

/** Where an order goes, in one line — or null when there is nowhere to say. */
export function deliveryPlace(group: {
  deliveryMethod: string;
  deliveryPoint?: { name: string; street?: string | null } | null;
  deliveryAddress?: { street: string; houseNumber: string; zip: string; city: string } | null;
}): string | null {
  if (group.deliveryMethod === "pickup-prievidza") return PICKUP_ADDRESS;
  const p = group.deliveryPoint;
  if (p) return `${p.name}${p.street ? `, ${p.street}` : ""}`;
  const a = group.deliveryAddress;
  if (a) return `${a.street} ${a.houseNumber}, ${a.zip} ${a.city}`;
  return null;
}

/** What happens once the sign is made — the line after "we are making it". */
export function afterMadeText(deliveryMethod: string): string {
  if (deliveryMethod === "pickup-prievidza") {
    return `Keď bude hotový, zavoláme vám a môžete si ho vyzdvihnúť na adrese ${PICKUP_ADDRESS}.`;
  }
  if (deliveryMethod === "pickup-bratislava") {
    return "Keď bude hotový, zavoláme vám a dohodneme, kde a kedy vám ho v Bratislave odovzdáme.";
  }
  if (deliveryMethod === "freight") {
    return "Keď bude hotový, ozveme sa vám a dohodneme dopravu.";
  }
  return "Keď bude hotový, odovzdáme ho kuriérovi DPD — ozve sa vám pred doručením.";
}
