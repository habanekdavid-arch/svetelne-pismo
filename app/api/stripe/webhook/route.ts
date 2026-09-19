import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, webhookSecret } from "@/lib/stripe";
import {
  attachPacket,
  getOrderGroup,
  listOrdersForGroup,
  markGroupPaid,
  recordPacketError,
  setGroupPaymentStatus,
  type OrderGroup,
} from "@/lib/orders";
import { createPacket, packetaConfigured, splitName, PacketaError } from "@/lib/packeta";
import { estimateParcel, totalParcel } from "@/lib/shipping";
import { measureSign } from "@/lib/sign-metrics.server";

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
  if (group) await createPacketFor(group);
}

/**
 * Hands the paid order to Packeta. A failure here must never fail the webhook:
 * the money has moved and the order is paid either way, so the reason is kept
 * on the order and the packet is created by hand from the admin.
 */
async function createPacketFor(group: OrderGroup): Promise<void> {
  if (!group.deliveryMethod.startsWith("packeta")) return;
  if (!packetaConfigured()) {
    await recordPacketError(group.id, "Packeta nie je nakonfigurovaná — zásielku vytvorte ručne.");
    return;
  }

  try {
    const orders = await listOrdersForGroup(group.id);
    // Measured from the font again rather than estimated: this weight goes on
    // the label Packeta prints.
    const parcel = totalParcel(
      await Promise.all(
        orders.map(async (o) =>
          estimateParcel(o.config, await measureSign(o.config.text, o.config.font, o.config.height)),
        ),
      ),
    );
    const { name, surname } = splitName(group.customerName);

    const packet = await createPacket({
      recipient: {
        // Packeta wants a short, unique order number of our own — the first
        // block of the order's uuid is both.
        number: group.id.split("-")[0],
        name,
        surname,
        email: group.customerEmail,
        phone: group.customerPhone,
      },
      // Insured for what was paid, not for what it cost us to make.
      value: group.totalCents / 100,
      currency: group.currency,
      weightKg: parcel.weightKg,
      point: group.deliveryPoint,
      address: group.deliveryAddress,
      note: `Objednávka ${group.id.split("-")[0]}`,
    });

    await attachPacket(group.id, { id: packet.id, barcode: packet.barcode });
  } catch (err) {
    const message = err instanceof PacketaError ? err.message : String(err);
    console.error(`[packeta] zásielka pre ${group.id} zlyhala:`, message);
    await recordPacketError(group.id, message);
  }
}
