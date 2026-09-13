"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin-auth";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";

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
