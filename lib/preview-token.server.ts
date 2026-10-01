import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A signed link to one order's picture, for Stripe: the payment page and the
// Stripe dashboard show the sign's watermarked preview next to its line, and
// Stripe fetches it without our login. The token proves the link was made by
// the shop for exactly this order — nothing else can be read with it.

function secret(): string {
  return process.env.USER_SESSION_SECRET ?? "";
}

export function previewToken(orderId: number): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`order-preview:${orderId}`).digest("hex").slice(0, 32);
}

export function checkPreviewToken(orderId: number, token: string | null): boolean {
  const expected = previewToken(orderId);
  if (!expected || !token || token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
