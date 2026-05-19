import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enqueueAndTrySend } from "@/lib/email/outbox";
import { ticketsIssuedTemplate } from "@/lib/email/templates";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { orderId } = await params;

  // Ověření vlastnictví objednávky před transakcí
  const orderCheck = await db.order.findFirst({
    where: { id: orderId, event: { organizerId: session.organizer.id } },
    select: { id: true },
  });
  if (!orderCheck) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

  try {
    const result = await db.$transaction(async (tx) => {
      // Znovu načti stav uvnitř transakce — guard proti double-click / race condition
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { event: { include: { ticketCategories: { take: 1 } } } },
      });

      if (!order) throw new Error("not_found");

      if (order.status === "tickets_issued") throw new Error("already_issued");
      if (order.status !== "paid") throw new Error("not_paid");

      const category = order.event.ticketCategories[0];
      if (!category) throw new Error("no_category");

      // Zpětná kompatibilita: tickety byly vytvořeny ve starém toku — jen aktualizuj status
      const existingCount = await tx.ticket.count({ where: { orderId: order.id } });
      if (existingCount > 0) {
        await tx.order.update({ where: { id: orderId }, data: { status: "tickets_issued" } });
        return { qty: 0 };
      }

      const qty = order.quantity;

      await tx.ticket.createMany({
        data: Array.from({ length: qty }, () => ({
          orderId: order.id,
          eventId: order.eventId,
          categoryId: category.id,
          token: randomUUID(),
          status: "issued" as const,
        })),
      });
      await tx.ticketCategory.update({
        where: { id: category.id },
        data: { soldCount: { increment: qty } },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: "tickets_issued" },
      });

      return { qty };
    });

    // Send email fire-and-forget — never crash ticket issuance
    const orderData = await db.order.findUnique({
      where: { id: orderId },
      select: {
        buyerName: true,
        buyerEmail: true,
        quantity: true,
        publicToken: true,
        event: { select: { id: true, title: true, startsAt: true, venueName: true } },
      },
    });
    if (orderData) {
      const appUrl = process.env.APP_URL ?? "https://tyckety.cz";
      const { subject, html } = ticketsIssuedTemplate({
        buyerName: orderData.buyerName,
        eventTitle: orderData.event.title,
        eventDate: new Date(orderData.event.startsAt).toLocaleDateString("cs-CZ", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        venueName: orderData.event.venueName,
        quantity: orderData.quantity,
        orderUrl: `${appUrl}/objednavka/${orderData.publicToken}`,
      });
      await enqueueAndTrySend({
        type: "tickets_issued_customer",
        to: orderData.buyerEmail,
        subject,
        html,
        orderId,
        eventId: orderData.event.id,
      });
    }

    return NextResponse.json({ ok: true, qty: result.qty });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "already_issued")
        return NextResponse.json({ error: "Vstupenky již vystaveny" }, { status: 409 });
      if (err.message === "not_paid")
        return NextResponse.json({ error: "Objednávka musí být nejprve označena jako zaplacená" }, { status: 409 });
      if (err.message === "not_found")
        return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });
      if (err.message === "no_category")
        return NextResponse.json({ error: "Kategorie vstupenek nenalezena" }, { status: 500 });
    }
    console.error("[issue-tickets]", err);
    return NextResponse.json({ error: "Interní chyba" }, { status: 500 });
  }
}
