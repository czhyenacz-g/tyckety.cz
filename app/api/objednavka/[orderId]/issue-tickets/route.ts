import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { orderId } = await params;

  const order = await db.order.findFirst({
    where: { id: orderId, event: { organizerId: session.organizer.id } },
    include: {
      event: { include: { ticketCategories: { take: 1 } } },
    },
  });

  if (!order) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

  if (order.status === "tickets_issued") {
    return NextResponse.json({ error: "Vstupenky již vystaveny" }, { status: 409 });
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { error: "Objednávka musí být nejprve označena jako zaplacená" },
      { status: 409 },
    );
  }

  const category = order.event.ticketCategories[0];
  if (!category) {
    return NextResponse.json({ error: "Kategorie vstupenek nenalezena" }, { status: 500 });
  }

  // Počet vstupenek: z order.quantity (nový tok) nebo z existujících tiketů (starý tok)
  const existingTicketCount = await db.ticket.count({ where: { orderId: order.id } });

  if (existingTicketCount > 0) {
    // Zpětná kompatibilita: tickety byly vytvořeny v starém toku — jen aktualizuj status
    await db.order.update({ where: { id: orderId }, data: { status: "tickets_issued" } });
    return NextResponse.json({ ok: true });
  }

  const qty = order.quantity;

  // Vytvořit tickety + navýšit soldCount + aktualizovat status objednávky
  await db.$transaction([
    db.ticket.createMany({
      data: Array.from({ length: qty }, () => ({
        orderId: order.id,
        eventId: order.eventId,
        categoryId: category.id,
        token: randomUUID(),
        status: "issued" as const,
      })),
    }),
    db.ticketCategory.update({
      where: { id: category.id },
      data: { soldCount: { increment: qty } },
    }),
    db.order.update({
      where: { id: orderId },
      data: { status: "tickets_issued" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
