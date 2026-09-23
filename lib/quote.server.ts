import "server-only";

import type { Config } from "@/lib/types";
import { calculatePrice } from "@/lib/pricing";
import { measureSign } from "@/lib/sign-metrics.server";
import {
  deliveryMethodsFor,
  estimateParcel,
  totalParcel,
  type DeliveryMethod,
  type DeliveryMethodId,
  type Parcel,
} from "@/lib/shipping";
import {
  MATERIALS,
  fontOptions,
  materialById,
  materialsFor,
  fontsFor,
  clampHeight,
  applyTextCase,
  hasSeparateFace,
  clampFaceColor,
} from "@/lib/options";
import { oneLine } from "@/lib/sign-text";

// What a basket costs and how it can be sent — worked out on the server, from
// the server's own measurement of every sign.
//
// This is the only place an amount of money is decided. The configurator's
// running total is a preview; the checkout screen, the order row and the
// Stripe session all read this, so what the customer is shown before paying
// and what the card is charged cannot drift apart.

export type QuoteItem = {
  /** What this sign says, for the checkout list and the Stripe line item. */
  label: string;
  config: Config;
  /** € incl. VAT, whole euros — the figure shown beside the sign. */
  price: number;
  priceCents: number;
  widthMm: number;
  heightMm: number;
  parcel: Parcel;
};

export type Quote = {
  items: QuoteItem[];
  /** The whole basket as one consignment. */
  parcel: Parcel;
  /** Only the methods this consignment may actually be sent by. */
  deliveryMethods: DeliveryMethod[];
  itemsCents: number;
};

/**
 * A Config from the request, made safe to price — or null if it is not a sign
 * this shop makes. Everything a price depends on is checked against the
 * catalogue, because materialById() quietly falls back to the first build and
 * an unchecked id would be charged at the wrong rate.
 */
export function sanitizeConfig(raw: unknown): Config | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<Config>;

  if (typeof c.text !== "string" || !c.text.trim()) return null;
  if (c.signType !== "illuminated" && c.signType !== "plain") return null;
  if (c.placement !== "exterior" && c.placement !== "interior") return null;

  // The build has to be one this sign type and placement is actually offered
  // in, and the font one that build is made in — the same two tables the
  // configurator filters its options with (sheet "strom" / "parametre").
  const material = MATERIALS.find((m) => m.id === c.material);
  if (!material) return null;
  const offered = materialsFor(c.signType, c.placement, c.lightMode ?? "front");
  if (!offered.some((m) => m.id === material.id)) return null;

  const font = fontOptions.find((f) => f.id === c.font);
  if (!font || !fontsFor(material.id).some((f) => f.id === font.id)) return null;

  const height = Number(c.height);
  if (!Number.isFinite(height)) return null;

  return {
    // Alurol je v cenníku zvlášť pre veľké a zvlášť pre malé písmo, tak sa
    // text prepíše aj tu — request z prehliadača nerozhoduje o tom, čo sa dá
    // vyrobiť.
    text: applyTextCase(c.text.slice(0, 120), material.id),
    font: font.id,
    material: material.id,
    signType: c.signType,
    placement: c.placement,
    lightMode: c.lightMode ?? "front",
    lightColor: typeof c.lightColor === "string" ? c.lightColor.slice(0, 32) : "#ffffff",
    bodyColor: typeof c.bodyColor === "string" ? c.bodyColor.slice(0, 32) : "#ffffff",
    // Checked, not trusted: a front-lit face has to be a colour light gets
    // through, and 30 mm plexi has no separate face at all.
    faceColor: hasSeparateFace(material.id)
      ? clampFaceColor(
          material.id,
          c.signType,
          c.lightMode ?? "front",
          typeof c.faceColor === "string" ? c.faceColor.slice(0, 32)
            : typeof c.bodyColor === "string" ? c.bodyColor.slice(0, 32) : "#ffffff",
        )
      : undefined,
    // Clamped, not rejected: the build's own range is what it is made in, and
    // a height just outside it is a stale cart line, not an attack.
    height: clampHeight(material.id, height),
    rotation: 0,
  };
}

/** Prices a basket and works out how it can be delivered. */
export async function quoteBasket(configs: Config[]): Promise<Quote> {
  const items: QuoteItem[] = [];

  for (const config of configs) {
    // Measured here, never taken from the request: this is what the price is
    // worked out from.
    const size = await measureSign(config.text, config.font, config.height);
    const price = calculatePrice(config, size);
    const material = materialById(config.material);

    items.push({
      label: `${oneLine(config.text) || "Nápis"} — ${material.displayName}`,
      config,
      price,
      priceCents: price * 100,
      widthMm: Math.round(size?.widthMm ?? 0),
      heightMm: Math.round(size?.heightMm ?? 0),
      parcel: estimateParcel(config, size),
    });
  }

  const parcel = totalParcel(items.map((i) => i.parcel));
  return {
    items,
    parcel,
    deliveryMethods: deliveryMethodsFor(parcel),
    itemsCents: items.reduce((sum, i) => sum + i.priceCents, 0),
  };
}

/**
 * The delivery the customer picked, checked against what this basket may be
 * sent by. Returns null when the method is not on offer for this consignment —
 * which is how a tampered request gets turned away.
 */
export function resolveDelivery(
  quote: Quote,
  methodId: string,
): DeliveryMethod | null {
  return quote.deliveryMethods.find((m) => m.id === methodId) ?? null;
}

/** Delivery in cents. A method quoted separately adds nothing to the card. */
export function deliveryCents(method: DeliveryMethod): number {
  return method.price === null ? 0 : Math.round(method.price * 100);
}

export type { DeliveryMethodId };
