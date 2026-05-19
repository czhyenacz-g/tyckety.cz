import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, startsAt, venueName, venueAddress, description, priceCzk, capacity, bankAccount, notificationEmail } = body;

  if (!title?.trim() || !startsAt || !venueName?.trim() || !priceCzk || !capacity) {
    return NextResponse.json({ error: "Vyplňte povinná pole." }, { status: 400 });
  }

  const price = Number(priceCzk);
  const cap = Number(capacity);
  if (isNaN(price) || price < 0 || isNaN(cap) || cap < 1) {
    return NextResponse.json({ error: "Neplatná cena nebo kapacita." }, { status: 400 });
  }

  // Update organizer contact details if changed
  const orgUpdates: Record<string, string> = {};
  if (bankAccount?.trim()) orgUpdates.bankAccount = bankAccount.trim();
  if (notificationEmail?.trim()) orgUpdates.notificationEmail = notificationEmail.trim();
  if (Object.keys(orgUpdates).length > 0) {
    await db.organizer.update({ where: { id: session.organizer.id }, data: orgUpdates });
  }

  const slug = `${toSlug(title)}-${Math.random().toString(36).slice(2, 6)}`;

  const event = await db.event.create({
    data: {
      organizerId: session.organizer.id,
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      startsAt: new Date(startsAt),
      venueName: venueName.trim(),
      venueAddress: venueAddress?.trim() || null,
      status: "draft",
    },
  });

  // Jedna výchozí kategorie — model podporuje více kategorií pro budoucí rozšíření
  await db.ticketCategory.create({
    data: {
      eventId: event.id,
      name: "Základní vstupenka",
      priceCzk: price,
      capacity: cap,
    },
  });

  // Scan token pro vstupní kontrolu
  await db.scanAccessToken.create({
    data: { eventId: event.id },
  });

  return NextResponse.json({ eventId: event.id }, { status: 201 });
}
