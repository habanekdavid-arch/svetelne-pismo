import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { attachStripeSession, getOrderGroup, listOrdersForGroup } from "@/lib/orders";
import { siteOrigin, stripe } from "@/lib/stripe";
import { materialById } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { formatDeliveryPrice } from "@/lib/shipping";

// Opens the Stripe Checkout Session for an order that has already been placed
// and priced (app/api/orders). The amount comes from the stored order, never
// from the request — by the time this runs the price has been decided.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = stripe();
  if (!client) {
    return NextResponse.json({ error: "payments_disabled" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const groupId = typeof body?.groupId === "string" ? body.groupId : null;
  if (!groupId) {
    return NextResponse.json({ error: "missing_group" }, { status: 400 });
  }

  const group = await getOrderGroup(groupId);
  // A customer may only pay for their own order, and only once.
  if (!group || group.userId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (group.paymentStatus === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }
  if (group.totalCents <= 0) {
    return NextResponse.json({ error: "nothing_to_pay" }, { status: 400 });
  }

  const orders = await listOrdersForGroup(groupId);
  const origin = siteOrigin();

  const lineItems = orders.map((order) => {
    const material = materialById(order.config.material);
    return {
      quantity: 1,
      price_data: {
        currency: group.currency.toLowerCase(),
        // Cents straight from the order row; price_cents is null only for
        // rows written before checkout existed, which never reach Stripe.
        unit_amount: order.priceCents ?? order.price * 100,
        product_data: {
          name: `${oneLine(order.config.text) || "Svetelný nápis"} — ${material.displayName}`,
          description:
            `${order.config.signType === "illuminated" ? "Svetelné" : "Nesvetelné"} · ` +
            `výška písmen ${order.config.height} mm`,
        },
      },
    };
  });

  if (group.deliveryCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: group.currency.toLowerCase(),
        unit_amount: group.deliveryCents,
        product_data: {
          name: "Doprava",
          description: formatDeliveryPrice(group.deliveryCents / 100),
        },
      },
    });
  }

  const checkout = await client.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: group.customerEmail,
    // The order id travels with the payment, so the webhook can find the order
    // again without trusting anything the browser sends back.
    client_reference_id: group.id,
    metadata: { orderGroupId: group.id },
    payment_intent_data: { metadata: { orderGroupId: group.id } },
    success_url: `${origin}/objednavka/${group.id}?stav=zaplatene`,
    cancel_url: `${origin}/objednavka/${group.id}?stav=zrusene`,
    locale: "sk",
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "stripe_no_url" }, { status: 502 });
  }

  await attachStripeSession(group.id, checkout.id);
  return NextResponse.json({ url: checkout.url });
}
