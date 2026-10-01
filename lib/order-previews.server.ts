import "server-only";

import { getDb } from "@/lib/db";

// The picture of each ordered sign (lib/sign-preview.ts): a watermarked JPEG
// of the 3D preview, sent with the order. Kept in its own table so the order
// list never drags images along; served by app/api/orders/[id]/preview and
// attached to the confirmation e-mail.

const PREFIX = "data:image/jpeg;base64,";
/** Generous for a 1200 px JPEG; anything bigger is not one of ours. */
const MAX_BASE64 = 900_000;

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS order_previews (
          order_id   BIGINT PRIMARY KEY,
          image      TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

/** The base64 body of a picture the browser sent, or null if it is not a sane JPEG data URL. */
export function readPreview(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith(PREFIX)) return null;
  const b64 = raw.slice(PREFIX.length);
  if (b64.length < 100 || b64.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
  return b64;
}

export async function savePreview(orderId: number, base64: string): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO order_previews (order_id, image) VALUES (${orderId}, ${base64})
    ON CONFLICT (order_id) DO UPDATE SET image = EXCLUDED.image
  `;
}

export async function getPreview(orderId: number): Promise<Buffer | null> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`SELECT image FROM order_previews WHERE order_id = ${orderId}`) as { image: string }[];
  return rows[0] ? Buffer.from(rows[0].image, "base64") : null;
}

/** Which of these orders have a picture. */
export async function previewIds(orderIds: number[]): Promise<Set<number>> {
  if (orderIds.length === 0) return new Set();
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT order_id FROM order_previews WHERE order_id = ANY(${orderIds})
  `) as { order_id: string | number }[];
  return new Set(rows.map((r) => Number(r.order_id)));
}
