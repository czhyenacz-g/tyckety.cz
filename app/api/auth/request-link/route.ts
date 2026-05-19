import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueAndTrySend } from "@/lib/email/outbox";
import { magicLinkTemplate } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const next =
    typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Neplatný e-mail." }, { status: 400 });
  }

  let organizer = await db.organizer.findUnique({ where: { email } });

  if (!organizer) {
    const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-");
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    organizer = await db.organizer.create({
      data: {
        email,
        name: base,
        slug,
        bankAccount: "",
        notificationEmail: email,
      },
    });
  }

  // Invalidate existing unused tokens for this organizer
  await db.magicLinkToken.updateMany({
    where: { organizerId: organizer.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const magicToken = await db.magicLinkToken.create({
    data: {
      organizerId: organizer.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minut
    },
  });

  const linkUrl = new URL(`/api/auth/verify`, req.nextUrl.origin);
  linkUrl.searchParams.set("token", magicToken.token);
  if (next) linkUrl.searchParams.set("next", next);
  const link = linkUrl.toString();

  const { subject, html } = magicLinkTemplate(link);
  try {
    await enqueueAndTrySend({ type: "magic_link", to: email, subject, html });
  } catch (err) {
    console.error("[request-link:email]", err);
  }

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json(isDev ? { link } : { ok: true });
}
