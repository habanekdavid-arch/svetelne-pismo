import type { UserProfile } from "@/lib/profile";

// What "detaily účtu" means. Signing up asks for nothing but an e-mail and a
// password — enough to see prices — so the rest is filled in later: in the
// cart's "Doplniť detaily účtu" step, or on the account page, which a small
// reminder (components/account/AccountDetailsReminder.tsx) points to.
//
// Complete = what an order and its invoice cannot do without: who it is, a
// phone for the courier or the hand-over, and the billing address; a company
// also its name and IČO.

export type AccountDetailsMissing = "name" | "phone" | "address" | "company";

export function missingAccountDetails(name: string, p: UserProfile | null): AccountDetailsMissing[] {
  const missing: AccountDetailsMissing[] = [];
  if (!name.trim()) missing.push("name");
  if (!p?.phone.trim()) missing.push("phone");
  const a = p?.billing.street ? p.billing : p?.shipping;
  if (!a?.street.trim() || !a.city.trim() || !a.zip.trim()) missing.push("address");
  if (p?.accountType === "COMPANY" && (!p.companyName.trim() || !p.ico.trim())) missing.push("company");
  return missing;
}

export function accountDetailsComplete(name: string, p: UserProfile | null): boolean {
  return missingAccountDetails(name, p).length === 0;
}
