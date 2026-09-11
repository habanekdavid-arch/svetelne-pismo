// Admin access = signed in (Clerk) AND the account's e-mail is on the
// ADMIN_EMAILS allowlist (comma-separated env var) — no Clerk roles/
// organizations involved, just a plain allowlist check on our own /admin
// page. See app/admin/page.tsx.

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
