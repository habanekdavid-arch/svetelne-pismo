import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSessionToken, getUserSession, USER_SESSION_COOKIE } from "@/lib/user-auth";
import { getUserProfile, saveUserProfile, toProfile, EMPTY_PROFILE } from "@/lib/profile";

// The customer's own invoicing/delivery details. Both handlers read the
// session cookie themselves (lib/user-auth.ts) — a route handler is its own
// endpoint and must never rely on a page-level gate — and both work only on
// the caller's own row, so there is no id to tamper with in the request.

export async function GET() {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = (await getUserProfile(session.userId)) ?? EMPTY_PROFILE;
  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const profile = toProfile(body?.profile);

  if (profile.accountType === "COMPANY" && (!profile.companyName || !profile.ico)) {
    return NextResponse.json({ error: "missing_company" }, { status: 400 });
  }

  await saveUserProfile(session.userId, profile);

  // The name lives on the account itself (and in the session cookie, which
  // the header reads) — so a new name is written there and the cookie renewed.
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 120) : null;
  const res = NextResponse.json({ profile, name: name ?? session.name });
  if (name && name !== session.name) {
    await prisma.user.update({ where: { id: session.userId }, data: { name } });
    const token = await createUserSessionToken({ ...session, name });
    res.cookies.set(USER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
