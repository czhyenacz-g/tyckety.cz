import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeNext } from "@/lib/safe-redirect";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const invalid = NextResponse.redirect(new URL("/prihlaseni?error=expired", req.url));

  if (!token) return invalid;

  const magicToken = await db.magicLinkToken.findUnique({ where: { token } });

  if (!magicToken || magicToken.usedAt || magicToken.expiresAt < new Date()) {
    return invalid;
  }

  await db.magicLinkToken.update({
    where: { id: magicToken.id },
    data: { usedAt: new Date() },
  });

  const session = await db.session.create({
    data: {
      organizerId: magicToken.organizerId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dní
    },
  });

  const response = NextResponse.redirect(new URL(next, req.url));
  response.cookies.set("session", session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
