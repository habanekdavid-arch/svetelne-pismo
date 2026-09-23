import type { Config, PriceTier } from "@/lib/types";
import { materialById, depthMmFor } from "@/lib/options";
import type { SignSize } from "@/lib/useSignSize";
import { netToGross } from "@/lib/vat";

// Pricing straight off the price list (e-shop_rozsvietto_cennik.xlsx, sheet
// "ceny"). A sign is sold by the AREA it covers — the rectangle the whole
// inscription occupies on the wall — at a unit price that steps down at 3 m²
// and again at 5 m². The one exception is solid 3D print, which is sold by the
// volume of material actually printed.
//
// The unit prices are net; VAT is added for display (lib/vat.ts).

/**
 * Najnižšia cena za jeden nápis — € S DPH.
 *
 * Aj ten najmenší nápis stojí prípravu, materiál, balenie a čas pri stroji,
 * a to sa nezmenší s plochou: pár malých písmen by podľa €/m² vyšlo na
 * jednotky eur, za čo sa vyrobiť nedá. Platí na nápis, nie na objednávku —
 * tri drobné nápisy sú tri kusy práce.
 */
export const MIN_PRICE_GROSS = 50;

// Estimates used only while the webfont is still loading and the sign has not
// been measured yet. Calibrated against real measurements of "PIZZA",
// "KAVIAREŇ" and "Váš text" in the catalogue's faces — they are all heavy
// display fonts, so a character is nearly as wide as it is tall.
/** An average character's advance, in cap heights. */
const FALLBACK_WIDTH_PER_HEIGHT = 0.9;
/** …and what share of that box its letters' own rectangles take up. */
const FALLBACK_LETTER_SHARE = 0.8;
/** Share of its own box a bold inscription actually fills. */
const FALLBACK_INK_RATIO = 0.5;

function tierFor(tiers: PriceTier[], m2: number): PriceTier {
  return tiers.find((t) => m2 <= t.maxM2) ?? tiers[tiers.length - 1];
}

/** The sign's real size, or an estimate good enough to quote from meanwhile. */
function sizeOf(config: Config, size: SignSize | null): SignSize {
  if (size) return size;
  const letters = (config.text.trim() || "VÁŠ TEXT").length;
  const widthMm = config.height * FALLBACK_WIDTH_PER_HEIGHT * letters;
  return {
    widthMm,
    heightMm: config.height,
    inkRatio: FALLBACK_INK_RATIO,
    letterAreaM2: ((widthMm * config.height) / 1_000_000) * FALLBACK_LETTER_SHARE,
    // One letter is about as wide as it is tall in these display faces.
    maxLetterWidthMm: config.height * FALLBACK_WIDTH_PER_HEIGHT,
    maxLetterHeightMm: config.height,
  };
}

export type PriceBreakdown = {
  /** € without VAT. */
  net: number;
  /** m² the quote is worked out from: every letter's own rectangle, added up. */
  areaM2: number;
  /** m² of the rectangle the whole nápis occupies on the wall. */
  boxM2: number;
  /** cm³ of printed material — only for the build that is sold by volume. */
  volumeCm3: number | null;
  /** € per m² (or per cm³) this quote was worked out at. */
  unit: number;
  unitLabel: string;
};

export function priceBreakdown(config: Config, size: SignSize | null): PriceBreakdown {
  const material = materialById(config.material);
  const s = sizeOf(config, size);
  // Billed area is the letters themselves, each in its own rectangle — a sign
  // is made letter by letter, and the air between two words is not made at
  // all. The box the whole nápis occupies is carried alongside because that
  // is what has to fit the wall.
  const areaM2 = s.letterAreaM2;
  const boxM2 = (s.widthMm / 1000) * (s.heightMm / 1000);

  // Sold by volume: what is printed is the letterform, not its bounding box,
  // so the ink ratio (how much of that box the glyphs actually cover, measured
  // in lib/useSignSize.ts) is what turns the area into real material.
  if (material.volumePricePerCm3) {
    const depthCm = depthMmFor(material.id, config.height) / 10;
    // Printed material follows the letterform itself, not the rectangle
    // around it, so the volume uses the measured ink coverage of the box.
    const volumeCm3 = boxM2 * 10000 * s.inkRatio * depthCm;
    return {
      net: volumeCm3 * material.volumePricePerCm3,
      areaM2,
      boxM2,
      volumeCm3,
      unit: material.volumePricePerCm3,
      unitLabel: "€/cm³",
    };
  }

  const tiers = config.signType === "illuminated" ? material.litPrice : material.plainPrice;
  // A build offered for this sign type always has its tiers; falling back to
  // the lit ones keeps a quote on screen if a catalogue entry is ever
  // half-filled, instead of showing 0 €.
  const table = tiers ?? material.litPrice ?? material.plainPrice ?? [];
  if (table.length === 0) {
    return { net: 0, areaM2, boxM2, volumeCm3: null, unit: 0, unitLabel: "€/m²" };
  }
  const tier = tierFor(table, areaM2);
  return {
    net: areaM2 * tier.perM2,
    areaM2,
    boxM2,
    volumeCm3: null,
    unit: tier.perM2,
    unitLabel: "€/m²",
  };
}

/**
 * Price with VAT, rounded to whole euros — the headline the configurator
 * shows. The price list is a trade list, so its figures are net and VAT is
 * added here; lib/vat.ts then splits the same number back for the breakdown.
 */
export function calculatePrice(config: Config, size: SignSize | null = null): number {
  return Math.max(MIN_PRICE_GROSS, Math.round(netToGross(priceBreakdown(config, size).net)));
}

/** True keď cenu určila minimálna cena, nie plocha — vtedy to treba povedať. */
export function isMinimumPrice(config: Config, size: SignSize | null = null): boolean {
  return Math.round(netToGross(priceBreakdown(config, size).net)) < MIN_PRICE_GROSS;
}
