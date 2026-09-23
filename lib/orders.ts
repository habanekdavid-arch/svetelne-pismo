import { getDb } from "@/lib/db";
import type { Config } from "@/lib/types";
import { INSTALLATION_METHOD, isPaymentMethod, type PaymentMethodId } from "@/lib/payment-methods";

export type OrderStatus = "new" | "in_progress" | "done" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new:         "Nová",
  in_progress: "V spracovaní",
  done:        "Hotovo",
  cancelled:   "Zrušená",
};

export const ORDER_STATUSES: OrderStatus[] = ["new", "in_progress", "done", "cancelled"];

/** "1 objednávka" / "3 objednávky" / "7 objednávok" — Slovak counts three ways. */
export function orderCountLabel(count: number): string {
  const word = count === 1 ? "objednávka" : count >= 2 && count <= 4 ? "objednávky" : "objednávok";
  return `${count} ${word}`;
}

export type Order = {
  id: number;
  userId: string;
  customerName: string;
  customerEmail: string;
  config: Config;
  price: number;
  /** Cents, when the order went through checkout; null for older rows. */
  priceCents: number | null;
  /** The checkout this sign belonged to; null for older rows. */
  groupId: string | null;
  status: OrderStatus;
  createdAt: string;
};

// The neon() tagged-template call resolves to a union type TS can't index
// or .map() without help — cast each query result to this shape (every
// column above is a plain scalar or jsonb, never array-mode/raw results).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mapRow(row: Row): Order {
  return {
    id: Number(row.id),
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    // Neon's HTTP driver already parses jsonb into an object, but guard
    // against a raw string just in case (e.g. a future driver/version change).
    config: typeof row.config === "string" ? JSON.parse(row.config) : row.config,
    price: Number(row.price),
    priceCents: row.price_cents == null ? null : Number(row.price_cents),
    groupId: row.group_id ?? null,
    status: row.status as OrderStatus,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createOrder(input: {
  userId: string;
  customerName: string;
  customerEmail: string;
  config: Config;
  price: number;
  /** Cents — the exact figure this sign contributes to what is charged. */
  priceCents?: number;
  /** The checkout this sign was part of, if it came through one. */
  groupId?: string | null;
}): Promise<Order> {
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO orders (
      user_id, customer_name, customer_email, config, price, price_cents, group_id
    )
    VALUES (
      ${input.userId},
      ${input.customerName},
      ${input.customerEmail},
      ${JSON.stringify(input.config)}::jsonb,
      ${input.price},
      ${input.priceCents ?? input.price * 100},
      ${input.groupId ?? null}
    )
    RETURNING *
  `) as Row[];
  return mapRow(rows[0]);
}

export async function listOrdersForUser(userId: string): Promise<Order[]> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC
  `) as Row[];
  return rows.map(mapRow);
}

export async function listAllOrders(): Promise<Order[]> {
  const sql = await getDb();
  const rows = (await sql`SELECT * FROM orders ORDER BY created_at DESC`) as Row[];
  return rows.map(mapRow);
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  const sql = await getDb();
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

// ── Order groups ─────────────────────────────────────────────────────────────
// One checkout: the signs (rows in `orders`), how they get delivered, and what
// was charged for them. Everything about money and shipping lives here, never
// on the individual sign, because a basket of three signs is still one
// payment and one packet.

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid:   "Nezaplatené",
  pending:  "Čaká na platbu",
  paid:     "Zaplatené",
  failed:   "Platba zlyhala",
  refunded: "Vrátené",
};

/** A pick-up point as the Packeta widget hands it back. */
export type DeliveryPoint = {
  /** Branch ID for Packeta's own points, carrier's code for external ones. */
  id: string;
  name: string;
  place?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  /** Set for an external carrier's point — it goes in a different field. */
  carrierId?: string | null;
  carrierPickupPoint?: string | null;
};

export type DeliveryAddress = {
  street: string;
  houseNumber: string;
  city: string;
  zip: string;
  /** ISO 3166-1 alpha-2, lower case. */
  country: string;
};

