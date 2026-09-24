import "server-only";

// The account a bank transfer goes to — the same one vytlacto3d takes
// transfers on (its lib/company-info.ts): 4from media, s.r.o., Tatra banka.
// BANK_IBAN / BANK_ACCOUNT_HOLDER / BANK_BIC override it, should rozsvieťTO
// ever get an account of its own.

export type BankAccount = {
  /** Grouped in fours, the way it is typed into a banking app. */
  iban: string;
  holder: string;
  bic: string | null;
  bank: string | null;
};

const DEFAULT_ACCOUNT = {
  iban: "SK35 1100 0000 0029 4526 7328",
  holder: "4from media, s.r.o.",
  bic: "TATRSKBX",
  bank: "Tatra banka, a.s.",
};

export function bankAccount(): BankAccount | null {
  const custom = process.env.BANK_IBAN?.trim();
  const raw = (custom || DEFAULT_ACCOUNT.iban).replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(raw)) return null;
  return {
    iban: raw.replace(/(.{4})/g, "$1 ").trim(),
    holder: process.env.BANK_ACCOUNT_HOLDER?.trim() || DEFAULT_ACCOUNT.holder,
    bic: process.env.BANK_BIC?.trim() || (custom ? null : DEFAULT_ACCOUNT.bic),
    bank: custom ? null : DEFAULT_ACCOUNT.bank,
  };
}

/**
 * The variable symbol for an order: "9" and the number of its first sign,
 * padded to ten digits (order 42 → 9000000042).
 *
 * The account is shared with vytlacto3d, whose symbols are its own order
 * numbers padded to eight digits (00000042). Banks compare symbols as
 * numbers, so a bare "42" here would be the same payment reference as
 * vytlacto3d's order 42. Ten digits starting with 9 can never be an
 * eight-digit number, and ten is the most a Slovak transfer allows.
 */
export function variableSymbol(firstOrderId: number): string {
  return `9${String(firstOrderId).padStart(9, "0").slice(-9)}`;
}
