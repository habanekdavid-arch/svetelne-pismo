import { NextResponse, after } from "next/server";
import { mailShopContact } from "@/lib/emails.server";
import { createContactMessage } from "@/lib/contact";

const MAX = { name: 120, email: 200, subject: 200, message: 5000 };

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Honeypot: a field hidden from people but happily filled by bots. Answer
  // 200 so the bot believes it succeeded and doesn't retry, but store nothing.
  if (clean(body?.website, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body?.name, MAX.name);
  const email = clean(body?.email, MAX.email);
  const subject = clean(body?.subject, MAX.subject);
  const message = clean(body?.message, MAX.message);

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    await createContactMessage({ name, email, subject, message });
  } catch {
    // Don't leak database detail to the browser; the form shows a retry hint.
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  // Saved first, e-mailed after: the message is never lost to a mail problem.
  after(() => mailShopContact({ name, email, subject, message }));

  return NextResponse.json({ ok: true });
}
