import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";

// Deliberately a client-fetched endpoint rather than a server-side
// getUserSession() call inside shared layout (Header) or page (HeroConfigurator)
// components — reading the cookie there would force every page that renders
// them (i.e. the whole site) to opt out of static rendering. Header and
// the cart checkout call this instead, so home/blog/legal pages stay static.
export async function GET() {
  const session = await getUserSession();
  return NextResponse.json({
    user: session ? { name: session.name, email: session.email } : null,
  });
}
