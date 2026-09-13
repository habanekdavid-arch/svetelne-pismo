import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { bootstrapCredentialsMatch } from "@/lib/admin-bootstrap";

const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days, matches lib/admin-auth.ts

// ── First-admin bootstrap ────────────────────────────────────────────────────
// Admin identity lives in the admin_users table, which normally means running
// scripts/seed-admin.mjs against the production DATABASE_URL to create the very
// first account — a chicken-and-egg problem if all you have is the Vercel
// dashboard. Setting ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD lets that
// one account create itself on first sign-in instead; the rules live in
// lib/admin-bootstrap.ts.
//
// This only ever CREATES: it runs solely when no row exists for the e-mail, so
// the variables can never silently reset a real admin's password. Delete them
// once you are in — anyone who can read the project's environment can otherwise
// sign in as admin. (That is already true of whoever can read DATABASE_URL, so
// this widens no boundary, but a live credential shouldn't outlive its purpose.)
async function createBootstrapAdmin(email: string, password: string) {
  if (!bootstrapCredentialsMatch(email, password)) return null;

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    return await prisma.adminUser.create({ data: { email, passwordHash } });
  } catch {
    // Two sign-ins racing: the loser hits the unique constraint on email. The
    // row exists either way, so read it back.
    return prisma.adminUser.findUnique({ where: { email } });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const admin =
    (await prisma.adminUser.findUnique({ where: { email } })) ??
    (await createBootstrapAdmin(email, password));

  // Always run bcrypt.compare (even against a dummy hash when no such user
  // exists) so the response time doesn't leak whether the e-mail is valid.
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? "$2a$10$invalidsaltinvalidsaltinvalidsaltinvalid");

  if (!admin || !ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createAdminSessionToken(admin.email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
