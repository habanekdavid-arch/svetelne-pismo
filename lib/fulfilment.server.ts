import "server-only";

import type { OrderGroup } from "@/lib/orders";
import { mailPaymentReceived } from "@/lib/emails.server";

// What happens once an order is paid, however it was paid — by card (the
// Stripe webhook) or by transfer (confirmed in the admin).

/**
 * Everything that follows a payment, once: the customer hears it arrived.
 * The DPD parcel, or the hand-over in person, is arranged by the workshop.
 * Called from the Stripe webhook and from the admin's "Platba prijatá".
 */
export async function afterPaid(group: OrderGroup): Promise<void> {
  await mailPaymentReceived(group);
}
