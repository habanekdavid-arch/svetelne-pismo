import { getDb } from "@/lib/db";

// Everything an invoice and a delivery need, kept next to the account rather
// than inside it: Prisma's User (prisma/schema.prisma) stays the minimum an
// account needs to exist — id, e-mail, password, name — and this table holds
// what the customer fills in at registration and can change later.
//
// Raw SQL with CREATE TABLE IF NOT EXISTS, the same way orders and contact
// messages are stored (lib/db.ts, lib/contact.ts), so a fresh deploy needs no
// migration step before registration works.

export type AccountType = "PERSON" | "COMPANY";

export type Address = {
  street: string;
  city: string;
  zip: string;
  country: string;
};

export type UserProfile = {
  accountType: AccountType;
  phone: string;
  companyName: string;
  ico: string;
  dic: string;
  icDph: string;
  vatPayer: boolean;
  soleTrader: boolean;
  /** May be left empty — then the delivery address is what gets invoiced. */
  billing: Address;
  shipping: Address;
};

export const EMPTY_ADDRESS: Address = { street: "", city: "", zip: "", country: "Slovensko" };

export const EMPTY_PROFILE: UserProfile = {
  accountType: "PERSON",
  phone: "",
  companyName: "",
  ico: "",
  dic: "",
  icDph: "",
  vatPayer: false,
  soleTrader: false,
  billing: EMPTY_ADDRESS,
  shipping: EMPTY_ADDRESS,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const sql = await getDb();
      await sql`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id          TEXT PRIMARY KEY,
          account_type     TEXT NOT NULL DEFAULT 'PERSON',
          phone            TEXT NOT NULL DEFAULT '',
          company_name     TEXT NOT NULL DEFAULT '',
          ico              TEXT NOT NULL DEFAULT '',
          dic              TEXT NOT NULL DEFAULT '',
          ic_dph           TEXT NOT NULL DEFAULT '',
          vat_payer        BOOLEAN NOT NULL DEFAULT false,
          sole_trader      BOOLEAN NOT NULL DEFAULT false,
          billing_street   TEXT NOT NULL DEFAULT '',
          billing_city     TEXT NOT NULL DEFAULT '',
          billing_zip      TEXT NOT NULL DEFAULT '',
          billing_country  TEXT NOT NULL DEFAULT '',
          shipping_street  TEXT NOT NULL DEFAULT '',
          shipping_city    TEXT NOT NULL DEFAULT '',
          shipping_zip     TEXT NOT NULL DEFAULT '',
          shipping_country TEXT NOT NULL DEFAULT '',
          updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();
  }
  return tableReady;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Normalises whatever arrived over the wire into a profile we can store. */
export function toProfile(input: unknown): UserProfile {
  const raw = (input ?? {}) as Record<string, unknown>;
  const address = (v: unknown): Address => {
    const a = (v ?? {}) as Record<string, unknown>;
    return {
      street: str(a.street),
      city: str(a.city),
      zip: str(a.zip),
      country: str(a.country) || "Slovensko",
    };
  };
  return {
    accountType: raw.accountType === "COMPANY" ? "COMPANY" : "PERSON",
    phone: str(raw.phone),
    companyName: str(raw.companyName),
    ico: str(raw.ico),
    dic: str(raw.dic),
    icDph: str(raw.icDph),
    vatPayer: raw.vatPayer === true,
    soleTrader: raw.soleTrader === true,
    billing: address(raw.billing),
    shipping: address(raw.shipping),
  };
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
  await ensureTable();
  const sql = await getDb();
  await sql`
    INSERT INTO user_profiles (
      user_id, account_type, phone, company_name, ico, dic, ic_dph,
      vat_payer, sole_trader,
      billing_street, billing_city, billing_zip, billing_country,
      shipping_street, shipping_city, shipping_zip, shipping_country, updated_at
    ) VALUES (
      ${userId}, ${profile.accountType}, ${profile.phone}, ${profile.companyName},
      ${profile.ico}, ${profile.dic}, ${profile.icDph},
      ${profile.vatPayer}, ${profile.soleTrader},
      ${profile.billing.street}, ${profile.billing.city}, ${profile.billing.zip}, ${profile.billing.country},
      ${profile.shipping.street}, ${profile.shipping.city}, ${profile.shipping.zip}, ${profile.shipping.country},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      account_type = EXCLUDED.account_type,
      phone = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      ico = EXCLUDED.ico,
      dic = EXCLUDED.dic,
      ic_dph = EXCLUDED.ic_dph,
      vat_payer = EXCLUDED.vat_payer,
      sole_trader = EXCLUDED.sole_trader,
      billing_street = EXCLUDED.billing_street,
      billing_city = EXCLUDED.billing_city,
      billing_zip = EXCLUDED.billing_zip,
      billing_country = EXCLUDED.billing_country,
      shipping_street = EXCLUDED.shipping_street,
      shipping_city = EXCLUDED.shipping_city,
      shipping_zip = EXCLUDED.shipping_zip,
      shipping_country = EXCLUDED.shipping_country,
      updated_at = now()
  `;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureTable();
  const sql = await getDb();
  const rows = (await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`) as Row[];
  const r = rows[0];
  if (!r) return null;
  return {
    accountType: r.account_type === "COMPANY" ? "COMPANY" : "PERSON",
    phone: r.phone ?? "",
    companyName: r.company_name ?? "",
    ico: r.ico ?? "",
    dic: r.dic ?? "",
    icDph: r.ic_dph ?? "",
    vatPayer: !!r.vat_payer,
    soleTrader: !!r.sole_trader,
    billing: {
      street: r.billing_street ?? "",
      city: r.billing_city ?? "",
      zip: r.billing_zip ?? "",
      country: r.billing_country ?? "",
    },
    shipping: {
      street: r.shipping_street ?? "",
      city: r.shipping_city ?? "",
      zip: r.shipping_zip ?? "",
      country: r.shipping_country ?? "",
    },
  };
}
