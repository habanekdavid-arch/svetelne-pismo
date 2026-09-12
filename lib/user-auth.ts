// Customer account sessions — same shape as lib/admin-auth.ts (Prisma User
// table + bcrypt password + a signed JWT cookie) but a completely separate
// cookie/table, so a customer login never doubles as admin access.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const USER_SESSION_COOKIE = "user_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret) throw new Error("USER_SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type UserSession = { userId: string; email: string; name: string };

export async function createUserSessionToken(session: UserSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyUserSessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.email !== "string") return null;
    return { userId: payload.userId, email: payload.email, name: typeof payload.name === "string" ? payload.name : "" };
  } catch {
    return null; // expired, tampered, or signed with an old secret
  }
}

// Server Components / Server Actions / Route Handlers read the cookie via
// next/headers — no middleware involved (see proxy.ts removal notes).
export async function getUserSession(): Promise<UserSession | null> {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyUserSessionToken(token);
}
