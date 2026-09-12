import { NextResponse } from "next/server";
import { USER_SESSION_COOKIE } from "@/lib/user-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_SESSION_COOKIE);
  return res;
}
