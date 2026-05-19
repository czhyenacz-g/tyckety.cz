import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scanToken: string }> }
) {
  const { scanToken } = await params;
  const { ticketToken } = await req.json();

  const scanAccess = await db.scanAccessToken.findUnique({
    where: { token: scanToken },
    select: { eventId: true, active: true },
  });

  if (!scanAccess || !scanAccess.active) {
    return NextResponse.json({ error: "Neplatný nebo neaktivní scan token." }, { status: 403 });
  }

  const ticket = await db.ticket.findUnique({
    where: { token: ticketToken },
    select: { id: true, eventId: true, status: true },
  });

  if (!ticket || ticket.eventId !== scanAccess.eventId) {
    return NextResponse.json({ error: "Vstupenka nenalezena." }, { status: 404 });
  }

  if (ticket.status !== "issued") {
    return NextResponse.json({ error: "Vstupenku nelze označit jako použitou.", status: ticket.status }, { status: 409 });
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: { status: "used", usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
