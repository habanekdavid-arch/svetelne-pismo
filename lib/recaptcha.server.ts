import "server-only";

// Checks a reCAPTCHA v3 token with Google (lib/recaptcha.ts takes the token
// in the browser). Google answers with a score from 0.0 (a bot) to 1.0 (a
// person); below RECAPTCHA_MIN_SCORE (default 0.5) the check fails.
//
// A failed check does NOT turn a form away: a customer whose browser blocks
// Google's script, or whom Google scores low (VPN, a private window), could
// otherwise never reach us. The forms take the message anyway and mark it
// for the shop (recaptchaWarning) — the honeypot field still drops the
// simplest bots outright.
//
// Without RECAPTCHA_SECRET_KEY nothing is checked and every form passes.

export type RecaptchaResult =
  | { ok: true; skipped?: boolean; score?: number }
  | { ok: false; reason: "missing_token" | "invalid" | "low_score" | "wrong_action"; score?: number };

export function recaptchaConfigured(): boolean {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}

function minScore(): number {
  const n = Number(process.env.RECAPTCHA_MIN_SCORE);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}

/** The visitor's address as Vercel passes it on, for Google's own check. */
export function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

export async function verifyRecaptcha(
  token: unknown,
  action: string,
  ip?: string,
): Promise<RecaptchaResult> {
  const result = await check(token, action, ip);
  // Every miss is logged with its reason and score, so a customer's "it would
  // not send" can be traced afterwards.
  if (!result.ok) console.warn("[reCAPTCHA] neprešlo:", { action, reason: result.reason, score: result.score });
  return result;
}

/**
 * The line the shop sees on a message whose check failed — why, in plain
 * words. Null when the check passed or was not run.
 */
export function recaptchaWarning(result: RecaptchaResult): string | null {
  if (result.ok) return null;
  const why = {
    missing_token: "prehliadač neposlal overenie (skript Googlu bol zablokovaný alebo sa nenačítal)",
    invalid: "Google overenie neuznal",
    low_score: `Google odhadol robota (skóre ${result.score ?? "?"})`,
    wrong_action: "overenie patrilo inému formuláru",
  }[result.reason];
  return `Neoverené reCAPTCHA — ${why}. Môže ísť o spam, ale aj o skutočného zákazníka.`;
}

async function check(token: unknown, action: string, ip?: string): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || !token) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  let data: { success?: boolean; score?: number; action?: string; "error-codes"?: string[] } | null = null;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    data = await res.json();
  } catch (err) {
    // Google unreachable: let the person through rather than lose a real
    // message to an outage on Google's side. The honeypot still applies.
    console.error("[reCAPTCHA] overenie nedostupné, formulár prijatý:", err);
    return { ok: true, skipped: true };
  }

  if (!data?.success) {
    console.warn("[reCAPTCHA] neplatný token:", data?.["error-codes"]);
    return { ok: false, reason: "invalid" };
  }
  if (data.action && data.action !== action) return { ok: false, reason: "wrong_action", score: data.score };
  const score = typeof data.score === "number" ? data.score : 0;
  if (score < minScore()) return { ok: false, reason: "low_score", score };
  return { ok: true, score };
}
