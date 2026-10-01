"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/admin-auth";
import {
  getOrderGroup,
  listOrdersForGroup,
  ORDER_STATUS_STEP,
  markGroupPaid,
  quoteState,
  sendInstallationQuote,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/orders";
import { afterPaid } from "@/lib/fulfilment.server";
import {
  mailOrderCancelled,
  mailOrderInProduction,
  mailOrderProcessing,
  mailOrderReady,
  mailQuoteSent,
  type Previews,
} from "@/lib/emails.server";
import { getPreview } from "@/lib/order-previews.server";
import { bankAccount } from "@/lib/bank";
import { markVerified } from "@/lib/email-verification.server";
import { deleteOrder } from "@/lib/orders";

// Re-checks the admin session inside the action itself — a Server Action is
// its own callable endpoint, so it must not rely solely on the page-level
// gate in app/admin/page.tsx.
export async function setOrderStatus(orderId: number, status: OrderStatus) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  const { groupId, previous } = await updateOrderStatus(orderId, status);
  // Every step forward is an e-mail to the customer: taken in for processing,
  // started in production, finished — or cancelled. They hear about it once
  // the WHOLE order has got that far: a basket of three signs goes into
  // production when the last of them does, not three times.
  if (groupId && previous !== status && status !== "new") {
    const [group, orders] = await Promise.all([getOrderGroup(groupId), listOrdersForGroup(groupId)]);
    const allThere =
      status === "cancelled"
        ? orders.every((o) => o.status === "cancelled")
        : orders.every((o) => ORDER_STATUS_STEP[o.status] >= ORDER_STATUS_STEP[status]);
    if (group && orders.length > 0 && allThere) {
      if (status === "in_progress") await mailOrderProcessing(group, orders);
      else if (status === "production") await mailOrderInProduction(group, orders, await previewsOf(orders.map((o) => o.id)));
      else if (status === "done") await mailOrderReady(group, orders);
      else await mailOrderCancelled(group, orders);
    }
  }
  revalidatePath("/admin");
}

/** The stored pictures of the signs, for the e-mail that says they are being made. */
async function previewsOf(ids: number[]): Promise<Previews> {
  const map: Previews = new Map();
  for (const id of ids) {
    const buf = await getPreview(id).catch(() => null);
    if (buf) map.set(id, buf.toString("base64"));
  }
  return map;
}

/**
 * A bank transfer has arrived. The same once-only step a card payment takes in
 * the Stripe webhook: the order is marked paid and the customer is told.
 */
export async function confirmTransferPaid(groupId: string) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  const group = await getOrderGroup(groupId);
  // A transfer, or an installation order whose quote has gone out and was
  // paid against it.
  if (!group || (group.paymentMethod !== "transfer" && quoteState(group) !== "sent")) return;
  const firstTime = await markGroupPaid(groupId, null);
  if (firstTime) await afterPaid({ ...group, paymentStatus: "paid" });
  revalidatePath("/admin");
}

/**
 * Sends the quote for an installation order: the mounting price (€ incl. VAT)
 * goes in beside the signs, and the customer sees the pre-invoice — the total
 * and how to pay it — on their order page.
 */
export async function sendQuote(groupId: string, installationEur: number) {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  if (!Number.isFinite(installationEur) || installationEur < 0 || installationEur > 100_000) {
    throw new Error("Neplatná cena montáže.");
  }
  const cents = Math.round(installationEur * 100);
  const sent = await sendInstallationQuote(groupId, cents, bankAccount() ? "transfer" : null);
  if (sent) {
    // The customer hears about it by e-mail, with the pre-invoice attached as
    // a link — without SMTP set up, call them.
    const group = await getOrderGroup(groupId);
    if (group) await mailQuoteSent(group, await listOrdersForGroup(groupId));
  }
  revalidatePath("/admin");
}

// ── Self-tests ────────────────────────────────────────────────────────────────
// The buttons under "Test funkcií" in the admin: each one exercises a live
// service the way the shop uses it and says, in plain words, whether it works
// and why not. Nothing here changes an order or charges anyone.

export type SelfTestKind = "mail" | "db" | "stripe" | "quote";
export type SelfTestResult = { ok: boolean; message: string; ms: number };

