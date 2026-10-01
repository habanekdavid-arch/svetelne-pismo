import { getDb } from "@/lib/db";

// The last event Stripe delivered to the webhook — kept so the admin's
// Stripe test can say whether the webhook really reaches the shop (and in
// which mode), instead of only whether its secret is filled in. One row.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS stripe_webhook_log (
          id INTEGER PRIMARY KEY DEFAULT 1,
          event_type TEXT NOT NULL,
          livemode BOOLEAN NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return tableReady;
}

export async function recordWebhookEvent(type: string, livemode: boolean): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO stripe_webhook_log (id, event_type, livemode, received_at)
    VALUES (1, ${type}, ${livemode}, now())
    ON CONFLICT (id) DO UPDATE SET
      event_type = EXCLUDED.event_type, livemode = EXCLUDED.livemode, received_at = now()
  `;
}

export async function lastWebhookEvent(): Promise<{ type: string; livemode: boolean; at: string } | null> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`SELECT * FROM stripe_webhook_log WHERE id = 1`) as Row[];
  const r = rows[0];
  return r ? { type: r.event_type, livemode: !!r.livemode, at: new Date(r.received_at).toISOString() } : null;
}
