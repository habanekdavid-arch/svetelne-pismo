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

/** Text and height when the sign has not been measured yet (font still loading). */
const FALLBACK_WIDTH_PER_HEIGHT = 0.62;  // an average glyph's width in cap heights
/** Share of its own box a bold inscription actually fills — used only as a fallback. */
const FALLBACK_INK_RATIO = 0.42;

function tierFor(tiers: PriceTier[], m2: number): PriceTier {
  return tiers.find((t) => m2 <= t.maxM2) ?? tiers[tiers.length - 1];
}

/** The sign's real size, or an estimate good enough to quote from meanwhile. */
function sizeOf(config: Config, size: SignSize | null): SignSize & { inkRatio: number } {
  if (size) return { ...size, inkRatio: size.inkRatio };
  const letters = (config.text.trim() || "VÁŠ TEXT").length;
  return {
    widthMm: config.height * FALLBACK_WIDTH_PER_HEIGHT * letters,
    heightMm: config.height,
    inkRatio: FALLBACK_INK_RATIO,
  };
}

export type PriceBreakdown = {
  /** € without VAT. */
  net: number;
  /** m² of the whole inscription. */
  areaM2: number;
  /** cm³ of printed material — only for the build that is sold by volume. */
  volumeCm3: number | null;
  /** € per m² (or per cm³) this quote was worked out at. */
  unit: number;
  unitLabel: string;
};

export function priceBreakdown(config: Config, size: SignSize | null): PriceBreakdown {
  const material = materialById(config.material);
  const s = sizeOf(config, size);
  const areaM2 = (s.widthMm / 1000) * (s.heightMm / 1000);

  // Sold by volume: what is printed is the letterform, not its bounding box,
  // so the ink ratio (how much of that box the glyphs actually cover, measured
  // in lib/useSignSize.ts) is what turns the area into real material.
  if (material.volumePricePerCm3) {
    const depthCm = depthMmFor(material.id, config.height) / 10;
    const volumeCm3 = areaM2 * 10000 * s.inkRatio * depthCm;
    return {
      net: volumeCm3 * material.volumePricePerCm3,
      areaM2,
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
    return { net: 0, areaM2, volumeCm3: null, unit: 0, unitLabel: "€/m²" };
  }
  const tier = tierFor(table, areaM2);
  return {
    net: areaM2 * tier.perM2,
    areaM2,
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
  return Math.round(netToGross(priceBreakdown(config, size).net));
}
