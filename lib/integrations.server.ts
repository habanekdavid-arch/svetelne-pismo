import "server-only";

import { bankAccount } from "@/lib/bank";
import { mailConfigured, mailSetup, MAIL_FROM, SHOP_INBOX } from "@/lib/mailer.server";
import { stripeConfigured, webhookSecret } from "@/lib/stripe";

// Which outside services are switched on — read from the environment, shown
// in the admin so filling in the keys (docs/API-KLUCE-TODO.md) can be checked
// at a glance. Only whether a value is set is reported, never the value.

export type Integration = {
  name: string;
  ok: boolean;
  /** What works right now. */
  status: string;
  /** Environment variables still missing. */
  missing: string[];
};

function set(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function missing(...names: string[]): string[] {
  return names.filter((n) => !set(n));
}

export function integrations(): Integration[] {
  const stripeReady = stripeConfigured() && Boolean(webhookSecret());
  const bank = bankAccount();
  const mail = mailConfigured();

  return [
    {
      name: "Adresa webu",
      ok: set("NEXT_PUBLIC_SITE_URL"),
      status: set("NEXT_PUBLIC_SITE_URL")
        ? process.env.NEXT_PUBLIC_SITE_URL!.trim()
        : "Používa sa adresa z Vercelu — odkazy v e-mailoch a zo Stripe vedú na ňu.",
      missing: missing("NEXT_PUBLIC_SITE_URL"),
    },
    {
      name: "Platba kartou (Stripe)",
      ok: stripeReady,
      status: stripeReady
        ? "Zapnutá — platba sa potvrdí cez webhook."
        : stripeConfigured()
          ? "Kľúč je, chýba webhook — platby by sa neoznačili ako zaplatené."
          : "Vypnutá — v košíku sa neponúka.",
      missing: missing("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"),
    },
    {
      name: "Bankový prevod",
      ok: Boolean(bank),
      status: bank
        ? `Zapnutý — ${bank.iban} (${bank.holder}${bank.bank ? `, ${bank.bank}` : ""}), ten istý účet ako vytlacto3d.`
        : "BANK_IBAN nie je platný IBAN — prevod sa neponúka.",
      missing: [],
    },
    {
      name: "E-maily",
      ok: mail,
      status: mail
        ? `Zapnuté — ${mailSetup().host} ako ${mailSetup().user}, odosiela ${MAIL_FROM}, objednávky chodia na ${SHOP_INBOX}${mailSetup().fallback ? ", záložný Gmail zapnutý" : ""}.`
        : "Vypnuté — chýba RESEND_API_KEY (odporúčané) alebo heslo schránky office@4frommedia.sk (SMTP_PASSWORD). Overovacie e-maily, potvrdenia objednávok ani správy neodchádzajú.",
      missing: mail ? missing("RESEND_API_KEY", "GMAIL_USER", "GMAIL_APP_PASSWORD") : missing("RESEND_API_KEY", "SMTP_PASSWORD"),
    },
    {
      name: "Analytika (Google Tag Manager)",
      ok: set("NEXT_PUBLIC_GTM_ID"),
      status: set("NEXT_PUBLIC_GTM_ID")
        ? "Zapnutá — načíta sa po súhlase s cookies."
        : "Vypnutá — nákupy sa nemerajú.",
      missing: missing("NEXT_PUBLIC_GTM_ID"),
    },
  ];
}
