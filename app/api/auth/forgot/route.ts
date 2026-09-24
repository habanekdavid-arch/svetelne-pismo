import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailConfigured } from "@/lib/mailer.server";
import { mailPasswordReset } from "@/lib/emails.server";
import { createResetToken } from "@/lib/password-reset.server";
import { siteOrigin } from "@/lib/stripe";

// "Zabudnuté heslo": e-mails a one-hour link to set a new password. The answer
// is the same whether or not the address has an account, so the form cannot
// be used to find out who is a customer.

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!mailConfigured()) {
    return NextResponse.json({ error: "mail_disabled" }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = await createResetToken(user.id, user.passwordHash);
    await mailPasswordReset(user.email, `${siteOrigin()}/obnova-hesla?token=${encodeURIComponent(token)}`);
  }
  return NextResponse.json({ ok: true });
}
