import "server-only";

import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

// Password reset without a table of its own: the link carries a signed token
// (the same secret as the customer session) naming the account, and a
// fingerprint of the password hash it was issued against. Once the password
// changes the fingerprint no longer matches, so a link works exactly once —
// and it expires after an hour regardless.

const RESET_TTL_SECONDS = 60 * 60;

function secret(): Uint8Array {
  const s = process.env.USER_SESSION_SECRET;
  if (!s) throw new Error("USER_SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

function fingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 24);
}

export async function createResetToken(userId: string, passwordHash: string): Promise<string> {
  return new SignJWT({ purpose: "password-reset", uid: userId, fp: fingerprint(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL_SECONDS}s`)
    .sign(secret());
}

/** The account the token is for, if it is genuine, fresh and not used yet. */
export async function readResetToken(
  token: string,
  currentHash: (userId: string) => Promise<string | null>,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "password-reset" || typeof payload.uid !== "string") return null;
    const hash = await currentHash(payload.uid);
    if (!hash || payload.fp !== fingerprint(hash)) return null;
    return payload.uid;
  } catch {
    return null;
  }
}
