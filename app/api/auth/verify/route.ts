import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { markVerified, readVerifyToken, isVerified, sendVerification } from "@/lib/email-verification.server";
import { mailConfigured } from "@/lib/mailer.server";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

// GET — the link from the e-mail. Confirms the address and sends the
// customer back to the site with a note that it worked (or that the link
// was no good).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await readVerifyToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(`${siteOrigin()}/?overenie=neplatne`);
  }
  await markVerified(userId);
  return NextResponse.redirect(`${siteOrigin()}/?overenie=ok`);
}

// POST — "Poslať overovací e-mail znova", for the signed-in customer.
export async function POST() {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await isVerified(session.userId)) return NextResponse.json({ ok: true, verified: true });
  if (!mailConfigured()) return NextResponse.json({ error: "mail_disabled" }, { status: 503 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sent = await sendVerification(user);
  return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "mail_failed" }, { status: 502 });
}
