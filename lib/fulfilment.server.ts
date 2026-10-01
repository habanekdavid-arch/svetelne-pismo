import "server-only";

import { listOrdersForGroup, type OrderGroup } from "@/lib/orders";
import { mailOrderPlaced, mailPaymentReceived, mailShopPaid, type Previews } from "@/lib/emails.server";
import { getPreview } from "@/lib/order-previews.server";

// What happens once an order is paid, however it was paid — by card (the
// Stripe webhook) or by transfer (confirmed in the admin).

/**
 * Everything that follows a payment, once: the customer hears it arrived and
 * the shop hears the order can go into production.
 * The DPD parcel, or the hand-over in person, is arranged by the workshop.
 * Called from the Stripe webhook and from the admin's "Platba prijatá".
 */
export async function afterPaid(group: OrderGroup): Promise<void> {
  const orders = await listOrdersForGroup(group.id);
  // A card order was not confirmed when it was placed (only once paid is it
  // an order), so its confirmation — signs, pictures, delivery — goes now.
  // A transfer was confirmed then; now it is told the money arrived.
  const toCustomer = group.paymentMethod === "card"
    ? previewsOf(orders.map((o) => o.id)).then((p) => mailOrderPlaced(group, orders, p))
    : mailPaymentReceived(group);
  await Promise.all([toCustomer, mailShopPaid(group, orders)]);
}

async function previewsOf(ids: number[]): Promise<Previews> {
  const map: Previews = new Map();
  for (const id of ids) {
    const buf = await getPreview(id).catch(() => null);
    if (buf) map.set(id, buf.toString("base64"));
  }
  return map;
}
