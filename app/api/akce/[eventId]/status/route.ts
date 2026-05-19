import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID = ["draft", "published", "cancelled", "ended"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { eventId } = await params;
  const { status } = await req.json().catch(() => ({}));

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });
  }

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: session.organizer.id },
    select: { id: true },
  });

  if (!event) return NextResponse.json({ error: "Akce nenalezena." }, { status: 404 });

  await db.event.update({ where: { id: eventId }, data: { status } });

  return NextResponse.json({ ok: true });
}
