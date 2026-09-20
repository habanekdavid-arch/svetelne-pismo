import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getUserSession } from "@/lib/user-auth";
import { createOrder, createOrderGroup, type DeliveryAddress, type DeliveryPoint } from "@/lib/orders";
import { deliveryCents, quoteBasket, resolveDelivery, sanitizeConfig } from "@/lib/quote.server";
import { stripeConfigured } from "@/lib/stripe";
import type { Config } from "@/lib/types";

// Placing an order. Called from the checkout once the customer is signed in
// (our own Prisma-backed session, lib/user-auth.ts), has chosen how the sign
// is to be delivered, and — where card payment is switched on — right before
// being sent to Stripe.
//
// Nothing about money or delivery is taken from the request: every sign is
// re-measured and re-priced here (lib/quote.server.ts), and the chosen
// delivery method is checked against what this consignment may actually be
// sent by. The request says WHAT was ordered; the server decides what it costs.

export const runtime = "nodejs";

const MAX_ITEMS = 20;

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  // Two shapes: `items` (a cart, one or more signs) or the original single
  // `config`. Both are accepted so an older client — or a page still posting
  // the single-sign body — keeps working.
  const rawItems: unknown[] = Array.isArray(body?.items)
    ? body.items
    : body?.config
      ? [body.config]
      : [];

  if (rawItems.length === 0) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }
  if (rawItems.length > MAX_ITEMS) {
    return NextResponse.json({ error: "too_many_items" }, { status: 400 });
  }

  const configs = rawItems
    .map((item) =>
      sanitizeConfig(
        item && typeof item === "object" && "config" in item
          ? (item as { config: unknown }).config
          : item,
      ),
    )
    .filter((c: Config | null): c is Config => c !== null);

  if (configs.length !== rawItems.length) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const email = (typeof body?.email === "string" && body.email.trim()) || session.email;
  const name = (typeof body?.name === "string" && body.name.trim()) || session.name || "Zákazník";
  const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 32) : null;

  const quote = await quoteBasket(configs);

  // ── Delivery ───────────────────────────────────────────────────────────────
  const methodId = typeof body?.delivery?.method === "string" ? body.delivery.method : "personal";
  const method = resolveDelivery(quote, methodId);
  if (!method) {
    // Either an unknown method, or one this consignment is too big or heavy
    // for. Say which, so the checkout can re-ask rather than fail silently.
    return NextResponse.json(
      { error: "delivery_not_available", available: quote.deliveryMethods.map((m) => m.id) },
      { status: 400 },
    );
  }

  const point = method.needsPoint ? readPoint(body?.delivery?.point) : null;
  if (method.needsPoint && !point) {
    return NextResponse.json({ error: "pickup_point_required" }, { status: 400 });
  }

  const address = method.needsAddress ? readAddress(body?.delivery?.address) : null;
  if (method.needsAddress && !address) {
    return NextResponse.json({ error: "address_required" }, { status: 400 });
  }

  // Packeta needs a phone number to notify the recipient; asking for it after
  // the money has moved is too late.
  if ((method.needsPoint || method.id === "packeta-home") && !phone) {
    return NextResponse.json({ error: "phone_required" }, { status: 400 });
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  const groupId = randomUUID();
  const group = await createOrderGroup({
    id: groupId,
    userId: session.userId,
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    deliveryMethod: method.id,
    deliveryPoint: point,
    deliveryAddress: address,
    itemsCents: quote.itemsCents,
    deliveryCents: deliveryCents(method),
  });

  const orders = [];
  for (const item of quote.items) {
    orders.push(
      await createOrder({
        userId: session.userId,
        customerName: name,
        customerEmail: email,
        config: item.config,
        price: item.price,
        priceCents: item.priceCents,
        groupId,
      }),
    );
  }

  return NextResponse.json({
    groupId,
    orders,
    // `order` stays in the response for any caller still reading the old field.
    order: orders[0],
    totalCents: group.totalCents,
    deliveryMethod: method.id,
    /** True when the next step is a redirect to Stripe. */
    payOnline: stripeConfigured() && group.totalCents > 0,
  });
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

/** The pick-up point as the Packeta widget handed it to the browser. */
function readPoint(raw: unknown): DeliveryPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const id = str(p.id, 64) ?? (typeof p.id === "number" ? String(p.id) : null);
  const name = str(p.name, 200);
  if (!id || !name) return null;
  return {
    id,
    name,
    place: str(p.place, 200),
    street: str(p.street, 200),
    city: str(p.city, 100),
    zip: str(p.zip, 20),
    country: str(p.country, 2),
    carrierId: str(p.carrierId, 32),
    carrierPickupPoint: str(p.carrierPickupPoint, 64) ?? str(p.carrierPickupPointId, 64),
  };
}

function readAddress(raw: unknown): DeliveryAddress | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const street = str(a.street, 64);
  const houseNumber = str(a.houseNumber, 16);
  const city = str(a.city, 64);
  const zip = str(a.zip, 16);
  if (!street || !houseNumber || !city || !zip) return null;
  return { street, houseNumber, city, zip, country: (str(a.country, 2) ?? "sk").toLowerCase() };
}
