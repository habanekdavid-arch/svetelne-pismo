import { NextResponse, after } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { isVerified } from "@/lib/email-verification.server";
import { readPreview } from "@/lib/order-previews.server";
import { sanitizeConfig } from "@/lib/quote.server";
import { calculatePrice } from "@/lib/pricing";
import { createLogoConsultation } from "@/lib/logo-consultations";
import { mailLogoConsultationReceived, mailShopLogoConsultation } from "@/lib/emails.server";
import { isLogoFile, LOGO_RULE_TEXT, MAX_LOGO_BYTES } from "@/lib/logo";
import type { SignSize } from "@/lib/useSignSize";

// "Objednať konzultáciu k logu" — the configurator's last step for a sign made
// from the customer's logo. Nothing is paid and nothing is ordered: the logo,
// the sign as configured and how to reach the customer are saved, and the
// shop answers with an offer (lib/logo-consultations.ts).
//
// Open to anyone, signed in or not — asking about a logo should not need an
// account. The price is worked out here again from the sign's settings and
// stored as a guide for the shop; the customer is reminded of it only when
// their account was allowed to see prices in the first place.

export const runtime = "nodejs";

const MAX = { name: 120, email: 200, phone: 32, note: 2000 };

function clean(value: FormDataEntryValue | null, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Honeypot, as on the contact form: a bot is told it worked and nothing is kept.
  if (clean(form.get("website"), 100)) return NextResponse.json({ ok: true });

  const name = clean(form.get("name"), MAX.name);
  const email = clean(form.get("email"), MAX.email);
  const phone = clean(form.get("phone"), MAX.phone);
  const note = clean(form.get("note"), MAX.note);
  if (!name || !email || !phone) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  const logo = form.get("logo");
  if (!logo || typeof logo === "string" || logo.size === 0) {
    return NextResponse.json({ error: "logo_required" }, { status: 400 });
  }
  const filename = (logo.name || "logo").replace(/[\r\n"\\/]/g, "_").slice(0, 150);
  if (!isLogoFile(filename)) return NextResponse.json({ error: "logo_type" }, { status: 400 });
  if (logo.size > MAX_LOGO_BYTES) return NextResponse.json({ error: "logo_too_big" }, { status: 413 });

  // The sign, checked like any cart line — the rules that read the text
  // (alurol's capitals or lower case) read a logo as capitals.
  let rawConfig: unknown = null;
  try {
    rawConfig = JSON.parse(clean(form.get("config"), 4000));
  } catch {
    rawConfig = null;
  }
  const config = sanitizeConfig(
    rawConfig && typeof rawConfig === "object" ? { ...rawConfig, text: LOGO_RULE_TEXT } : null,
  );
  if (!config) return NextResponse.json({ error: "invalid_config" }, { status: 400 });

  const size = readSize(form.get("size"), config.height);
  if (!size) return NextResponse.json({ error: "invalid_size" }, { status: 400 });

  const session = await getUserSession().catch(() => null);
  const showPrice = session ? await isVerified(session.userId).catch(() => false) : false;
  const priceCents = calculatePrice(config, size) * 100;
  const preview = readPreview(form.get("preview"));
  const logoFile = {
    filename,
    contentType: logo.type || "application/octet-stream",
    content: Buffer.from(await logo.arrayBuffer()),
  };

  let id: number;
  try {
    id = await createLogoConsultation({
      userId: session?.userId ?? null,
      name, email, phone, note,
      config: { ...config, text: "Logo" },
      widthMm: size.widthMm,
      heightMm: size.heightMm,
      priceCents,
      logo: logoFile,
      preview,
    });
  } catch {
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  const mail = {
    id, name, email, phone, note,
    config,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    priceCents,
    logo: logoFile,
    preview,
  };
  after(() => Promise.all([mailShopLogoConsultation(mail), mailLogoConsultationReceived(mail, showPrice)]));

  return NextResponse.json({ ok: true, id });
}

/**
 * The logo's measurements from the configurator. They come from the browser
 * (only it has traced the logo), so they are bounded to what a sign can be
 * and tied to the height the config itself says.
 */
function readSize(raw: FormDataEntryValue | null, heightMm: number): SignSize | null {
  if (typeof raw !== "string") return null;
  let s: Partial<Record<keyof SignSize, unknown>>;
  try {
    s = JSON.parse(raw.slice(0, 1000));
  } catch {
    return null;
  }
  const num = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
  const aspect = num(Number(s.widthMm) / Number(s.heightMm), 0.02, 50);
  const inkRatio = num(s.inkRatio, 0.01, 1);
  const parts = num(Number(s.letterAreaM2) / ((heightMm * heightMm) / 1_000_000), 0.001, 100);
  if (aspect === null || inkRatio === null || parts === null) return null;
  const widthMm = aspect * heightMm;
  return {
    widthMm,
    heightMm,
    inkRatio,
    letterAreaM2: (parts * heightMm * heightMm) / 1_000_000,
    maxLetterWidthMm: Math.min(widthMm, num(s.maxLetterWidthMm, 0, 100_000) ?? widthMm),
    maxLetterHeightMm: Math.min(heightMm, num(s.maxLetterHeightMm, 0, 100_000) ?? heightMm),
  };
}
