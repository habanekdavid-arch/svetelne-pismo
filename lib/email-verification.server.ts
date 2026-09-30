import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import { mailVerifyEmail } from "@/lib/emails.server";
import { siteOrigin } from "@/lib/stripe";

// E-mail verification. A new account gets a row here with verified_at empty
// and an e-mail with a signed link (same secret as the customer session, a
// week to click it). Accounts made before verification existed have no row
// and count as verified — nobody who already ordered is locked out.
//
// A customer can sign in and see prices before confirming; placing an order
// is what needs the confirmed address (app/api/orders).

const VERIFY_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret(): Uint8Array {
  const s = process.env.USER_SESSION_SECRET;
  if (!s) throw new Error("USER_SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS user_email_verification (
          user_id     TEXT PRIMARY KEY,
          verified_at TIMESTAMPTZ,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      tableReady = null;
      throw err;
    });
  }
  return tableReady;
}

/** Marks a fresh account as waiting for confirmation. */
export async function markPending(userId: string): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO user_email_verification (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;
}

export async function markVerified(userId: string): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO user_email_verification (user_id, verified_at) VALUES (${userId}, now())
    ON CONFLICT (user_id) DO UPDATE SET verified_at = COALESCE(user_email_verification.verified_at, now())
  `;
}

/** True unless the account is known to be waiting for confirmation. */
export async function isVerified(userId: string): Promise<boolean> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT verified_at FROM user_email_verification WHERE user_id = ${userId}
  `) as { verified_at: string | null }[];
  return rows.length === 0 || rows[0].verified_at !== null;
}

export async function createVerifyToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: "verify-email", uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFY_TTL_SECONDS}s`)
    .sign(secret());
}

/** The account the link is for, if it is genuine and fresh. */
export async function readVerifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== "verify-email" || typeof payload.uid !== "string") return null;
    return payload.uid;
  } catch {
    return null;
  }
}

/** Sends (or re-sends) the confirmation e-mail. False when mail could not go out. */
export async function sendVerification(user: { id: string; email: string; name: string }): Promise<boolean> {
  const token = await createVerifyToken(user.id);
  const link = `${siteOrigin()}/api/auth/verify?token=${encodeURIComponent(token)}`;
  return mailVerifyEmail(user.email, user.name, link);
}

/** Accounts still waiting to confirm their e-mail — everyone else counts as confirmed. */
export async function listUnverified(): Promise<Set<string>> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`
    SELECT user_id FROM user_email_verification WHERE verified_at IS NULL
  `) as { user_id: string }[];
  return new Set(rows.map((r) => r.user_id));
}
