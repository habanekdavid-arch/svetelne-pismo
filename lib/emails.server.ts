import "server-only";

import { sendMail, SHOP_INBOX } from "@/lib/mailer.server";
import { siteOrigin } from "@/lib/stripe";
import { bankAccount, variableSymbol } from "@/lib/bank";
import type { Order, OrderGroup } from "@/lib/orders";
import { groupOrderNumber, quoteState } from "@/lib/orders";
import { EMAIL_LOGO_CID, EMAIL_LOGO_PNG_BASE64 } from "@/lib/email-logo";
import { INSTALLATION_METHOD, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { colorLabel, depthMmFor, faceColorOf, hasSeparateFace, materialById, variantLabel } from "@/lib/options";
import { oneLine } from "@/lib/sign-text";
import { formatEur } from "@/lib/vat";
import { afterMadeText, deliveryPlace, DELIVERY_METHOD_LABEL, formatAddress, leadTimeNotice, PICKUP_ADDRESS, PRODUCTION_TIME } from "@/lib/shipping";

// Every e-mail the shop sends, in one place and one look. Each function is
// fire-and-forget from the caller's point of view: sendMail never throws, and
// with no SMTP settings it only logs (lib/mailer.server.ts).

const CONTACT_EMAIL = "info@4frommedia.sk";
const CONTACT_PHONE = "+421 907 907 097";

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function orderNo(group: OrderGroup): string {
  return groupOrderNumber(group);
}

function orderUrl(group: OrderGroup): string {
  return `${siteOrigin()}/objednavka/${group.id}`;
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="sk"><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="margin-bottom:18px">
    <a href="${siteOrigin()}" style="text-decoration:none">
      <img src="cid:${EMAIL_LOGO_CID}" width="178" height="48" alt="rozsvieťTO" style="display:block;border:0;height:48px;width:178px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#111111;line-height:48px">
    </a>
  </div>
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
    const mode = variantLabel(c).toLocaleLowerCase("sk-SK");
    const colours = hasSeparateFace(c.material)
      ? `čelo ${colorLabel(faceColorOf(c))}, telo ${colorLabel(c.bodyColor)}`
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
    ? quote === "requested" ? ["Montáž", "v cenovej ponuke"]
      : quote === "pending" || quote === "consult" ? ["Montáž", "dohodneme po zaplatení nápisu"]
      : ["Montáž", formatEur(group.deliveryCents / 100)]
    : ["Doprava", group.deliveryCents > 0
        ? formatEur(group.deliveryCents / 100)
        : group.deliveryMethod === "freight" ? "na dohodu" : "zadarmo"];
  return rows([
    ["Nápisy", formatEur(group.itemsCents / 100)],
    [extra[0], extra[1]],
    [quote === "requested" || quote === "pending" || quote === "consult" ? "Za nápisy s DPH" : "Spolu s DPH", `<span style="font-size:16px">${formatEur(group.totalCents / 100)}</span>`],
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
      ["Banka", bank.bank ? esc(bank.bank) : null],
      ["Variabilný symbol", variableSymbol(orders[0].id)],
      ["Príjemca", esc(bank.holder)],
      ["Správa", `Objednávka ${orderNo(group)}`],
    ])}
  </div>`;
}

/** "Máte záujem aj o inštaláciu?" was ticked — where, the note, and what happens next. */
function installationBlock(group: OrderGroup, forShop: boolean): string {
  const req = group.installationRequest;
  if (!req) return "";
  return `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:12px 16px;margin:10px 0 14px">
    <div style="font-size:13px;font-weight:800;margin-bottom:4px">Dopyt na cenu za inštaláciu</div>
    ${rows([
      ["Miesto inštalácie", esc(formatAddress(req.address))],
      ["Poznámka", req.note ? esc(req.note) : null],
    ])}
    <div style="font-size:13px;line-height:1.6;color:#57534e">${forShop
      ? "Zákazník má záujem o inštaláciu — pripravte a pošlite mu cenovú ponuku."
      : "Ďakujeme za záujem o inštaláciu. Pripravíme cenovú ponuku a pošleme vám ju e-mailom."}</div>
  </div>`;
}

function whereTo(group: OrderGroup): string | null {
  const place = deliveryPlace(group);
  if (group.deliveryMethod === INSTALLATION_METHOD) return place ? esc(place) : null;
  const method = DELIVERY_METHOD_LABEL[group.deliveryMethod];
  return esc([method, place].filter(Boolean).join(" — ")) || null;
}

// ── Every e-mail, built ──────────────────────────────────────────────────────
// Each e-mail is a builder that returns the finished message and a sender that
// posts it. The builders are also what the admin's e-mail preview renders
// (app/admin/emaily), so what is previewed is exactly what is sent.

export type MailAttachment = { filename: string; content: Buffer; cid: string; contentType: string };
export type BuiltMail = { to: string; subject: string; html: string; replyTo?: string; attachments?: MailAttachment[] };

/** Ordered signs' pictures (lib/order-previews.server.ts), by order id, as base64 JPEG. */
export type Previews = Map<number, string>;

/** The watermarked pictures of the signs, inline — and the attachments that carry them. */
function previewBlock(orders: Order[], previews?: Previews): { html: string; attachments: MailAttachment[] } {
  const attachments: MailAttachment[] = [];
  const cells: string[] = [];
  for (const o of orders) {
    const b64 = previews?.get(o.id);
    if (!b64) continue;
    const cid = `nahlad-${o.id}@rozsvietto`;
    attachments.push({ filename: `nahlad-${o.id}.jpg`, content: Buffer.from(b64, "base64"), cid, contentType: "image/jpeg" });
    cells.push(`<div style="margin:8px 0 4px">
      <img src="cid:${cid}" alt="Náhľad nápisu ${esc(oneLine(o.config.text))}" width="512" style="display:block;width:100%;max-width:512px;height:auto;border-radius:12px;border:1px solid #e7e5e4">
      <div style="font-size:12px;color:#78716c;margin-top:4px">${esc(oneLine(o.config.text) || "Nápis")} — náhľad z konfigurátora</div>
    </div>`);
  }
  if (cells.length === 0) return { html: "", attachments };
  return {
    html: `<div style="margin:10px 0 14px"><div style="font-size:13px;font-weight:800;margin-bottom:2px">${cells.length === 1 ? "Náhľad vášho nápisu" : "Náhľady vašich nápisov"}</div>${cells.join("")}</div>`,
    attachments,
  };
}

const n = (group: OrderGroup) => `Dobrý deň ${esc(group.customerName)},`;

/** Right after the order is placed — whatever kind it is. */
export function buildOrderPlaced(group: OrderGroup, orders: Order[], previews?: Previews): BuiltMail {
  const pics = previewBlock(orders, previews);
  const quote = quoteState(group);
  let intro: string;
  let extra = "";
  if (quote === "requested") {
    intro = "ďakujeme za objednávku s montážou. Pripravíme cenovú ponuku — predfaktúru s montážou na vašej adrese — a ozveme sa vám. Vopred nič neplatíte.";
  } else if (quote === "pending" && group.paymentMethod === "transfer") {
    intro = "ďakujeme za objednávku s montážou. Najprv prosím uhraďte nápis na účet nižšie. Keď platba príde, budeme vás kontaktovať a dohodneme montáž a realizáciu — termín, detaily a cenu montáže.";
    extra = bankBlock(group, orders);
  } else if (quote === "pending") {
    intro = group.paymentStatus === "paid"
      ? "ďakujeme za objednávku s montážou aj za platbu. Budeme vás kontaktovať a dohodneme montáž a realizáciu."
      : "ďakujeme za objednávku s montážou. Najprv prosím dokončite platbu za nápis — potom vás budeme kontaktovať a dohodneme montáž a realizáciu.";
  } else if (group.paymentMethod === "transfer") {
    intro = "ďakujeme za objednávku. Pošlite prosím sumu na účet nižšie — výrobu začneme hneď, ako platba príde.";
    extra = bankBlock(group, orders);
  } else if (group.paymentMethod === "card") {
    intro = group.paymentStatus === "paid"
      ? "ďakujeme za objednávku aj platbu kartou."
      : "ďakujeme za objednávku. Ak platba kartou neprebehla, dokončiť ju môžete kedykoľvek cez tlačidlo nižšie.";
  } else {
    intro = "ďakujeme za objednávku. Ozveme sa vám s potvrdením ceny, termínu a platobnými údajmi.";
  }

  return {
    attachments: pics.attachments,
    to: group.customerEmail,
    subject: quote === "requested"
      ? `Objednávka ${orderNo(group)} čaká na cenovú ponuku`
      : `Potvrdenie objednávky ${orderNo(group)}`,
    html: layout(
      quote === "requested" ? "Objednávka čaká na cenovú ponuku" : "Objednávku sme prijali",
      p(`${n(group)} ${intro}`) +
        signsTable(orders) +
        pics.html +
        totals(group) +
        rows([
          [quote ? "Adresa inštalácie" : "Doručenie", whereTo(group)],
          ["Platba", group.paymentMethod ? PAYMENT_METHOD_LABEL[group.paymentMethod] : null],
        ]) +
        (quote ? "" : p(esc(leadTimeNotice(group.deliveryMethod)))) +
        installationBlock(group, false) +
        extra +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  };
}

/** The shop's quote for an installation order is ready to pay. */
export function buildQuoteSent(group: OrderGroup, orders: Order[]): BuiltMail {
  return {
    to: group.customerEmail,
    subject: `Cenová ponuka k objednávke ${orderNo(group)}`,
    html: layout(
      "Vaša cenová ponuka je pripravená",
      p(`${n(group)} pripravili sme cenovú ponuku s montážou. Ak s ňou súhlasíte, uhraďte ju — výrobu začneme po prijatí platby a termín montáže dohodneme telefonicky.`) +
        signsTable(orders) +
        totals(group) +
        bankBlock(group, orders) +
        button(orderUrl(group), "Zobraziť predfaktúru"),
    ),
  };
}

/** Payment arrived — by card (Stripe webhook) or transfer (confirmed in the admin). */
export function buildPaymentReceived(group: OrderGroup): BuiltMail {
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  return {
    to: group.customerEmail,
    subject: `Platba prijatá — objednávka ${orderNo(group)}`,
    html: layout(
      "Platbu sme prijali",
      p(`${n(group)} ďakujeme — platbu ${formatEur(group.totalCents / 100)} sme prijali a nápis ideme vyrábať.`) +
        p(installation
          ? `${PRODUCTION_TIME} Čoskoro vás budeme kontaktovať a dohodneme montáž a realizáciu — termín, detaily a cenu montáže.`
          : `${PRODUCTION_TIME} ${afterMadeText(group.deliveryMethod)}`) +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  };
}

/** A card payment that did not go through (Stripe: async_payment_failed). */
export function buildPaymentFailed(group: OrderGroup): BuiltMail {
  return {
    to: group.customerEmail,
    subject: `Platba neprebehla — objednávka ${orderNo(group)}`,
    html: layout(
      "Platba neprebehla",
      p(`${n(group)} platba ${formatEur(group.totalCents / 100)} za objednávku ${orderNo(group)} sa nepodarila a nič sme vám nestrhli. Objednávku máme uloženú — zaplatiť ju môžete znova kartou alebo prevodom.`) +
        button(orderUrl(group), "Dokončiť platbu"),
    ),
  };
}

/** "Prijať na spracovanie" in the admin — the order is being checked and prepared. */
export function buildOrderProcessing(group: OrderGroup, orders: Order[]): BuiltMail {
  return {
    to: group.customerEmail,
    subject: `Objednávku ${orderNo(group)} spracovávame`,
    html: layout(
      "Objednávku spracovávame",
      p(`${n(group)} vašu objednávku ${orderNo(group)} sme prijali na spracovanie. Kontrolujeme text, rozmery, farby a materiál a pripravujeme výrobné podklady.`) +
        p("Ak budeme potrebovať niečo upresniť, ozveme sa vám. Keď nápis spustíme do výroby, dáme vám vedieť ďalším e-mailom.") +
        signsTable(orders) +
        button(orderUrl(group), "Zobraziť objednávku") +
        p(`Otázky? Napíšte na <a href="mailto:${CONTACT_EMAIL}" style="color:#b45309">${CONTACT_EMAIL}</a> alebo zavolajte na ${CONTACT_PHONE}.`),
    ),
  };
}

/** "Spustiť do výroby" in the admin — the sign is being made. */
export function buildOrderInProduction(group: OrderGroup, orders: Order[], previews?: Previews): BuiltMail {
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const pics = previewBlock(orders, previews);
  return {
    attachments: pics.attachments,
    to: group.customerEmail,
    subject: `Váš nápis ide do výroby — objednávka ${orderNo(group)}`,
    html: layout(
      "Váš nápis ide do výroby",
      p(`${n(group)} dobrá správa — ${orders.length > 1 ? "vaše nápisy sme spustili" : "váš nápis sme spustili"} do výroby.`) +
        p(installation
          ? `${PRODUCTION_TIME} Keď bude hotový, ozveme sa vám a dohodneme termín montáže.`
          : `${PRODUCTION_TIME} ${afterMadeText(group.deliveryMethod)}`) +
        signsTable(orders) +
        pics.html +
        rows([[installation ? "Adresa inštalácie" : "Doručenie", whereTo(group)]]) +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  };
}

/** Every sign of the order is made — what happens next depends on the delivery. */
export function buildOrderReady(group: OrderGroup, orders: Order[]): BuiltMail {
  const installation = group.deliveryMethod === INSTALLATION_METHOD;
  const next = installation
    ? "Ozveme sa vám a dohodneme termín montáže."
    : group.deliveryMethod === "pickup-prievidza"
      ? `Zavoláme vám a dohodneme, kedy si ho môžete vyzdvihnúť na adrese ${esc(PICKUP_ADDRESS)}.`
      : group.deliveryMethod === "pickup-bratislava"
        ? "Zavoláme vám a dohodneme, kde a kedy vám ho v Bratislave odovzdáme."
        : group.deliveryMethod === "freight"
          ? "Ozveme sa vám a dohodneme dopravu."
          : "Odovzdávame ho kuriérovi DPD — pred doručením vás bude kontaktovať.";
  return {
    to: group.customerEmail,
    subject: `Váš nápis je hotový — objednávka ${orderNo(group)}`,
    html: layout(
      "Váš nápis je hotový",
      p(`${n(group)} váš nápis sme dokončili. ${next}`) +
        signsTable(orders) +
        rows([[installation ? "Adresa inštalácie" : "Doručenie", whereTo(group)]]) +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  };
}

/** The order was cancelled in the admin. */
export function buildOrderCancelled(group: OrderGroup, orders: Order[]): BuiltMail {
  const paid = group.paymentStatus === "paid";
  return {
    to: group.customerEmail,
    subject: `Objednávka ${orderNo(group)} bola zrušená`,
    html: layout(
      "Objednávka bola zrušená",
      p(`${n(group)} vaša objednávka ${orderNo(group)} bola zrušená.`) +
        signsTable(orders) +
        p(paid
          ? "Zaplatenú sumu vám vrátime rovnakým spôsobom, akým ste platili — o vrátení vám pošleme správu."
          : "Nič ste neplatili, takže nie je čo vracať.") +
        p(`Ak ide o omyl alebo máte otázku, napíšte nám na <a href="mailto:${CONTACT_EMAIL}" style="color:#b45309">${CONTACT_EMAIL}</a> alebo zavolajte na ${CONTACT_PHONE}.`),
    ),
  };
}

/** Money went back (Stripe: charge.refunded). */
export function buildRefunded(group: OrderGroup): BuiltMail {
  return {
    to: group.customerEmail,
    subject: `Platba vrátená — objednávka ${orderNo(group)}`,
    html: layout(
      "Platbu sme vrátili",
      p(`${n(group)} platbu za objednávku ${orderNo(group)} sme vrátili na vašu kartu. Na účte sa zvyčajne objaví do 5–10 pracovných dní, podľa banky.`) +
        button(orderUrl(group), "Zobraziť objednávku"),
    ),
  };
}

/** Forgotten password — the link is valid for a limited time. */
export function buildPasswordReset(to: string, link: string): BuiltMail {
  return {
    to,
    subject: "Obnovenie hesla — rozsvieťTO",
    html: layout(
      "Obnovenie hesla",
      p("Dostali sme žiadosť o nové heslo k vášmu účtu. Ak ste o ňu nežiadali, tento e-mail ignorujte.") +
        button(link, "Nastaviť nové heslo") +
        p('<span style="font-size:12px;color:#78716c">Odkaz platí 1 hodinu.</span>'),
    ),
  };
}

/** Right after registration — the account can order once the address is confirmed. */
export function buildVerifyEmail(to: string, name: string, link: string, code: string): BuiltMail {
  return {
    to,
    subject: `Váš overovací kód: ${code} — rozsvieťTO`,
    html: layout(
      "Overenie e-mailu",
      p(`Dobrý deň${name ? ` ${esc(name)}` : ""}, ďakujeme za registráciu.`) +
        p("Na webe zadajte tento overovací kód:") +
        `<div style="font-size:30px;font-weight:800;letter-spacing:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:14px 18px;text-align:center;margin:6px 0 16px">${esc(code)}</div>` +
        p("Alebo kliknite na tlačidlo — overí vás jedným klikom:") +
        button(link, "Overiť e-mail") +
        p('<span style="font-size:12px;color:#78716c">Kód platí 1 hodinu, odkaz 7 dní. Ak ste sa neregistrovali, tento e-mail ignorujte.</span>'),
    ),
  };
}

// ── To the shop ──────────────────────────────────────────────────────────────

function customerRows(group: OrderGroup): string {
  const quote = quoteState(group);
  return rows([
    ["Zákazník", esc(group.customerName)],
    ["E-mail", esc(group.customerEmail)],
    ["Telefón", group.customerPhone ? esc(group.customerPhone) : null],
    [quote ? "Adresa inštalácie" : "Doručenie", whereTo(group)],
    ["Platba", group.paymentMethod ? PAYMENT_METHOD_LABEL[group.paymentMethod] : quote ? "po cenovej ponuke" : "dohodnúť"],
  ]);
}

/** New order in. */
export function buildShopNewOrder(group: OrderGroup, orders: Order[], previews?: Previews): BuiltMail {
  const pics = previewBlock(orders, previews);
  const quote = quoteState(group);
  return {
    attachments: pics.attachments,
    to: SHOP_INBOX,
    replyTo: group.customerEmail,
    subject: quote === "requested"
      ? `Nová objednávka s montážou ${orderNo(group)} — pripraviť cenovú ponuku`
      : quote
      ? `Nová objednávka s montážou ${orderNo(group)} — ${formatEur(group.totalCents / 100)}`
      : `Nová objednávka ${orderNo(group)} — ${formatEur(group.totalCents / 100)}${group.installationRequest ? " + dopyt na inštaláciu" : ""}`,
    html: layout(
      quote ? "Nová objednávka s montážou" : "Nová objednávka",
      customerRows(group) +
        signsTable(orders) +
        pics.html +
        totals(group) +
        installationBlock(group, true) +
        p(quote === "requested"
          ? "Pripravte cenovú ponuku s montážou v administrácii."
          : quote
          ? "Zákazník najprv platí za nápis. Po prijatí platby ho kontaktujte a dohodnite montáž a realizáciu."
          : group.paymentMethod === "transfer"
            ? "Čaká sa na prevod. Keď peniaze prídu, potvrďte platbu v administrácii."
            : group.paymentMethod === "card"
              ? "Platba kartou — keď prebehne, príde samostatný e-mail."
              : "Zákazníkovi treba potvrdiť cenu a platbu.") +
        button(`${siteOrigin()}/admin`, "Otvoriť administráciu"),
    ),
  };
}

/** The order is paid — start making it. */
export function buildShopPaid(group: OrderGroup, orders: Order[]): BuiltMail {
  return {
    to: SHOP_INBOX,
    replyTo: group.customerEmail,
    subject: `Zaplatené: objednávka ${orderNo(group)} — ${formatEur(group.totalCents / 100)}`,
    html: layout(
      "Objednávka je zaplatená — do výroby",
      p(`Platba ${formatEur(group.totalCents / 100)} ${group.paymentMethod === "card" ? "kartou cez Stripe" : "prevodom"} je prijatá. Zákazník dostal potvrdenie.`) +
        (quoteState(group) === "consult"
          ? p("<strong>Objednávka s montážou:</strong> kontaktujte zákazníka a dohodnite montáž a realizáciu — termín, detaily a cenu montáže.")
          : "") +
        customerRows(group) +
        signsTable(orders) +
        button(`${siteOrigin()}/admin`, "Otvoriť administráciu"),
    ),
  };
}

/** A message from the contact form. */
export function buildShopContact(msg: { name: string; email: string; subject: string; message: string }): BuiltMail {
  return {
    to: SHOP_INBOX,
    replyTo: msg.email,
    subject: `Kontaktný formulár: ${msg.subject}`,
    html: layout(
      "Správa z kontaktného formulára",
      rows([["Od", `${esc(msg.name)} &lt;${esc(msg.email)}&gt;`], ["Predmet", esc(msg.subject)]]) +
        `<div style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#fafaf9;border-radius:12px;padding:12px 14px">${esc(msg.message)}</div>`,
    ),
  };
}

