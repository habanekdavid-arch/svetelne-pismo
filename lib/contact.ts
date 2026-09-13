import { getDb } from "@/lib/db";

// Messages from the contact form on the home page.
//
// Stored rather than e-mailed: the project has no mail dependency and no SMTP
// credentials, so a "send" would silently fail in production. A row in the
// database always lands, and the message can be read back later.
//
// The table is created the same way orders' is — a cheap, idempotent
// CREATE TABLE IF NOT EXISTS on first use (see lib/db.ts), so this needs no
// migration step before it works on a fresh deploy.

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return tableReady;
}

export async function createContactMessage(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (${input.name}, ${input.email}, ${input.subject}, ${input.message})
  `;
}

export async function listContactMessages(limit = 100): Promise<ContactMessage[]> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT id, name, email, subject, message, created_at
    FROM contact_messages
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Row[];

  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}
