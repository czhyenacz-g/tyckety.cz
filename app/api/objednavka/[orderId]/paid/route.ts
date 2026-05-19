import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const EXPIRED_STATUSES = ["payment_window_expired", "expired"] as const;

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { orderId } = await params;

  const order = await db.order.findFirst({
    where: { id: orderId, event: { organizerId: session.organizer.id } },
    select: { id: true, status: true, quantity: true, eventId: true },
  });

  if (!order) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

  if (order.status === "paid" || order.status === "tickets_issued") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  // Capacity guard — only for expired orders whose reservation was released
  if ((EXPIRED_STATUSES as readonly string[]).includes(order.status)) {
    const event = await db.event.findUnique({
      where: { id: order.eventId },
      select: { ticketCategories: { select: { capacity: true, soldCount: true } } },
    });
    if (event) {
      const totalCapacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
      const totalSold = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);
      if (order.quantity > totalCapacity - totalSold) {
        return NextResponse.json(
          { error: "Pro tuto objednávku už není dostupná kapacita. Vyřešte ji ručně." },
          { status: 409 }
        );
      }
    }
  }

  await db.order.update({
    where: { id: orderId },
    data: { status: "paid" },
  });

  return NextResponse.json({ ok: true });
}
