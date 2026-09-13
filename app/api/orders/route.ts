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

  // Two shapes: `items` (a cart, one or more signs) or the original single
  // `config`. Both are accepted so an older client — or a page still posting
  // the single-sign body — keeps working.
  const raw: unknown = Array.isArray(body?.items) ? body.items : body?.config;
  const configs: Config[] = (Array.isArray(raw) ? raw : [raw]).filter(
    (c): c is Config => !!c && typeof c === "object",
  );

  if (configs.length === 0) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  // Bound the batch so one request can't be used to bulk-insert.
  const MAX_ITEMS = 20;
  if (configs.length > MAX_ITEMS) {
    return NextResponse.json({ error: "too_many_items" }, { status: 400 });
  }

  const email = (typeof body?.email === "string" && body.email.trim()) || session.email;
  const name = (typeof body?.name === "string" && body.name.trim()) || session.name || "Zákazník";

  // Never trust a client-submitted price — recompute every item server-side
  // from the same pricing rules the configurator UI uses.
  const orders = [];
  for (const config of configs) {
    orders.push(
      await createOrder({
        userId: session.userId,
        customerName: name,
        customerEmail: email,
        config,
        price: calculatePrice(config),
      }),
    );
  }

  // `order` stays in the response for any caller still reading the old field.
  return NextResponse.json({ orders, order: orders[0] });
}
