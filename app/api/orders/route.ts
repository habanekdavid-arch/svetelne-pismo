import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createOrder } from "@/lib/orders";
import { calculatePrice } from "@/lib/pricing";
import type { Config } from "@/lib/types";

// Called from components/configurator/OrderModal.tsx once the customer is
// signed in (Clerk) and submits the order form.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const config = body?.config as Config | undefined;
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const user = await currentUser();
  const email =
    (typeof body?.email === "string" && body.email.trim()) ||
    user?.primaryEmailAddress?.emailAddress ||
    "";
  const name =
    (typeof body?.name === "string" && body.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Zákazník";

  if (!email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  // Never trust a client-submitted price — recompute it server-side from
  // the same pricing rules the configurator UI uses.
  const price = calculatePrice(config);

  const order = await createOrder({
    clerkUserId: userId,
    customerName: name,
    customerEmail: email,
    config,
    price,
  });

  return NextResponse.json({ order });
}
