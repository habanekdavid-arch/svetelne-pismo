import { timingSafeEqual } from "node:crypto";

// Policy for the first-admin bootstrap, kept apart from the database work in
// app/api/admin/login/route.ts so the rules that decide whether a bootstrap is
// allowed can be read — and tested — on their own.
//
// Set both variables and the named account is created on its first successful
// sign-in, hashed exactly like any other admin:
//
//   ADMIN_BOOTSTRAP_EMAIL=you@example.com
//   ADMIN_BOOTSTRAP_PASSWORD=<at least 12 characters>
//
// The caller must only invoke this when no admin row exists for that e-mail,
// so the variables can never reset an existing admin's password.

export const MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;

/** Constant-time string comparison. Length differences are not constant-time
 *  (timingSafeEqual throws on mismatched buffers), which leaks only the length. */
export function safeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Do the submitted credentials match the configured bootstrap pair?
 *
 * False unless every condition holds:
 *   • both variables are set
 *   • the password clears MIN_BOOTSTRAP_PASSWORD_LENGTH — a blank or short one
 *     is refused rather than becoming a weak permanent admin
 *   • the e-mail matches (trimmed, case-insensitive, as e-mails are stored)
 *   • the password matches exactly, compared in constant time
 */
export function bootstrapCredentialsMatch(
  email: string,
  password: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const bootstrapEmail = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!bootstrapEmail || !bootstrapPassword) return false;
  if (bootstrapPassword.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) return false;
  if (email.trim().toLowerCase() !== bootstrapEmail) return false;

  return safeEquals(password, bootstrapPassword);
}
