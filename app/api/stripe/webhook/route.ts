import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, webhookSecret } from "@/lib/stripe";
import { getOrderGroup, markGroupPaid, setGroupPaymentStatus } from "@/lib/orders";
import { afterPaid } from "@/lib/fulfilment.server";

// Stripe's own report of what happened to a payment.
//
// This — not the browser coming back to the success page — is what marks an
// order paid. The customer can close the tab, the redirect can be lost, and a
// success URL can be typed by hand; a signed webhook can be none of those
// things.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const client = stripe();
  const secret = webhookSecret();
  if (!client || !secret) {
    return NextResponse.json({ error: "payments_disabled" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // The signature covers the bytes exactly as sent — the body must be read raw,
  // never parsed and re-serialised.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await client.webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    // An unverifiable event is not from Stripe. 400 tells Stripe not to retry.
    console.error("[stripe] podpis webhooku neplatný:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        // A completed session is not always a paid one: bank transfer methods
        // complete first and pay later.
        if (session.payment_status === "paid") {
          await onPaid(session);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const groupId = groupIdOf(session);
        if (groupId) {
          const group = await getOrderGroup(groupId);
          // Never walk back an order that is already paid.
          if (group && group.paymentStatus !== "paid") {
            await setGroupPaymentStatus(groupId, "failed");
          }
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const groupId = typeof charge.metadata?.orderGroupId === "string"
          ? charge.metadata.orderGroupId
          : null;
        if (groupId) await setGroupPaymentStatus(groupId, "refunded");
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Anything that fails here is worth a retry from Stripe — except that a
    // paid order has already been recorded as paid, and markGroupPaid() only
    // does its once-only work once, so a retry is safe.
    console.error(`[stripe] spracovanie ${event.type} zlyhalo:`, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function groupIdOf(session: Stripe.Checkout.Session): string | null {
  const fromMetadata = session.metadata?.orderGroupId;
  if (typeof fromMetadata === "string" && fromMetadata) return fromMetadata;
  return session.client_reference_id || null;
}

async function onPaid(session: Stripe.Checkout.Session): Promise<void> {
  const groupId = groupIdOf(session);
  if (!groupId) {
    console.error("[stripe] zaplatená session bez čísla objednávky:", session.id);
    return;
  }

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // False means this event is a retry of one already handled — the order is
  // paid, the packet exists, there is nothing left to do.
  const firstTime = await markGroupPaid(groupId, paymentIntent);
  if (!firstTime) return;

  const group = await getOrderGroup(groupId);
  if (group) await afterPaid({ ...group, paymentStatus: "paid" });
}
