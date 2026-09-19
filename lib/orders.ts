import { getDb } from "@/lib/db";
import type { Config } from "@/lib/types";

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
}): Promise<Order> {
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO orders (user_id, customer_name, customer_email, config, price)
    VALUES (
      ${input.userId},
      ${input.customerName},
      ${input.customerEmail},
      ${JSON.stringify(input.config)}::jsonb,
      ${input.price}
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
