import "server-only";

import Stripe from "stripe";

// Stripe — server side only. The secret key never reaches the browser; the
// browser only ever gets the Checkout Session's redirect URL.
//
// As with Packeta, nothing here runs unless the keys are set. Without them the
// shop falls back to what it did before: the order is recorded and we get in
// touch to arrange payment.

let _stripe: Stripe | null = null;

/** The Stripe client, or null when the shop is not set up to take card payments. */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  // Created lazily — reading the key at module scope would break `next build`,
  // which imports this file long before the environment is there (the same
  // reason lib/db.ts defers neon()).
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** The signing secret for the webhook endpoint (`whsec_…`). */
export function webhookSecret(): string | null {
  const s = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return s ? s : null;
}

/**
 * The site's own origin, for the URLs Stripe sends the customer back to.
 * NEXT_PUBLIC_SITE_URL wins; otherwise Vercel's own host, which is right for
 * preview deployments and correct in production once the env var is set.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
