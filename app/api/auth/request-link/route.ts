import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

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

  const link = `${req.nextUrl.origin}/api/auth/verify?token=${magicToken.token}`;

  // TODO: V produkci odeslat e-mail s odkazem (např. přes Resend.com nebo SendGrid).
  //       Stačí: resend.emails.send({ to: email, subject: "Přihlašovací odkaz", html: `<a href="${link}">Přihlásit se</a>` })
  console.log(`[magic-link] ${email} → ${link}`);

  return NextResponse.json({ link });
}
