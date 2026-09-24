import "server-only";

import { bankAccount } from "@/lib/bank";
import { mailConfigured } from "@/lib/mailer.server";
import { packetaConfigured, homeCarrierId } from "@/lib/packeta";
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
  const packetaWidget = set("NEXT_PUBLIC_PACKETA_API_KEY");
  const packetaApi = packetaConfigured();
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
        ? `Zapnutý — ${bank.iban}, príjemca ${bank.holder}.`
        : set("BANK_IBAN")
          ? "BANK_IBAN nie je platný IBAN."
          : "Vypnutý — v košíku sa neponúka, predfaktúra nemá platobné údaje.",
      missing: missing("BANK_IBAN", "BANK_ACCOUNT_HOLDER"),
    },
    {
      name: "Packeta — výdajné miesta",
      ok: packetaWidget,
      status: packetaWidget ? "Zapnutá — mapa výdajných miest v košíku." : "Vypnutá — v košíku je len kuriér.",
      missing: missing("NEXT_PUBLIC_PACKETA_API_KEY"),
    },
    {
      name: "Packeta — zásielky automaticky",
      ok: packetaApi,
      status: packetaApi
        ? homeCarrierId()
          ? "Zásielky (výdajné miesto aj kuriér) sa vytvoria po zaplatení."
          : "Zásielky na výdajné miesto sa vytvoria po zaplatení; kuriéra treba zadať ručne."
        : "Vypnuté — zásielky sa zadávajú ručne v Packete.",
      missing: missing("PACKETA_API_PASSWORD", "PACKETA_HOME_CARRIER_ID"),
    },
    {
      name: "E-maily",
      ok: mail,
      status: mail
        ? "Zapnuté — potvrdenia objednávok, cenové ponuky, platby, zásielky, kontaktný formulár, obnova hesla."
        : "Vypnuté — nič sa neposiela; objednávky a správy sú len v administrácii.",
      missing: missing("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM", "SHOP_EMAIL"),
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
