import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { isVerified } from "@/lib/email-verification.server";

export const runtime = "nodejs";

// Deliberately a client-fetched endpoint rather than a server-side
// getUserSession() call inside shared layout (Header) or page (HeroConfigurator)
// components — reading the cookie there would force every page that renders
// them (i.e. the whole site) to opt out of static rendering. Header and
// the cart checkout call this instead, so home/blog/legal pages stay static.
export async function GET() {
  const session = await getUserSession();
  // Whether the e-mail is confirmed yet — ordering waits for it. A database
  // hiccup must not sign anyone out, so it then counts as confirmed and the
  // order endpoint has the final word.
  const verified = session ? await isVerified(session.userId).catch(() => true) : false;
  return NextResponse.json({
    user: session ? { name: session.name, email: session.email, verified } : null,
  });
}
