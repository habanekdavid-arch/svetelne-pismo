// Admin login is deliberately its own thing, separate from Clerk (which
// only handles customer accounts) — a Prisma-backed AdminUser table +
// bcrypt password + a signed session cookie, the same shape as the
// password-based admin the vytlacto3d project already uses successfully.
//
// Runs entirely in Node.js Server Components / Route Handlers (never in
// proxy.ts / edge middleware), so there are no edge-runtime constraints on
// which crypto libs it can use.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getUserSession } from "@/lib/user-auth";

export const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAdminSessionToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null; // expired, tampered, or signed with an old secret
  }
}

// Server Components / Server Actions read the cookie via next/headers.
export async function getAdminSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSessionToken(token);
}

// ── Admin access from an ordinary account ────────────────────────────────────
// Listing an e-mail in ADMIN_EMAILS makes that customer account an admin, so
// the owner signs in once on the site and /admin just opens — no second login
// with a separate password.
//
//   ADMIN_EMAILS=you@example.com,kolega@example.com
//
// The customer session is a JWT signed with USER_SESSION_SECRET (lib/user-auth.ts),
// so the e-mail it carries is as trustworthy as the admin cookie. The dedicated
// AdminUser + password login still works and is unchanged — this only adds a
// second way in, for accounts you name yourself.
//
// An empty or unset ADMIN_EMAILS grants nothing: the allowlist is opt-in, and
// an account is never admin by accident.
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const allowed = adminEmails();
  return allowed.length > 0 && allowed.includes(email.trim().toLowerCase());
}

export type AdminIdentity = {
  email: string;
  /** "password" = the AdminUser login; "account" = an allowlisted customer account. */
  via: "password" | "account";
};

/** The single gate every admin surface should use. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const adminSession = await getAdminSession();
  if (adminSession) return { email: adminSession.email, via: "password" };

  const user = await getUserSession();
  if (user && isAdminEmail(user.email)) return { email: user.email, via: "account" };

  return null;
}
