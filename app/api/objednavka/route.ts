import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateVariableSymbol(): string {
  // 10-místný variabilní symbol: 7 číslic z timestampu + 3 náhodné
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

  try {
    // Serializable isolation zajišťuje konzistentní kontrolu kapacity při souběžných požadavcích
    const order = await db.$transaction(
      async (tx) => {
        const category = await tx.ticketCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, eventId: true, capacity: true, soldCount: true, priceCzk: true },
        });

        if (!category || category.eventId !== eventId) {
          throw new Error("invalid_category");
        }

        const available = category.capacity - category.soldCount;
        if (available < qty) {
          throw new Error("no_capacity");
        }

        const vs = generateVariableSymbol();

        const newOrder = await tx.order.create({
          data: {
            eventId,
            buyerName: buyerName.trim(),
            buyerEmail: buyerEmail.trim().toLowerCase(),
            status: "awaiting_payment",
            totalAmountCzk: category.priceCzk * qty,
            variableSymbol: vs,
            paymentDisplayDeadlineAt: new Date(Date.now() + 15 * 60 * 1000),  // 15 min zobrazený deadline
            paymentGraceDeadlineAt: new Date(Date.now() + 60 * 60 * 1000),    // 60 min interní lhůta
          },
        });

        await tx.ticket.createMany({
          data: Array.from({ length: qty }, () => ({
            orderId: newOrder.id,
            eventId,
            categoryId,
            status: "issued" as const,
          })),
        });

        // Kapacita blokována hned po objednávce — soldCount zahrnuje i nezaplacené objednávky v lhůtě
        await tx.ticketCategory.update({
          where: { id: categoryId },
          data: { soldCount: { increment: qty } },
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
