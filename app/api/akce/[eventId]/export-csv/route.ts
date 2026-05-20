import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvEscape).join(",");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { eventId } = await params;

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: session.organizer.id },
    select: { id: true, title: true },
  });

  if (!event) return NextResponse.json({ error: "Akce nenalezena." }, { status: 404 });

  const orders = await db.order.findMany({
    where: { eventId },
    include: {
      tickets: {
        select: { id: true, token: true, status: true, categoryId: true },
      },
      paymentRecords: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const categoryIds = [...new Set(orders.flatMap((o) => o.tickets.map((t) => t.categoryId)))];
  const categories = await db.ticketCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const header = csvRow([
    "Datum objednávky",
    "ID objednávky",
    "Jméno",
    "E-mail",
    "Typ vstupenky",
    "Počet ks",
    "Cena (Kč)",
    "Stav objednávky",
    "Stav platby",
    "Variabilní symbol",
    "ID vstupenky",
    "Token vstupenky (QR)",
    "Stav vstupenky",
  ]);

  const rows: string[] = [header];

  for (const order of orders) {
    const paymentStatus = order.paymentRecords[0]?.status ?? "";
    const ticketCategoryName =
      order.tickets.length > 0
        ? (categoryMap[order.tickets[0].categoryId] ?? "")
        : "";

    if (order.tickets.length === 0) {
      rows.push(
        csvRow([
          new Date(order.createdAt).toLocaleString("cs-CZ"),
          order.id,
          order.buyerName,
          order.buyerEmail,
          ticketCategoryName,
          order.quantity,
          order.totalAmountCzk,
          order.status,
          paymentStatus,
          order.variableSymbol,
          "",
          "",
          "",
        ])
      );
    } else {
      for (const ticket of order.tickets) {
        rows.push(
          csvRow([
            new Date(order.createdAt).toLocaleString("cs-CZ"),
            order.id,
            order.buyerName,
            order.buyerEmail,
            categoryMap[ticket.categoryId] ?? "",
            order.quantity,
            order.totalAmountCzk,
            order.status,
            paymentStatus,
            order.variableSymbol,
            ticket.id,
            ticket.token,
            ticket.status,
          ])
        );
      }
    }
  }

  const csv = rows.join("\n");
  const filename = `objednavky-${event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
