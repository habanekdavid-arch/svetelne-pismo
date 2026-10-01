import "server-only";

import { randomInt } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import { mailVerifyEmail } from "@/lib/emails.server";
import { siteOrigin } from "@/lib/stripe";

// E-mail verification. A new account gets a row here with verified_at empty
// and an e-mail with two ways to confirm: a signed link (same secret as the
// customer session, a week to click it) and a 6-digit code to type on the site
// (an hour) — the code works even when the link's domain is not live yet, or
// the e-mail is read on another device. Accounts made before verification existed have no row
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
      await sql`ALTER TABLE user_email_verification ADD COLUMN IF NOT EXISTS code TEXT`;
      await sql`ALTER TABLE user_email_verification ADD COLUMN IF NOT EXISTS code_expires TIMESTAMPTZ`;
      await sql`ALTER TABLE user_email_verification ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0`;
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

const CODE_TTL_MINUTES = 60;
/** Wrong codes allowed before a new e-mail is needed. */
const MAX_CODE_ATTEMPTS = 8;

/**
 * Sends (or re-sends) the confirmation e-mail with a fresh code. `origin` is
 * the address the customer is on right now, so the link opens the same site
 * (siteOrigin() can name a domain that is not live yet). False when the mail
 * could not go out.
 */
export async function sendVerification(
  user: { id: string; email: string; name: string },
  origin?: string,
): Promise<boolean> {
  await ensureTable();
  const sql = await getDb();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`
    INSERT INTO user_email_verification (user_id, code, code_expires, code_attempts)
    VALUES (${user.id}, ${code}, now() + make_interval(mins => ${CODE_TTL_MINUTES}), 0)
    ON CONFLICT (user_id) DO UPDATE
      SET code = EXCLUDED.code, code_expires = EXCLUDED.code_expires, code_attempts = 0
  `;
  const token = await createVerifyToken(user.id);
  const base = (origin || siteOrigin()).replace(/\/$/, "");
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;
  return mailVerifyEmail(user.email, user.name, link, code);
}

/** Confirms the account with the code from the e-mail. */
export async function verifyCode(userId: string, code: string): Promise<"ok" | "wrong" | "expired"> {
  await ensureTable();
  const sql = await getDb();
  const clean = code.replace(/\D/g, "");
  const rows = (await sql`
    SELECT code, code_expires, code_attempts, verified_at
    FROM user_email_verification WHERE user_id = ${userId}
  `) as { code: string | null; code_expires: string | null; code_attempts: number; verified_at: string | null }[];
  const r = rows[0];
  if (!r || r.verified_at) return "ok"; // no row = older account; already confirmed
  if (!r.code || !r.code_expires || new Date(r.code_expires).getTime() < Date.now() || r.code_attempts >= MAX_CODE_ATTEMPTS) {
    return "expired";
  }
  if (clean !== r.code) {
    await sql`UPDATE user_email_verification SET code_attempts = code_attempts + 1 WHERE user_id = ${userId}`;
    return "wrong";
  }
  await markVerified(userId);
  await sql`UPDATE user_email_verification SET code = NULL, code_expires = NULL WHERE user_id = ${userId}`;
  return "ok";
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
