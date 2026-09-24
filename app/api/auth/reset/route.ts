import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readResetToken } from "@/lib/password-reset.server";

// Sets the new password from a reset link (app/api/auth/forgot). The token is
// checked against the account's current password, so it cannot be used twice.

export const runtime = "nodejs";

const MIN_PASSWORD = 8;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const userId = await readResetToken(token, async (id) => {
    const u = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    return u?.passwordHash ?? null;
  });
  if (!userId) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return NextResponse.json({ ok: true });
}
