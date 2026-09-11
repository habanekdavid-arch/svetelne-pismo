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
          clerk_user_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          config JSONB NOT NULL,
          price INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS orders_clerk_user_id_idx
        ON orders (clerk_user_id)
      `;
    })();
  }
  return schemaReady;
}

export async function getDb() {
  await ensureSchema();
  return getSql();
}
