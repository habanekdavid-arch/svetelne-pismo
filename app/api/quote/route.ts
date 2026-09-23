import { NextResponse } from "next/server";
import { availablePaymentMethods } from "@/lib/payment.server";
import { quoteBasket, sanitizeConfig } from "@/lib/quote.server";
import type { Config } from "@/lib/types";
import { stripeConfigured } from "@/lib/stripe";
import { formatDeliveryPrice } from "@/lib/shipping";

// What this basket costs and how it can be sent — the numbers the checkout
// screen shows, worked out by the server so they are the same numbers the card
// is charged. No session needed: it is a quote, not an order.

export const runtime = "nodejs"; // measures the sign from the font file on disk

const MAX_ITEMS = 20;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.items) ? body.items : [];
  if (raw.length === 0) {
    return NextResponse.json({ error: "empty_basket" }, { status: 400 });
  }
  if (raw.length > MAX_ITEMS) {
    return NextResponse.json({ error: "too_many_items" }, { status: 400 });
  }

  const configs = raw
    .map((item: unknown) =>
      sanitizeConfig(
        item && typeof item === "object" && "config" in item
          ? (item as { config: unknown }).config
          : item,
      ),
    )
    .filter((c: Config | null): c is Config => c !== null);

  if (configs.length !== raw.length) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const quote = await quoteBasket(configs);

  return NextResponse.json({
    items: quote.items.map((i) => ({
      label: i.label,
      price: i.price,
      priceCents: i.priceCents,
      widthMm: i.widthMm,
      heightMm: i.heightMm,
    })),
    itemsCents: quote.itemsCents,
    parcel: quote.parcel,
    deliveryMethods: quote.deliveryMethods.map((m) => ({
      ...m,
      priceLabel: formatDeliveryPrice(m.price),
    })),
    /** False means the shop cannot take a card yet. */
    canPayOnline: stripeConfigured(),
    /** How this order may be paid; empty means it is an enquiry. */
    paymentMethods: availablePaymentMethods(),
  });
}
