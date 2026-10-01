import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import {
  markVerified,
  readVerifyToken,
  isVerified,
  sendVerification,
  verifyCode,
} from "@/lib/email-verification.server";
import { mailConfigured } from "@/lib/mailer.server";

export const runtime = "nodejs";

/** The address this request came to — the site the customer is actually on. */
function originOf(req: Request): string {
  return new URL(req.url).origin;
}

// GET — the link from the e-mail. Confirms the address and sends the
// customer back to the same site with a note that it worked (or that the link
// was no good).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await readVerifyToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(`${originOf(req)}/?overenie=neplatne`);
  }
  await markVerified(userId);
  return NextResponse.redirect(`${originOf(req)}/?overenie=ok`);
}

// POST, for the signed-in customer:
//   { code: "123456" } — the code from the e-mail, typed on the site;
//   {}                 — "Poslať znova": a new code and link.
export async function POST(req: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (await isVerified(session.userId)) return NextResponse.json({ ok: true, verified: true });

  const body = await req.json().catch(() => null);
  if (typeof body?.code === "string") {
    const result = await verifyCode(session.userId, body.code);
    if (result === "ok") return NextResponse.json({ ok: true, verified: true });
    return NextResponse.json({ error: result === "wrong" ? "wrong_code" : "code_expired" }, { status: 400 });
  }

  if (!mailConfigured()) return NextResponse.json({ error: "mail_disabled" }, { status: 503 });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sent = await sendVerification(user, originOf(req));
  return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "mail_failed" }, { status: 502 });
}
