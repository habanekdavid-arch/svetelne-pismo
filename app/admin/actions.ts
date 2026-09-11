"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";

// Re-checks the ADMIN_EMAILS allowlist inside the action itself — the
// page-level gate in app/admin/page.tsx keeps non-admins from ever seeing
// the UI, but a Server Action is its own callable endpoint, so it must not
// rely solely on that.
export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.primaryEmailAddress?.emailAddress)) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  await updateOrderStatus(orderId, status);
  revalidatePath("/admin");
}
