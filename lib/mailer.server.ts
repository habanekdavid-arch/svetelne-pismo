import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

// Outgoing e-mail, over plain SMTP — the same way vytlacto3d sends its mail,
// so any mailbox (Microsoft 365, Google Workspace, Websupport, a transactional
// service's SMTP relay…) works by filling in five settings.
//
// Until those settings exist nothing is sent and nothing breaks: an order, a
// quote or a contact message is saved exactly as before, and the reason mail
// was skipped goes to the log. E-mail is a courtesy on top of the database,
// never the only copy of anything.

const host = process.env.SMTP_HOST?.trim() || "";
const user = process.env.SMTP_USER?.trim() || "";
const pass = process.env.SMTP_PASSWORD || "";
// 587 = STARTTLS, 465 = implicit TLS.
const port = Number(process.env.SMTP_PORT) || 587;
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

/** Who the mail is from, e.g. `rozsvieťTO <info@rozsvietto.sk>`. */
export const MAIL_FROM = process.env.EMAIL_FROM?.trim() || (user ? `rozsvieťTO <${user}>` : "");

/** The shop's own inbox: new orders, quote requests and contact messages go here. */
export const SHOP_INBOX = process.env.SHOP_EMAIL?.trim() || user;

export function mailConfigured(): boolean {
  return Boolean(host && user && pass && MAIL_FROM);
}

let transporter: Transporter | null = null;
function transport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      // On 587 the connection starts in plain text — refuse to log in unless
      // the server upgrades it.
      requireTLS: !secure,
      auth: { user, pass },
      // Fail fast rather than hang until the serverless function is killed.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export type Mail = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative; derived from the HTML when left out. */
  text?: string;
  replyTo?: string;
};

/**
 * Sends one e-mail. Never throws: a mail that could not go out is logged and
 * reported as `false`, so the caller's real work (saving the order, marking it
 * paid) is never undone by a mailbox problem.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.info(`[e-mail] nenastavené SMTP — neodoslané: „${mail.subject}“ → ${mail.to}`);
    return false;
  }
  if (!mail.to) return false;
  try {
    await transport().sendMail({
      from: MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text ?? htmlToText(mail.html),
      replyTo: mail.replyTo ?? (SHOP_INBOX || undefined),
    });
    return true;
  } catch (err) {
    console.error(`[e-mail] odoslanie zlyhalo: „${mail.subject}“ → ${mail.to}:`, err);
    return false;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h\d|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
