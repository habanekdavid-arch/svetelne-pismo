import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

// Outgoing e-mail — the same setup as vytlacto3d's lib/mailer.ts, so both
// shops send from the one 4frommedia.sk mailbox with the same settings:
//
//   · primary: SMTP, by default Microsoft 365 (smtp.office365.com:587),
//     logged in with SMTP_USER / SMTP_PASSWORD;
//   · fallback: Gmail (GMAIL_USER / GMAIL_APP_PASSWORD) when the primary
//     refuses the login or cannot be reached — a mail problem must never cost
//     a customer their confirmation;
//   · Gmail alone when only the Gmail pair is set (vytlacto3d's older setup).
//
// The environment variable names are vytlacto3d's own, so its values can be
// copied across one to one. Until they exist nothing is sent and nothing
// breaks: orders, quotes and messages are saved as before and the skipped mail
// is logged. E-mail is a courtesy on top of the database, never the only copy.

const DEFAULT_SMTP_HOST = "smtp.office365.com";

/** The address the shop writes from when nothing else is set — the same as vytlacto3d's. */
export const DEFAULT_FROM_EMAIL = "info@4frommedia.sk";

const gmailUser = process.env.GMAIL_USER?.trim() || "";
const gmailPass = process.env.GMAIL_APP_PASSWORD || "";
const useLegacyGmail = !process.env.SMTP_USER?.trim() && Boolean(gmailUser);

const host = process.env.SMTP_HOST?.trim() || (useLegacyGmail ? "smtp.gmail.com" : DEFAULT_SMTP_HOST);
const user = process.env.SMTP_USER?.trim() || gmailUser;
const pass = process.env.SMTP_PASSWORD || gmailPass;
// 587 = STARTTLS (Microsoft 365 and Gmail), 465 = implicit TLS.
const port = Number(process.env.SMTP_PORT) || 587;
const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

// Fail fast rather than hang until the serverless function is killed.
const TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 };

/**
 * Who the mail is from. The login mailbox need not be the sending address —
 * on Microsoft 365 one logs in as one and sends as the other (SendAs) — so the
 * address defaults to info@4frommedia.sk under rozsvieťTO's own name.
 */
export const MAIL_FROM = process.env.EMAIL_FROM?.trim() || `rozsvieťTO <${DEFAULT_FROM_EMAIL}>`;

/** The shop's inbox: new orders, quote requests and contact messages (vytlacto3d: ADMIN_ORDER_EMAIL). */
export const SHOP_INBOX = process.env.ADMIN_ORDER_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

/** Where customers' replies go — the inbox they see on the site. */
export const REPLY_TO = process.env.EMAIL_REPLY_TO?.trim() || SHOP_INBOX;

export function mailConfigured(): boolean {
  return Boolean(user && pass);
}

/** Which transport is in use — for the admin's integration panel. */
export function mailSetup(): { host: string; user: string; fallback: boolean } {
  return { host, user, fallback: Boolean(!useLegacyGmail && gmailUser && gmailPass) };
}

let primary: Transporter | null = null;
function primaryTransport(): Transporter {
  primary ??= nodemailer.createTransport({
    host,
    port,
    secure,
    // On 587 the connection starts in plain text — refuse to log in unless
    // the server upgrades it.
    requireTLS: !secure,
    auth: { user, pass },
    ...TIMEOUTS,
  });
  return primary;
}

let fallback: Transporter | null = null;
function fallbackTransport(): Transporter | null {
  if (useLegacyGmail || !gmailUser || !gmailPass) return null;
  fallback ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: gmailUser, pass: gmailPass },
    ...TIMEOUTS,
  });
  return fallback;
}

// Errors after which this server will never send the message — worth trying
// Gmail instead. EENVELOPE / EMESSAGE cover Microsoft 365 refusing to send as
// an address the mailbox has no SendAs right for (550 5.7.60 / 554 5.2.252).
const FALLBACK_ON = new Set(["EAUTH", "ECONNECTION", "ESOCKET", "ETIMEDOUT", "EDNS", "EENVELOPE", "EMESSAGE"]);

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
  const message = {
    from: MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text ?? htmlToText(mail.html),
    replyTo: mail.replyTo ?? REPLY_TO,
  };
  try {
    await primaryTransport().sendMail(message);
    return true;
  } catch (err) {
    const code = String((err as { code?: string })?.code ?? "");
    const backup = FALLBACK_ON.has(code) ? fallbackTransport() : null;
    if (backup) {
      console.error(`[e-mail] primárny SMTP zlyhal (${code}), skúšam Gmail:`, err);
      try {
        // Gmail will not send as another domain's address — from its own.
        await backup.sendMail({ ...message, from: `rozsvieťTO <${gmailUser}>` });
        return true;
      } catch (err2) {
        console.error(`[e-mail] aj záložný Gmail zlyhal: „${mail.subject}“ → ${mail.to}:`, err2);
        return false;
      }
    }
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
