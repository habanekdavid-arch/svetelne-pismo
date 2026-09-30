import "server-only";

import { listOrdersForGroup, type OrderGroup } from "@/lib/orders";
import { mailPaymentReceived, mailShopPaid } from "@/lib/emails.server";

// What happens once an order is paid, however it was paid — by card (the
// Stripe webhook) or by transfer (confirmed in the admin).

/**
 * Everything that follows a payment, once: the customer hears it arrived and
 * the shop hears the order can go into production.
 * The DPD parcel, or the hand-over in person, is arranged by the workshop.
 * Called from the Stripe webhook and from the admin's "Platba prijatá".
 */
export async function afterPaid(group: OrderGroup): Promise<void> {
  await Promise.all([
    mailPaymentReceived(group),
    listOrdersForGroup(group.id).then((orders) => mailShopPaid(group, orders)),
  ]);
}
