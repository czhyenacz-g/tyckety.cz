import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";

function generateVariableSymbol(): string {
  const ts = (Date.now() % 10_000_000).toString().padStart(7, "0");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${ts}${rand}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { eventId, categoryId, buyerName, buyerEmail, quantity } = body;

  const qty = Number(quantity);
  if (!eventId || !categoryId || !buyerName?.trim() || !buyerEmail?.trim() || !qty || qty < 1 || qty > 10) {
    return NextResponse.json({ error: "Neplatné údaje objednávky." }, { status: 400 });
  }

  // Lazy expiration: uvolni kapacitu po propadlých pending objednávkách
  await expireStaleOrders(eventId);

  try {
    const order = await db.$transaction(
      async (tx) => {
        const category = await tx.ticketCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, eventId: true, capacity: true, soldCount: true, priceCzk: true },
        });

        if (!category || category.eventId !== eventId) {
          throw new Error("invalid_category");
        }

        // Rezervace aktivních pending objednávek (deadline ještě neuplynul)
        const reservedResult = await tx.order.aggregate({
          where: {
            eventId,
            status: "awaiting_payment",
            paymentDisplayDeadlineAt: { gt: new Date() },
          },
          _sum: { quantity: true },
        });
        const reserved = reservedResult._sum.quantity ?? 0;

        // soldCount = potvrzené vstupenky; reserved = pending rezervace
        const available = category.capacity - category.soldCount - reserved;
        if (available < qty) {
          throw new Error("no_capacity");
        }

        const vs = generateVariableSymbol();

        // Tickety se nevytvářejí tady — až při "Vystavit vstupenky"
        const newOrder = await tx.order.create({
          data: {
            eventId,
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim().toLowerCase(),
            status: "awaiting_payment",
            quantity: qty,
            totalAmountCzk: category.priceCzk * qty,
            variableSymbol: vs,
            paymentDisplayDeadlineAt: new Date(Date.now() + 15 * 60 * 1000),
            paymentGraceDeadlineAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        });

        return newOrder;
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json({ orderToken: order.publicToken }, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "no_capacity") {
        return NextResponse.json({ error: "Kapacita vstupenek je vyčerpána." }, { status: 409 });
      }
      if (err.message === "invalid_category") {
        return NextResponse.json({ error: "Kategorie vstupenky nenalezena." }, { status: 404 });
      }
    }
    console.error("[objednavka]", err);
    return NextResponse.json({ error: "Interní chyba, zkuste to znovu." }, { status: 500 });
  }
}
