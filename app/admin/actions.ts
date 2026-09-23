"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin-auth";
import {
  getOrderGroup,
  markGroupPaid,
  quoteState,
  sendInstallationQuote,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/orders";
import { createPacketFor } from "@/lib/fulfilment.server";
import { bankAccount } from "@/lib/bank";

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
  // A transfer, or an installation order whose quote has gone out and was
  // paid against it.
  if (!group || (group.paymentMethod !== "transfer" && quoteState(group) !== "sent")) return;
  const firstTime = await markGroupPaid(groupId, null);
  if (firstTime) await createPacketFor({ ...group, paymentStatus: "paid" });
  revalidatePath("/admin");
}

/**
 * Sends the quote for an installation order: the mounting price (€ incl. VAT)
 * goes in beside the signs, and the customer sees the pre-invoice — the total
 * and how to pay it — on their order page.
 */
export async function sendQuote(groupId: string, installationEur: number) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  if (!Number.isFinite(installationEur) || installationEur < 0 || installationEur > 100_000) {
    throw new Error("Neplatná cena montáže.");
  }
  const cents = Math.round(installationEur * 100);
  await sendInstallationQuote(groupId, cents, bankAccount() ? "transfer" : null);
  revalidatePath("/admin");
}
