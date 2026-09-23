import "server-only";

// The account a bank transfer goes to. Configuration, not code: the IBAN is
// set on Vercel (BANK_IBAN), and until it is, a transfer is simply not offered
// at checkout — an order must never tell a customer to pay to nowhere.

export type BankAccount = {
  /** Grouped in fours, the way it is typed into a banking app. */
  iban: string;
  holder: string;
  bic: string | null;
};

export function bankAccount(): BankAccount | null {
  const raw = process.env.BANK_IBAN?.replace(/\s+/g, "").toUpperCase();
  if (!raw || !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(raw)) return null;
  return {
    iban: raw.replace(/(.{4})/g, "$1 ").trim(),
    holder: process.env.BANK_ACCOUNT_HOLDER?.trim() || "rozsvietTO",
    bic: process.env.BANK_BIC?.trim() || null,
  };
}

/**
 * The variable symbol for an order: the number of its first sign. Numeric and
 * at most ten digits, as a Slovak transfer requires, and unique because the
 * row id is.
 */
export function variableSymbol(firstOrderId: number): string {
  return String(firstOrderId).slice(-10);
}
