import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createUserSessionToken, USER_SESSION_COOKIE } from "@/lib/user-auth";
import { saveUserProfile, toProfile } from "@/lib/profile";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches lib/user-auth.ts

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const profile = toProfile(body?.profile);

  if (!name || !email || !password) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  // What a delivery cannot happen without. The billing address may stay empty
  // — then the delivery address is what gets invoiced (see lib/profile.ts).
  if (!profile.phone || !profile.shipping.street || !profile.shipping.city || !profile.shipping.zip) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (profile.accountType === "COMPANY" && (!profile.companyName || !profile.ico)) {
    return NextResponse.json({ error: "missing_company" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });

  // The account exists either way: if the profile write fails the customer is
  // still registered and can fill the address in again, which is a better
  // outcome than a 500 that leaves them unable to re-register (the e-mail is
  // taken by then).
  try {
    await saveUserProfile(user.id, profile);
  } catch (err) {
    console.error("[register] profile could not be stored:", err);
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
