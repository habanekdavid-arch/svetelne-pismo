// Neon Postgres client — lazily created (see the vercel-storage skill's
// build-time-safety note: calling neon() at module scope would throw during
// `next build`, before DATABASE_URL is available as an env var).

import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

// Runs once per warm serverless instance — cheap, idempotent
// CREATE TABLE/INDEX IF NOT EXISTS, no separate migration tooling needed for
// a schema this small.
let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getSql();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS orders (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          config JSONB NOT NULL,
          price INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      // One-time migration for installs created back when this column was
      // named clerk_user_id (pre-Prisma-accounts). No-ops on a fresh table.
      try {
        await sql`ALTER TABLE orders RENAME COLUMN clerk_user_id TO user_id`;
      } catch (err) {
        if (!(err instanceof Error) || !/does not exist/i.test(err.message)) throw err;
      }

      await sql`
        CREATE INDEX IF NOT EXISTS orders_user_id_idx
        ON orders (user_id)
      `;
      await sql`DROP INDEX IF EXISTS orders_clerk_user_id_idx`;

      // One checkout = one order_groups row + one orders row per sign. The
      // group is what gets paid for and what gets shipped: a basket of three
      // signs is one Stripe payment and one Packeta packet, not three.
      await sql`
        CREATE TABLE IF NOT EXISTS order_groups (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          customer_phone TEXT,

          -- Delivery. delivery_point is the pick-up point the customer chose
          -- in the Packeta widget, delivery_address the postal address for
          -- courier delivery; exactly one of them is set, or neither for
          -- collection in person.
          delivery_method TEXT NOT NULL DEFAULT 'personal',
          delivery_point JSONB,
          delivery_address JSONB,

          -- Money, in whole cents, so nothing is ever re-derived from a
          -- rounded euro figure. items_cents + delivery_cents = total_cents,
          -- and total_cents is exactly what Stripe is asked to charge.
          items_cents INTEGER NOT NULL DEFAULT 0,
          delivery_cents INTEGER NOT NULL DEFAULT 0,
          total_cents INTEGER NOT NULL DEFAULT 0,
          currency TEXT NOT NULL DEFAULT 'EUR',

          -- Payment. 'unpaid' until a Stripe session is opened, 'pending'
          -- while the customer is on Stripe, 'paid' only from the webhook.
          payment_status TEXT NOT NULL DEFAULT 'unpaid',
          stripe_session_id TEXT,
          stripe_payment_intent TEXT,

          -- Packeta, filled in once the packet is created for a paid order.
          packeta_packet_id TEXT,
          packeta_barcode TEXT,
          packeta_error TEXT,

          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS order_groups_user_id_idx
        ON order_groups (user_id)
      `;
      // The webhook finds the order by the Stripe session it was opened with.
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS order_groups_stripe_session_idx
        ON order_groups (stripe_session_id)
        WHERE stripe_session_id IS NOT NULL
      `;

      // Ties each sign to the checkout it was part of. Nullable: orders
      // placed before checkout existed have no group and must keep working.
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS group_id TEXT`;
      // The per-sign price in cents, beside the historical whole-euro column.
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_cents INTEGER`;
      // How the customer chose to pay — 'card' or 'transfer' — or NULL for an
      // enquiry and an installation consultation, where nothing is paid yet.
      await sql`ALTER TABLE order_groups ADD COLUMN IF NOT EXISTS payment_method TEXT`;
      await sql`
        CREATE INDEX IF NOT EXISTS orders_group_id_idx
        ON orders (group_id)
      `;
    })();
  }
  return schemaReady;
}

export async function getDb() {
  await ensureSchema();
  return getSql();
}
