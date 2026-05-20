import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { enqueueAndTrySend } from "@/lib/email/outbox";
import { orderCreatedCustomerTemplate, orderCreatedOrganizerTemplate } from "@/lib/email/templates";

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

  const MAX_VS_RETRIES = 3;

  // Step 1: create order — retry loop only covers DB transaction
  let createdOrder: {
    id: string; publicToken: string; buyerName: string; buyerEmail: string;
    quantity: number; totalAmountCzk: number; variableSymbol: string;
    paymentDisplayDeadlineAt: Date;
  } | null = null;

  for (let attempt = 0; attempt < MAX_VS_RETRIES; attempt++) {
    try {
      createdOrder = await db.$transaction(
        async (tx) => {
          const category = await tx.ticketCategory.findUnique({
            where: { id: categoryId },
            select: { id: true, eventId: true, capacity: true, soldCount: true, priceCzk: true },
          });

          if (!category || category.eventId !== eventId) {
            throw new Error("invalid_category");
          }

          const event = await tx.event.findUnique({
            where: { id: eventId },
            select: { status: true },
          });

          if (!event || event.status !== "published") {
            throw new Error("event_not_published");
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
          return tx.order.create({
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
        },
        { isolationLevel: "Serializable" },
      );
      break; // order created — exit retry loop
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "no_capacity") {
          return NextResponse.json({ error: "Kapacita vstupenek je vyčerpána." }, { status: 409 });
        }
        if (err.message === "invalid_category") {
          return NextResponse.json({ error: "Kategorie vstupenky nenalezena." }, { status: 404 });
        }
        if (err.message === "event_not_published") {
          return NextResponse.json({ error: "Akce není dostupná pro objednávky." }, { status: 403 });
        }
      }
      // P2002 na variableSymbol — zkus znovu s novým VS
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        Array.isArray(err.meta?.target) &&
        (err.meta.target as string[]).includes("variableSymbol")
      ) {
        if (attempt < MAX_VS_RETRIES - 1) continue;
        return NextResponse.json({ error: "Chyba generování platebního symbolu, zkuste to znovu." }, { status: 500 });
      }
      console.error("[objednavka]", err);
      return NextResponse.json({ error: "Interní chyba, zkuste to znovu." }, { status: 500 });
    }
  }

  if (!createdOrder) {
    return NextResponse.json({ error: "Interní chyba, zkuste to znovu." }, { status: 500 });
  }

  // Step 2: send emails — completely isolated from order creation errors
  try {
    const eventData = await db.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        startsAt: true,
        venueName: true,
        organizer: { select: { notificationEmail: true, bankAccount: true } },
      },
    });

    if (eventData) {
      const appUrl = process.env.APP_URL ?? "https://tyckety.cz";
      const orderUrl = `${appUrl}/objednavka/${createdOrder.publicToken}`;
      const eventDate = new Date(eventData.startsAt).toLocaleDateString("cs-CZ", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const paymentDeadline = new Date(createdOrder.paymentDisplayDeadlineAt).toLocaleString("cs-CZ", {
        day: "numeric", month: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const customerEmail = orderCreatedCustomerTemplate({
        buyerName: createdOrder.buyerName,
        eventTitle: eventData.title,
        eventDate,
        venueName: eventData.venueName,
        quantity: createdOrder.quantity,
        totalAmountCzk: createdOrder.totalAmountCzk,
        variableSymbol: createdOrder.variableSymbol,
        bankAccount: eventData.organizer.bankAccount,
        orderUrl,
        paymentDeadline,
      });
      const organizerEmail = orderCreatedOrganizerTemplate({
        buyerName: createdOrder.buyerName,
        buyerEmail: createdOrder.buyerEmail,
        eventTitle: eventData.title,
        quantity: createdOrder.quantity,
        totalAmountCzk: createdOrder.totalAmountCzk,
        variableSymbol: createdOrder.variableSymbol,
        orderUrl,
      });

      await Promise.allSettled([
        enqueueAndTrySend({ type: "order_created_customer", to: createdOrder.buyerEmail, ...customerEmail, orderId: createdOrder.id, eventId }),
        enqueueAndTrySend({ type: "order_created_organizer", to: eventData.organizer.notificationEmail, ...organizerEmail, orderId: createdOrder.id, eventId }),
      ]);
    }
  } catch (err) {
    console.error("[objednavka:email]", err);
  }

  return NextResponse.json({ orderToken: createdOrder.publicToken }, { status: 201 });
}
