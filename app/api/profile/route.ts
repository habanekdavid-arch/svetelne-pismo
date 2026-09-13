import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/user-auth";
import { getUserProfile, saveUserProfile, toProfile, EMPTY_PROFILE } from "@/lib/profile";

// The customer's own invoicing/delivery details. Both handlers read the
// session cookie themselves (lib/user-auth.ts) — a route handler is its own
// endpoint and must never rely on a page-level gate — and both work only on
// the caller's own row, so there is no id to tamper with in the request.

export async function GET() {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = (await getUserProfile(session.userId)) ?? EMPTY_PROFILE;
  return NextResponse.json({ profile });
}

export async function PUT(req: Request) {
  const session = await getUserSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const profile = toProfile(body?.profile);

  if (profile.accountType === "COMPANY" && (!profile.companyName || !profile.ico)) {
    return NextResponse.json({ error: "missing_company" }, { status: 400 });
  }

  await saveUserProfile(session.userId, profile);
  return NextResponse.json({ profile });
}