// ── Senders ──────────────────────────────────────────────────────────────────

/** The logo, inside every message (lib/email-logo.ts). */
const LOGO_ATTACHMENT: MailAttachment = {
  filename: "rozsvietto.png",
  content: Buffer.from(EMAIL_LOGO_PNG_BASE64, "base64"),
  cid: EMAIL_LOGO_CID,
  contentType: "image/png",
};

async function send(mail: BuiltMail): Promise<boolean> {
  if (!mail.to) return false;
  return sendMail({ ...mail, attachments: [LOGO_ATTACHMENT, ...(mail.attachments ?? [])] });
}

export const mailOrderPlaced = async (g: OrderGroup, o: Order[], p?: Previews) => { await send(buildOrderPlaced(g, o, p)); };
export const mailQuoteSent = async (g: OrderGroup, o: Order[]) => { await send(buildQuoteSent(g, o)); };
export const mailPaymentReceived = async (g: OrderGroup) => { await send(buildPaymentReceived(g)); };
export const mailPaymentFailed = async (g: OrderGroup) => { await send(buildPaymentFailed(g)); };
export const mailOrderProcessing = async (g: OrderGroup, o: Order[]) => { await send(buildOrderProcessing(g, o)); };
export const mailOrderInProduction = async (g: OrderGroup, o: Order[], p?: Previews) => { await send(buildOrderInProduction(g, o, p)); };
export const mailOrderReady = async (g: OrderGroup, o: Order[]) => { await send(buildOrderReady(g, o)); };
export const mailOrderCancelled = async (g: OrderGroup, o: Order[]) => { await send(buildOrderCancelled(g, o)); };
export const mailRefunded = async (g: OrderGroup) => { await send(buildRefunded(g)); };
export const mailPasswordReset = (to: string, link: string) => send(buildPasswordReset(to, link));
export const mailVerifyEmail = (to: string, name: string, link: string, code: string) => send(buildVerifyEmail(to, name, link, code));
export const mailShopNewOrder = async (g: OrderGroup, o: Order[], p?: Previews) => { await send(buildShopNewOrder(g, o, p)); };
export const mailShopPaid = async (g: OrderGroup, o: Order[]) => { await send(buildShopPaid(g, o)); };
export const mailShopContact = async (m: { name: string; email: string; subject: string; message: string }) => { await send(buildShopContact(m)); };
