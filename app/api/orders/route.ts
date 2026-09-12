import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { createOrder } from "@/lib/orders";
import { calculatePrice } from "@/lib/pricing";
import type { Config } from "@/lib/types";

// Called from components/configurator/OrderModal.tsx once the customer is
// signed in (our own Prisma-backed session, see lib/user-auth.ts) and
// submits the order form.
export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const config = body?.config as Config | undefined;
  if (!config || typeof config !== "object") {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const email = (typeof body?.email === "string" && body.email.trim()) || session.email;
  const name = (typeof body?.name === "string" && body.name.trim()) || session.name || "Zákazník";

  // Never trust a client-submitted price — recompute it server-side from
  // the same pricing rules the configurator UI uses.
  const price = calculatePrice(config);

  const order = await createOrder({
    userId: session.userId,
    customerName: name,
    customerEmail: email,
    config,
    price,
  });

  return NextResponse.json({ order });
}