export async function runSelfTest(kind: SelfTestKind, to?: string): Promise<SelfTestResult> {
  const session = await getAdminIdentity();
  if (!session) {
    throw new Error("Nemáte oprávnenie na túto akciu.");
  }
  const started = Date.now();
  const done = (ok: boolean, message: string): SelfTestResult => ({ ok, message, ms: Date.now() - started });

  try {
    if (kind === "mail") {
      const { sendTestMail, SHOP_INBOX } = await import("@/lib/mailer.server");
      const target = (to ?? "").trim() || SHOP_INBOX;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return done(false, "Zadajte platnú e-mailovú adresu.");
      const when = new Date().toLocaleString("sk-SK", { timeZone: "Europe/Bratislava" });
      const result = await sendTestMail({
        to: target,
        subject: "Testovací e-mail — rozsvieťTO",
        html: `<p>Toto je testovací e-mail z administrácie rozsvieťTO (${when}).</p>
<p>Ak ste ho dostali, odosielanie e-mailov funguje — potvrdenia objednávok, platieb aj obnova hesla chodia rovnakou cestou.</p>
<p>Odoslal: ${session.email}</p>`,
      });
      return done(result.ok, result.ok ? `Na ${target}: ${result.detail}` : result.detail);
    }

    if (kind === "db") {
      if (!process.env.DATABASE_URL?.trim()) return done(false, "Chýba DATABASE_URL.");
      const { getDb } = await import("@/lib/db");
      const sql = await getDb();
      const rows = (await sql`SELECT
          (SELECT count(*) FROM orders)::int AS orders,
          (SELECT count(*) FROM order_groups)::int AS groups`) as { orders: number; groups: number }[];
      const r = rows[0];
      return done(true, `Databáza odpovedá — ${r?.groups ?? 0} objednávok, ${r?.orders ?? 0} nápisov.`);
    }

    if (kind === "stripe") {
      const { stripe, webhookSecret } = await import("@/lib/stripe");
      const client = stripe();
      if (!client) return done(false, "Chýba STRIPE_SECRET_KEY — platba kartou sa v košíku neponúka.");
      const balance = await client.balance.retrieve();
      const live = balance.livemode;
      const hook = webhookSecret()
        ? "webhook secret je nastavený"
        : "CHÝBA STRIPE_WEBHOOK_SECRET — platby by sa neoznačili ako zaplatené";
      return done(Boolean(webhookSecret()), `Kľúč funguje (${live ? "ostrý režim" : "testovací režim"}), ${hook}.`);
    }

    if (kind === "quote") {
      const { quoteBasket } = await import("@/lib/quote.server");
      const { formatEur } = await import("@/lib/vat");
      const quote = await quoteBasket([
        {
          text: "TEST",
          font: "montserrat-extrabold",
          material: "alurol-upper",
          signType: "illuminated",
          lightMode: "front",
          lightColor: "#ffffff",
          bodyColor: "#0a0a0a",
          faceColor: "#f1f0ea",
          height: 400,
          rotation: 0,
        },
      ]);
      const item = quote.items[0];
      return done(
        Boolean(item && item.price > 0),
        item
          ? `Nápis „TEST“, alurol 400 mm, svetelné spredu: ${formatEur(item.price)} s DPH, ${Math.round(item.widthMm)} × ${Math.round(item.heightMm)} mm. Doprava: ${quote.deliveryMethods.map((m) => m.name).join(", ")}.`
          : "Cenu sa nepodarilo vypočítať.",
      );
    }

    return done(false, "Neznámy test.");
  } catch (err) {
    return done(false, `Chyba: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500));
  }
}

/** "Overiť ručne" — confirms a customer's e-mail by hand (they wrote in, the mail never arrived). */
export async function verifyUserManually(userId: string) {
  const session = await getAdminIdentity();
  if (!session || typeof userId !== "string" || !userId) return;
  await markVerified(userId);
  revalidatePath("/admin/pouzivatelia");
}

/** "Vymazať objednávku" — removes the sign (and its now-empty checkout) for good. */
export async function deleteOrderAction(orderId: number) {
  const session = await getAdminIdentity();
  if (!session) throw new Error("Nemáte oprávnenie na túto akciu.");
  await deleteOrder(orderId);
  revalidatePath("/admin");
}

/**
 * "Odstrániť účet" — deletes the customer's login, profile and verification.
 * Their orders stay (they are the shop's business records, with the name and
 * e-mail written on them), only no longer tied to an account that can sign in.
 */
export async function deleteUserAction(userId: string) {
  const session = await getAdminIdentity();
  if (!session) throw new Error("Nemáte oprávnenie na túto akciu.");
  if (typeof userId !== "string" || !userId) return;
  const { prisma } = await import("@/lib/prisma");
  const { getDb } = await import("@/lib/db");
  const sql = await getDb();
  await sql`DELETE FROM user_profiles WHERE user_id = ${userId}`.catch(() => {});
  await sql`DELETE FROM user_email_verification WHERE user_id = ${userId}`.catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  revalidatePath("/admin/pouzivatelia");
}
