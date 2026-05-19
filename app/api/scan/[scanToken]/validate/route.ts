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
    include: {
      category: { select: { name: true } },
      order: { select: { buyerName: true } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ status: "not_found" });
  }

  if (ticket.eventId !== scanAccess.eventId) {
    return NextResponse.json({ status: "wrong_event" });
  }

  if (ticket.status === "cancelled") {
    return NextResponse.json({ status: "cancelled" });
  }

  if (ticket.status === "used") {
    return NextResponse.json({
      status: "already_used",
      usedAt: ticket.usedAt?.toISOString() ?? null,
      buyerName: ticket.order.buyerName,
      categoryName: ticket.category.name,
    });
  }

  // status === "issued"
  return NextResponse.json({
    status: "valid",
    buyerName: ticket.order.buyerName,
    categoryName: ticket.category.name,
  });
}