export type OrderGroup = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryMethod: string;
  deliveryPoint: DeliveryPoint | null;
  deliveryAddress: DeliveryAddress | null;
  itemsCents: number;
  deliveryCents: number;
  totalCents: number;
  currency: string;
  paymentStatus: PaymentStatus;
  /** Card or transfer; null when nothing is paid at checkout (enquiry, consultation). */
  paymentMethod: PaymentMethodId | null;
  /** When the shop sent its quote for an installation order; null until then. */
  quoteSentAt: string | null;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  packetaPacketId: string | null;
  packetaBarcode: string | null;
  packetaError: string | null;
  createdAt: string;
};

function json<T>(value: unknown): T | null {
  if (value == null) return null;
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function mapGroup(row: Row): OrderGroup {
  return {
    id: row.id,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone ?? null,
    deliveryMethod: row.delivery_method,
    deliveryPoint: json<DeliveryPoint>(row.delivery_point),
    deliveryAddress: json<DeliveryAddress>(row.delivery_address),
    itemsCents: Number(row.items_cents),
    deliveryCents: Number(row.delivery_cents),
    totalCents: Number(row.total_cents),
    currency: row.currency,
    paymentStatus: row.payment_status as PaymentStatus,
    paymentMethod: isPaymentMethod(row.payment_method) ? row.payment_method : null,
    quoteSentAt: row.quote_sent_at ? new Date(row.quote_sent_at).toISOString() : null,
    stripeSessionId: row.stripe_session_id ?? null,
    stripePaymentIntent: row.stripe_payment_intent ?? null,
    packetaPacketId: row.packeta_packet_id ?? null,
    packetaBarcode: row.packeta_barcode ?? null,
    packetaError: row.packeta_error ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function createOrderGroup(input: {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  deliveryMethod: string;
  deliveryPoint?: DeliveryPoint | null;
  deliveryAddress?: DeliveryAddress | null;
  itemsCents: number;
  deliveryCents: number;
  paymentMethod?: PaymentMethodId | null;
}): Promise<OrderGroup> {
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO order_groups (
      id, user_id, customer_name, customer_email, customer_phone,
      delivery_method, delivery_point, delivery_address,
      items_cents, delivery_cents, total_cents, payment_method
    ) VALUES (
      ${input.id},
      ${input.userId},
      ${input.customerName},
      ${input.customerEmail},
      ${input.customerPhone ?? null},
      ${input.deliveryMethod},
      ${input.deliveryPoint ? JSON.stringify(input.deliveryPoint) : null}::jsonb,
      ${input.deliveryAddress ? JSON.stringify(input.deliveryAddress) : null}::jsonb,
      ${input.itemsCents},
      ${input.deliveryCents},
      ${input.itemsCents + input.deliveryCents},
      ${input.paymentMethod ?? null}
    )
    RETURNING *
  `) as Row[];
  return mapGroup(rows[0]);
}

export async function getOrderGroup(id: string): Promise<OrderGroup | null> {
  const sql = await getDb();
  const rows = (await sql`SELECT * FROM order_groups WHERE id = ${id}`) as Row[];
  return rows[0] ? mapGroup(rows[0]) : null;
}

export async function getOrderGroupByStripeSession(
  sessionId: string,
): Promise<OrderGroup | null> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT * FROM order_groups WHERE stripe_session_id = ${sessionId}
  `) as Row[];
  return rows[0] ? mapGroup(rows[0]) : null;
}

/** Remembers which Stripe session is paying for this order, and that it is in flight. */
export async function attachStripeSession(groupId: string, sessionId: string): Promise<void> {
  const sql = await getDb();
  await sql`
    UPDATE order_groups
    SET stripe_session_id = ${sessionId}, payment_status = 'pending'
    WHERE id = ${groupId}
  `;
}

/**
 * Marks the order paid — only ever called from the verified Stripe webhook.
 * Returns true when this call is what changed it, so the caller can do the
 * once-only work (create the packet, send the e-mail) exactly once however
 * many times Stripe retries the event.
 */
export async function markGroupPaid(
  groupId: string,
  paymentIntent: string | null,
): Promise<boolean> {
  const sql = await getDb();
  const rows = (await sql`
    UPDATE order_groups
    SET payment_status = 'paid', stripe_payment_intent = ${paymentIntent}
    WHERE id = ${groupId} AND payment_status <> 'paid'
    RETURNING id
  `) as Row[];
  return rows.length > 0;
}

export async function setGroupPaymentStatus(
  groupId: string,
  status: PaymentStatus,
): Promise<void> {
  const sql = await getDb();
  await sql`UPDATE order_groups SET payment_status = ${status} WHERE id = ${groupId}`;
}

export async function attachPacket(
  groupId: string,
  packet: { id: string; barcode: string },
): Promise<void> {
  const sql = await getDb();
  await sql`
    UPDATE order_groups
    SET packeta_packet_id = ${packet.id},
        packeta_barcode = ${packet.barcode},
        packeta_error = NULL
    WHERE id = ${groupId}
  `;
}

/** Keeps why a packet could not be created, so it shows up in the admin. */
export async function recordPacketError(groupId: string, message: string): Promise<void> {
  const sql = await getDb();
  await sql`
    UPDATE order_groups SET packeta_error = ${message.slice(0, 500)} WHERE id = ${groupId}
  `;
}

export async function listOrdersForGroup(groupId: string): Promise<Order[]> {
  const sql = await getDb();
  const rows = (await sql`
    SELECT * FROM orders WHERE group_id = ${groupId} ORDER BY id ASC
  `) as Row[];
  return rows.map(mapRow);
}

/** The groups behind a set of orders, for the admin and the account pages. */
export async function listGroupsByIds(ids: string[]): Promise<Map<string, OrderGroup>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const sql = await getDb();
  try {
    const rows = (await sql`
      SELECT * FROM order_groups WHERE id = ANY(${unique})
    `) as Row[];
    return new Map(rows.map((r) => [r.id as string, mapGroup(r)]));
  } catch (err) {
    // This only decorates the admin list with delivery and payment. Losing it
    // is a missing panel; taking the whole page down with it would be worse.
    console.error("[objednávky] skupiny sa nepodarilo načítať:", err);
    return new Map();
  }
}

// ── Installation orders: quote first, payment after ─────────────────────────
// An installation order is placed without paying anything. The shop prices
// the mounting, sends the quote — a pre-invoice with the signs and the
// mounting — and only then is there something to pay.

export type QuoteState = "requested" | "sent" | "paid";

/** Where an installation order stands; null for an ordinary order. */
export function quoteState(group: Pick<OrderGroup, "deliveryMethod" | "quoteSentAt" | "paymentStatus">): QuoteState | null {
  if (group.deliveryMethod !== INSTALLATION_METHOD) return null;
  if (group.paymentStatus === "paid") return "paid";
  return group.quoteSentAt ? "sent" : "requested";
}

export const QUOTE_STATE_LABEL: Record<QuoteState, string> = {
  requested: "Čaká na cenovú ponuku",
  sent:      "Cenová ponuka pripravená",
  paid:      "Zaplatené",
};

/**
 * Sends the quote: the mounting price goes in beside the signs, the total is
 * what is now owed, and the order waits for payment. Refused once paid, so a
 * paid order's amount can never change under it.
 */
export async function sendInstallationQuote(
  groupId: string,
  installationCents: number,
  paymentMethod: PaymentMethodId | null,
): Promise<boolean> {
  const sql = await getDb();
  const rows = (await sql`
    UPDATE order_groups
    SET delivery_cents = ${installationCents},
        total_cents = items_cents + ${installationCents},
        payment_method = ${paymentMethod},
        quote_sent_at = now()
    WHERE id = ${groupId}
      AND delivery_method = ${INSTALLATION_METHOD}
      AND payment_status <> 'paid'
    RETURNING id
  `) as Row[];
  return rows.length > 0;
}
