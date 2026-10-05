import { getDb } from "@/lib/db";

// Messages from the contact form on the home page.
//
// Stored first, e-mailed after (app/api/contact): a row in the database always
// lands — attachments included — and the message can be read back in the
// admin even if the e-mail never went out.
//
// The table is created the same way orders' is — a cheap, idempotent
// CREATE TABLE IF NOT EXISTS on first use (see lib/db.ts), so this needs no
// migration step before it works on a fresh deploy.

export type ContactAttachmentInfo = {
  id: number;
  filename: string;
  contentType: string;
  size: number;
};

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  attachments: ContactAttachmentInfo[];
};

/** A file sent with a message — kept beside it, so it survives a mail outage. */
export type ContactAttachment = ContactAttachmentInfo & { content: Buffer };

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
      // Files sent with a message. Base64 text rather than bytea: it goes
      // through the HTTP driver unchanged, and the form caps them at 4 MB.
      await sql`
        CREATE TABLE IF NOT EXISTS contact_attachments (
          id BIGSERIAL PRIMARY KEY,
          message_id BIGINT NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          content_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          data_b64 TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS contact_attachments_message_idx
        ON contact_attachments (message_id)
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
  attachments?: { filename: string; contentType: string; content: Buffer }[];
}): Promise<number> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO contact_messages (name, email, subject, message)
    VALUES (${input.name}, ${input.email}, ${input.subject}, ${input.message})
    RETURNING id
  `) as Row[];
  const id = Number(rows[0].id);
  for (const a of input.attachments ?? []) {
    await sql`
      INSERT INTO contact_attachments (message_id, filename, content_type, size, data_b64)
      VALUES (${id}, ${a.filename}, ${a.contentType}, ${a.content.length}, ${a.content.toString("base64")})
    `;
  }
  return id;
}

/** One attachment with its bytes — for the admin's download link. */
export async function getContactAttachment(id: number): Promise<ContactAttachment | null> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT id, filename, content_type, size, data_b64 FROM contact_attachments WHERE id = ${id}
  `) as Row[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: Number(r.id),
    filename: r.filename,
    contentType: r.content_type,
    size: Number(r.size),
    content: Buffer.from(r.data_b64, "base64"),
  };
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

  // The files' names and sizes only — the bytes stay in the table until
  // someone clicks to download one.
  const ids = rows.map((r) => Number(r.id));
  const files = ids.length
    ? ((await sql`
        SELECT id, message_id, filename, content_type, size
        FROM contact_attachments
        WHERE message_id = ANY(${ids})
        ORDER BY id
      `) as Row[])
    : [];

  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    createdAt: new Date(r.created_at).toISOString(),
    attachments: files
      .filter((f) => Number(f.message_id) === Number(r.id))
      .map((f) => ({
        id: Number(f.id),
        filename: f.filename,
        contentType: f.content_type,
        size: Number(f.size),
      })),
  }));
}
