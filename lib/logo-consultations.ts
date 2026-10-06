import { getDb } from "@/lib/db";
import type { Config } from "@/lib/types";

// Requests for a consultation about a sign made from the customer's logo.
//
// A logo is never ordered and paid for straight from the configurator: every
// logo is different, and whether it can be made as configured — the smallest
// details, the thinnest strokes, how it is lit — is talked through first. So
// the configurator's last step for a logo is this request: the logo file, the
// sign as configured, the price the configurator showed (as a guide only) and
// how to reach the customer. The shop answers with an offer.
//
// Stored first, e-mailed after (app/api/logo-consultation), and created on
// first use like every other table here (lib/db.ts).

export type LogoConsultation = {
  id: number;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  config: Config;
  widthMm: number;
  heightMm: number;
  /** The configurator's price with VAT, in cents — a guide, not an offer. */
  priceCents: number | null;
  /** Made as a light box: the whole picture, its coloured background included. */
  lightBox: boolean;
  /** The face printed with the logo's own artwork. */
  facePrint: boolean;
  logoFilename: string;
  logoSize: number;
  hasPreview: boolean;
};

export type LogoFile = { filename: string; contentType: string; content: Buffer };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      // The logo and the preview as base64 text, like the contact form's
      // files: the request caps them at a few MB, and the HTTP driver passes
      // text through unchanged.
      await sql`
        CREATE TABLE IF NOT EXISTS logo_consultations (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          config JSONB NOT NULL,
          width_mm INTEGER NOT NULL,
          height_mm INTEGER NOT NULL,
          price_cents INTEGER,
          logo_filename TEXT NOT NULL,
          logo_content_type TEXT NOT NULL,
          logo_size INTEGER NOT NULL,
          logo_b64 TEXT NOT NULL,
          preview_b64 TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      // Added after the table first went live — idempotent on every start.
      await sql`ALTER TABLE logo_consultations ADD COLUMN IF NOT EXISTS light_box BOOLEAN NOT NULL DEFAULT false`;
      await sql`ALTER TABLE logo_consultations ADD COLUMN IF NOT EXISTS face_print BOOLEAN NOT NULL DEFAULT false`;
    })();
  }
  return tableReady;
}

export async function createLogoConsultation(input: {
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  note: string;
  config: Config;
  widthMm: number;
  heightMm: number;
  priceCents: number | null;
  lightBox: boolean;
  facePrint: boolean;
  logo: LogoFile;
  /** The watermarked preview, base64 JPEG. */
  preview: string | null;
}): Promise<number> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    INSERT INTO logo_consultations
      (user_id, name, email, phone, note, config, width_mm, height_mm, price_cents, light_box, face_print,
       logo_filename, logo_content_type, logo_size, logo_b64, preview_b64)
    VALUES
      (${input.userId}, ${input.name}, ${input.email}, ${input.phone}, ${input.note},
       ${JSON.stringify(input.config)}, ${Math.round(input.widthMm)}, ${Math.round(input.heightMm)}, ${input.priceCents},
       ${input.lightBox}, ${input.facePrint},
       ${input.logo.filename}, ${input.logo.contentType}, ${input.logo.content.length},
       ${input.logo.content.toString("base64")}, ${input.preview})
    RETURNING id
  `) as Row[];
  return Number(rows[0].id);
}

export async function listLogoConsultations(limit = 50): Promise<LogoConsultation[]> {
  await ensureTable();
  const sql = await getDb();
  // Everything but the files themselves — those are fetched on download.
  const rows = (await sql`
    SELECT id, created_at, name, email, phone, note, config, width_mm, height_mm, price_cents,
           light_box, face_print, logo_filename, logo_size, (preview_b64 IS NOT NULL) AS has_preview
    FROM logo_consultations
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Row[];
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: new Date(r.created_at).toISOString(),
    name: r.name,
    email: r.email,
    phone: r.phone,
    note: r.note,
    config: (typeof r.config === "string" ? JSON.parse(r.config) : r.config) as Config,
    widthMm: Number(r.width_mm),
    heightMm: Number(r.height_mm),
    priceCents: r.price_cents === null ? null : Number(r.price_cents),
    lightBox: Boolean(r.light_box),
    facePrint: Boolean(r.face_print),
    logoFilename: r.logo_filename,
    logoSize: Number(r.logo_size),
    hasPreview: Boolean(r.has_preview),
  }));
}

/** The logo file, or the preview picture, of one request — for the admin's download. */
export async function getLogoConsultationFile(id: number, which: "logo" | "preview"): Promise<LogoFile | null> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT logo_filename, logo_content_type, logo_b64, preview_b64 FROM logo_consultations WHERE id = ${id}
  `) as Row[];
  const r = rows[0];
  if (!r) return null;
  if (which === "preview") {
    return r.preview_b64
      ? { filename: `nahlad-logo-${id}.jpg`, contentType: "image/jpeg", content: Buffer.from(r.preview_b64, "base64") }
      : null;
  }
  return { filename: r.logo_filename, contentType: r.logo_content_type, content: Buffer.from(r.logo_b64, "base64") };
}
