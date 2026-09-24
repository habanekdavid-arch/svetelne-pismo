import "server-only";

import { sendMail, SHOP_INBOX } from "@/lib/mailer.server";
import { siteOrigin } from "@/lib/stripe";
import { bankAccount, variableSymbol } from "@/lib/bank";
import type { Order, OrderGroup } from "@/lib/orders";
import { quoteState } from "@/lib/orders";
import { INSTALLATION_METHOD, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { colorLabel, depthMmFor, faceColorOf, hasSeparateFace, LIGHT_MODES, materialById } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { formatEur } from "@/lib/vat";

// Every e-mail the shop sends, in one place and one look. Each function is
// fire-and-forget from the caller's point of view: sendMail never throws, and
// with no SMTP settings it only logs (lib/mailer.server.ts).

const CONTACT_EMAIL = "info@4frommedia.sk";
const CONTACT_PHONE = "+421 907 907 097";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function orderNo(group: OrderGroup): string {
  return group.id.split("-")[0].toUpperCase();
}

function orderUrl(group: OrderGroup): string {
  return `${siteOrigin()}/objednavka/${group.id}`;
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="sk"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="font-size:20px;font-weight:800;margin-bottom:18px">rozsvieť<span style="color:#e59b00">TO</span></div>
  <div style="background:#fff;border-radius:18px;padding:26px 24px;border:1px solid #e7e5e4">
    <h1 style="font-size:20px;margin:0 0 14px">${esc(title)}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#78716c;line-height:1.7;margin-top:18px">
    rozsvieťTO · <a href="mailto:${CONTACT_EMAIL}" style="color:#b45309">${CONTACT_EMAIL}</a> · ${CONTACT_PHONE}<br>
    <a href="${siteOrigin()}" style="color:#b45309">${siteOrigin().replace(/^https?:\/\//, "")}</a>
  </p>
</div></body></html>`;
}

function p(text: string): string {
  return `<p style="font-size:14px;line-height:1.65;margin:0 0 12px;color:#292524">${text}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0 6px"><a href="${href}" style="display:inline-block;background:#ffae00;color:#000;font-weight:800;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:14px">${esc(label)}</a></p>`;
}

function rows(pairs: [string, string | null | undefined][]): string {
  const r = pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:5px 14px 5px 0;color:#78716c;font-size:13px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-size:13px;font-weight:600">${v}</td></tr>`)
    .join("");
  return `<table style="border-collapse:collapse;margin:6px 0 14px">${r}</table>`;
}

/** One line per sign: what it says, how it is built, what it costs. */
function signsTable(orders: Order[]): string {
  const lines = orders.map((o) => {
    const c = o.config;
    const lit = c.signType === "illuminated";
    const mode = lit ? (LIGHT_MODES.find((l) => l.id === c.lightMode)?.name ?? "svetelné") : "nesvetelné";
    const colours = hasSeparateFace(c.material)
      ? `čelo ${colorLabel(faceColorOf(c))}, hrana ${colorLabel(c.bodyColor)}`
      : `farba ${colorLabel(c.bodyColor)}`;
    const spec = `${materialById(c.material).displayName} · ${c.height} mm · hrúbka ${depthMmFor(c.material, c.height)} mm · ${mode} · ${colours}`;
    return `<tr>
      <td style="padding:10px 0;border-top:1px solid #f0efee">
        <div style="font-size:14px;font-weight:700">${esc(oneLine(c.text) || "Nápis")}</div>
        <div style="font-size:12px;color:#78716c">${esc(spec)}</div>
      </td>
      <td style="padding:10px 0 10px 12px;border-top:1px solid #f0efee;font-size:14px;font-weight:700;text-align:right;white-space:nowrap">${formatEur((o.priceCents ?? o.price * 100) / 100)}</td>
    </tr>`;
  });
  return `<table style="width:100%;border-collapse:collapse;margin:6px 0 10px">${lines.join("")}</table>`;
}

function totals(group: OrderGroup): string {
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const quote = quoteState(group);
  const extra = installation
    ? quote === "requested" ? ["Montáž", "v cenovej ponuke"] : ["Montáž", formatEur(group.deliveryCents / 100)]
    : ["Doprava", group.deliveryCents > 0 ? formatEur(group.deliveryCents / 100) : "na dohodu"];
  return rows([
    ["Nápisy", formatEur(group.itemsCents / 100)],
    [extra[0], extra[1]],
    [quote === "requested" ? "Za nápisy s DPH" : "Spolu s DPH", `<span style="font-size:16px">${formatEur(group.totalCents / 100)}</span>`],
  ]);
}

function bankBlock(group: OrderGroup, orders: Order[]): string {
  const bank = bankAccount();
  if (!bank || !orders[0]) return "";
  return `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:12px 16px;margin:10px 0 14px">
    <div style="font-size:13px;font-weight:800;margin-bottom:4px">Platobné údaje</div>
    ${rows([
      ["Suma", formatEur(group.totalCents / 100)],
      ["IBAN", esc(bank.iban)],
      ["BIC", bank.bic ? esc(bank.bic) : null],
      ["Variabilný symbol", variableSymbol(orders[0].id)],
      ["Príjemca", esc(bank.holder)],
      ["Správa", `Objednávka ${orderNo(group)}`],
    ])}
  </div>`;
}

function whereTo(group: OrderGroup): string | null {
  if (group.deliveryPoint) return esc(`Packeta — ${group.deliveryPoint.name}${group.deliveryPoint.street ? `, ${group.deliveryPoint.street}` : ""}`);
  if (group.deliveryAddress) {
    const a = group.deliveryAddress;
    return esc(`${a.street} ${a.houseNumber}, ${a.zip} ${a.city}`);
  }
  return null;
}

// ── Customer ─────────────────────────────────────────────────────────────────

/** Right after the order is placed — whatever kind it is. */
export async function mailOrderPlaced(group: OrderGroup, orders: Order[]): Promise<void> {
  const quote = quoteState(group);
  let intro: string;
  let extra = "";
  if (quote === "requested") {
    intro = "ďakujeme za objednávku s montážou. Pripravíme cenovú ponuku — predfaktúru s montážou na vašej adrese — a ozveme sa vám. Vopred nič neplatíte.";
  } else if (group.paymentMethod === "transfer") {
    intro = "ďakujeme za objednávku. Pošlite prosím sumu na účet nižšie — výrobu začneme hneď, ako platba príde.";
    extra = bankBlock(group, orders);
  } else if (group.paymentMethod === "card") {
    intro = "ďakujeme za objednávku. Ak platba kartou neprebehla, dokončiť ju môžete kedykoľvek cez tlačidlo nižšie.";
  } else {
    intro = "ďakujeme za objednávku. Ozveme sa vám s potvrdením ceny, termínu a platobnými údajmi.";
  }

  await sendMail({
    to: group.customerEmail,
    subject: quote === "requested"
      ? `Objednávka ${orderNo(group)} čaká na cenovú ponuku`
      : `Potvrdenie objednávky ${orderNo(group)}`,
    html: layout(
      quote === "requested" ? "Objednávka čaká na cenovú ponuku" : "Objednávku sme prijali",
      p(`Dobrý deň ${esc(group.customerName)}, ${intro}`) +
        signsTable(orders) +
        totals(group) +
        rows([
          [quote ? "Adresa inštalácie" : "Doručenie", whereTo(group)],
          ["Platba", group.paymentMethod ? PAYMENT_METHOD_LABEL[group.paymentMethod] : null],
        ]) +
        extra +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  });
}

/** The shop's quote for an installation order is ready to pay. */
export async function mailQuoteSent(group: OrderGroup, orders: Order[]): Promise<void> {
  await sendMail({
    to: group.customerEmail,
    subject: `Cenová ponuka k objednávke ${orderNo(group)}`,
    html: layout(
      "Vaša cenová ponuka je pripravená",
      p(`Dobrý deň ${esc(group.customerName)}, pripravili sme cenovú ponuku s montážou. Ak s ňou súhlasíte, uhraďte ju — výrobu začneme po prijatí platby a termín montáže dohodneme telefonicky.`) +
        signsTable(orders) +
        totals(group) +
        bankBlock(group, orders) +
        button(orderUrl(group), "Zobraziť predfaktúru"),
    ),
  });
}

/** Payment arrived — by card (Stripe webhook) or transfer (confirmed in the admin). */
export async function mailPaymentReceived(group: OrderGroup): Promise<void> {
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  await sendMail({
    to: group.customerEmail,
    subject: `Platba prijatá — objednávka ${orderNo(group)}`,
    html: layout(
      "Platbu sme prijali",
      p(`Dobrý deň ${esc(group.customerName)}, ďakujeme — platbu ${formatEur(group.totalCents / 100)} sme prijali a nápis ideme vyrábať.`) +
        p(installation
          ? "Termín montáže s vami dohodneme telefonicky."
          : "Keď bude hotový, odošleme ho a pošleme vám číslo zásielky.") +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  });
}

/** Packeta has the parcel. */
export async function mailPacketCreated(group: OrderGroup, barcode: string): Promise<void> {
  await sendMail({
    to: group.customerEmail,
    subject: `Zásielka k objednávke ${orderNo(group)}`,
    html: layout(
      "Zásielku sme odovzdali Packete",
      p(`Dobrý deň ${esc(group.customerName)}, váš nápis je na ceste.`) +
        rows([["Číslo zásielky", esc(barcode)], ["Doručenie", whereTo(group)]]) +
        button(`https://tracking.packeta.com/sk/?id=${encodeURIComponent(barcode)}`, "Sledovať zásielku"),
    ),
  });
}

/** Forgotten password — the link is valid for a limited time. */
export async function mailPasswordReset(to: string, link: string): Promise<boolean> {
  return sendMail({
    to,
    subject: "Obnovenie hesla — rozsvieťTO",
    html: layout(
      "Obnovenie hesla",
      p("Dostali sme žiadosť o nové heslo k vášmu účtu. Ak ste o ňu nežiadali, tento e-mail ignorujte.") +
        button(link, "Nastaviť nové heslo") +
        p('<span style="font-size:12px;color:#78716c">Odkaz platí 1 hodinu.</span>'),
    ),
  });
}

// ── The shop ─────────────────────────────────────────────────────────────────

/** New order in — to the shop's inbox. */
export async function mailShopNewOrder(group: OrderGroup, orders: Order[]): Promise<void> {
  if (!SHOP_INBOX) return;
  const quote = quoteState(group);
  await sendMail({
    to: SHOP_INBOX,
    replyTo: group.customerEmail,
    subject: quote === "requested"
      ? `Nová objednávka s montážou ${orderNo(group)} — pripraviť cenovú ponuku`
      : `Nová objednávka ${orderNo(group)} — ${formatEur(group.totalCents / 100)}`,
    html: layout(
      quote === "requested" ? "Nová objednávka s montážou" : "Nová objednávka",
      rows([
        ["Zákazník", esc(group.customerName)],
        ["E-mail", esc(group.customerEmail)],
        ["Telefón", group.customerPhone ? esc(group.customerPhone) : null],
        [quote ? "Adresa inštalácie" : "Doručenie", whereTo(group)],
        ["Platba", group.paymentMethod ? PAYMENT_METHOD_LABEL[group.paymentMethod] : quote ? "po cenovej ponuke" : "dohodnúť"],
      ]) +
        signsTable(orders) +
        totals(group) +
        button(`${siteOrigin()}/admin`, "Otvoriť administráciu"),
    ),
  });
}

/** A message from the contact form. */
export async function mailShopContact(msg: { name: string; email: string; subject: string; message: string }): Promise<void> {
  if (!SHOP_INBOX) return;
  await sendMail({
    to: SHOP_INBOX,
    replyTo: msg.email,
    subject: `Kontaktný formulár: ${msg.subject}`,
    html: layout(
      "Správa z kontaktného formulára",
      rows([["Od", `${esc(msg.name)} &lt;${esc(msg.email)}&gt;`], ["Predmet", esc(msg.subject)]]) +
        `<div style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#fafaf9;border-radius:12px;padding:12px 14px">${esc(msg.message)}</div>`,
    ),
  });
}
