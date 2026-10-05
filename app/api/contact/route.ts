import { NextResponse, after } from "next/server";
import { mailShopContact } from "@/lib/emails.server";
import { createContactMessage } from "@/lib/contact";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENTS_BYTES,
  isAllowedAttachment,
} from "@/lib/contact-attachments";

export const runtime = "nodejs";

const MAX = { name: 120, email: 200, subject: 200, message: 5000 };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type Upload = { filename: string; contentType: string; content: Buffer };

// The contact form posts multipart/form-data when the visitor attached files
// (logos, photos of the wall, drawings — lib/contact-attachments.ts), and JSON
// otherwise; both are accepted.
export async function POST(req: Request) {
  const isMultipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data");

  let fields: Record<string, unknown> = {};
  const files: Upload[] = [];

  if (isMultipart) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    for (const key of ["name", "email", "subject", "message", "website"]) fields[key] = form.get(key);

    const uploads = form
      .getAll("files")
      .filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && f.size > 0);
    if (uploads.length > MAX_ATTACHMENTS) {
      return NextResponse.json({ error: "too_many_files" }, { status: 400 });
    }
    let total = 0;
    for (const f of uploads) {
      // The name is what the type is judged by; a browser's MIME guess for
      // .cdr or .dwg is often empty, so it is not trusted for that.
      const filename = (f.name || "priloha").replace(/[\r\n"\\/]/g, "_").slice(0, 150);
      if (!isAllowedAttachment(filename)) {
        return NextResponse.json({ error: "file_type", file: filename }, { status: 400 });
      }
      total += f.size;
      if (total > MAX_ATTACHMENTS_BYTES) {
        return NextResponse.json({ error: "files_too_big" }, { status: 413 });
      }
      files.push({
        filename,
        contentType: f.type || "application/octet-stream",
        content: Buffer.from(await f.arrayBuffer()),
      });
    }
  } else {
    fields = (await req.json().catch(() => null)) ?? {};
  }

  // Honeypot: a field hidden from people but happily filled by bots. Answer
  // 200 so the bot believes it succeeded and doesn't retry, but store nothing.
  if (clean(fields.website, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(fields.name, MAX.name);
  const email = clean(fields.email, MAX.email);
  const subject = clean(fields.subject, MAX.subject);
  const message = clean(fields.message, MAX.message);

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await createContactMessage({ name, email, subject, message, attachments: files });
  } catch {
    // Don't leak database detail to the browser; the form shows a retry hint.
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Saved first, e-mailed after: the message — and its files — are never lost
  // to a mail problem; the admin lists both.
  after(() => mailShopContact({ name, email, subject, message, files }));

  return NextResponse.json({ ok: true });
}
