import { NextResponse } from "next/server";

// The reCAPTCHA site key, read when asked — not baked into the page when the
// site is built. A NEXT_PUBLIC_ variable is inlined at build time, so a key
// added in Vercel only reached the pages after a fresh build; asked for here,
// it works as soon as it is set. The site key is public by design (Google
// shows it in every page that uses it); the secret never leaves the server.
export async function GET(req: Request) {
  void req; // a request-time handler, never prerendered
  const siteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    "";
  return NextResponse.json({ siteKey }, { headers: { "Cache-Control": "no-store" } });
}
