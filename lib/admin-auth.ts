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
