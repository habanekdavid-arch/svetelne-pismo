// Who may open /admin. There is no separate admin login page and no admin
// password: the shop owner signs in on the site with an ordinary account, and
// the account counts as admin when its e-mail is listed in ADMIN_EMAILS.
//
//   ADMIN_EMAILS=you@example.com,kolega@example.com
//
// The customer session is a JWT signed with USER_SESSION_SECRET (lib/user-auth.ts),
// so the e-mail it carries can be trusted. An empty or unset ADMIN_EMAILS
// grants nothing: the allowlist is opt-in, and an account is never admin by
// accident.
//
// Runs in Node.js Server Components / Route Handlers / Server Actions only.

import { isVerified } from "@/lib/email-verification.server";
import { getUserSession } from "@/lib/user-auth";

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
};

/** The single gate every admin surface should use. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  // An allowlisted account counts only once its e-mail is confirmed —
  // otherwise anyone could register a listed address that has no account yet
  // and walk into the admin. Accounts older than verification count as
  // confirmed (lib/email-verification.server.ts).
  const user = await getUserSession();
  if (user && isAdminEmail(user.email) && (await isVerified(user.userId).catch(() => false))) {
    return { email: user.email };
  }
  return null;
}
