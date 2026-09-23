"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin-auth";
import { getOrderGroup, markGroupPaid, updateOrderStatus, type OrderStatus } from "@/lib/orders";
import { createPacketFor } from "@/lib/fulfilment.server";

// Re-checks the admin session inside the action itself — a Server Action is
// its own callable endpoint, so it must not rely solely on the page-level
// gate in app/admin/page.tsx.
export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  await updateOrderStatus(orderId, status);
  revalidatePath("/admin");
}

/**
 * A bank transfer has arrived. The same once-only step a card payment takes in
 * the Stripe webhook: the order is marked paid and handed to Packeta.
 */
export async function confirmTransferPaid(groupId: string) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  const group = await getOrderGroup(groupId);
  if (!group || group.paymentMethod !== "transfer") return;
  const firstTime = await markGroupPaid(groupId, null);
  if (firstTime) await createPacketFor({ ...group, paymentStatus: "paid" });
  revalidatePath("/admin");
}
