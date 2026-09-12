import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createUserSessionToken, USER_SESSION_COOKIE } from "@/lib/user-auth";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches lib/user-auth.ts

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run bcrypt.compare (even against a dummy hash when no such user
  // exists) so the response time doesn't leak whether the e-mail is valid.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$10$invalidsaltinvalidsaltinvalidsaltinvalid");

  if (!user || !ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createUserSessionToken({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ user: { name: user.name, email: user.email } });
  res.cookies.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
