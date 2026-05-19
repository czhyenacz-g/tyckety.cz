import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseRaiffeisenCsv } from "@/lib/csv/raiffeisen";
import { OrderStatus } from "@prisma/client";

interface ImportDetail {
  transactionId: string;
  variableSymbol: string | null;
  amountCzk: number;
  result: string;
  buyerName?: string;
}

const PAID_STATUSES: OrderStatus[] = ["paid", "tickets_issued"];
const LATE_STATUSES: OrderStatus[] = ["expired", "payment_received_late"];
const UNPAID_STATUSES: OrderStatus[] = ["awaiting_payment", "payment_window_expired"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { eventId } = await params;
  const { organizer } = session;

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Akce nenalezena" }, { status: 404 });

  let body: { csvContent?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatné tělo požadavku" }, { status: 400 });
  }

  const { csvContent } = body;
  if (!csvContent || typeof csvContent !== "string") {
    return NextResponse.json({ error: "csvContent je povinný" }, { status: 400 });
  }
  if (csvContent.length > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "CSV je příliš velký (max 2 MB)" }, { status: 413 });
  }

  const parseResult = parseRaiffeisenCsv(csvContent);

  if (parseResult.unsupportedFormat) {
    const missing = parseResult.unsupportedFormat.missingHeaders.join(", ");
    return NextResponse.json(
      {
        error: `Tento CSV formát zatím neumíme automaticky zpracovat. Podporovaný formát: CSV export pohybů z Raiffeisenbank. Chybějící sloupce: ${missing}.`,
        unsupportedFormat: true,
        missingHeaders: parseResult.unsupportedFormat.missingHeaders,
      },
      { status: 422 }
    );
  }

  const { payments, errors: parseErrors } = parseResult;

  const [orders, org, existingTxRecords, ticketCategories] = await Promise.all([
    db.order.findMany({
      where: { eventId },
      select: {
        id: true,
        variableSymbol: true,
        totalAmountCzk: true,
        status: true,
        buyerName: true,
        paymentGraceDeadlineAt: true,
        quantity: true,
      },
    }),
    db.organizer.findUnique({
      where: { id: organizer.id },
      select: { bankAccount: true },
    }),
    db.paymentRecord.findMany({
      where: { organizerId: organizer.id, transactionId: { not: null } },
      select: { transactionId: true },
    }),
    db.ticketCategory.findMany({
      where: { eventId },
      select: { capacity: true, soldCount: true },
    }),
  ]);

  const ordersByVs = new Map(orders.map((o) => [o.variableSymbol, o]));
  const orgAccountPrefix = org?.bankAccount?.split("/")[0] ?? "";
  const existingTxIds = new Set(existingTxRecords.map((r) => r.transactionId!));

  let matched = 0;
  let amountMismatch = 0;
  let unknownSymbol = 0;
  let missingSymbol = 0;
  let latePayment = 0;
  let alreadyPaid = 0;
  let duplicates = 0;
  let totalAmountCzk = 0;
  let matchedAmountCzk = 0;
  let newlyPaidTicketsQuantity = 0;
  const details: ImportDetail[] = [];

  for (const payment of payments) {
    totalAmountCzk += payment.amountCzk;

    if (existingTxIds.has(payment.transactionId)) {
      duplicates++;
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "duplicate",
      });
      continue;
    }

    // Account ownership check
    if (orgAccountPrefix) {
      const paymentPrefix = payment.ownAccount.split("/")[0];
      if (paymentPrefix !== orgAccountPrefix) {
        details.push({
          transactionId: payment.transactionId,
          variableSymbol: payment.variableSymbol,
          amountCzk: payment.amountCzk,
          result: "wrong_account",
        });
        existingTxIds.add(payment.transactionId);
        continue;
      }
    }

    // Missing VS
    if (!payment.variableSymbol) {
      missingSymbol++;
      try {
        await db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            amountCzk: payment.amountCzk,
            variableSymbol: "",
            status: "missing_symbol",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
          },
        });
        existingTxIds.add(payment.transactionId);
      } catch (err) {
        if (isUniqueConstraintError(err)) { duplicates++; missingSymbol--; }
      }
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: null,
        amountCzk: payment.amountCzk,
        result: "missing_symbol",
      });
      continue;
    }

    const order = ordersByVs.get(payment.variableSymbol);

    if (!order) {
      unknownSymbol++;
      try {
        await db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            amountCzk: payment.amountCzk,
            variableSymbol: payment.variableSymbol,
            status: "unknown_symbol",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
          },
        });
        existingTxIds.add(payment.transactionId);
      } catch (err) {
        if (isUniqueConstraintError(err)) { duplicates++; unknownSymbol--; }
      }
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "unknown_symbol",
      });
      continue;
    }

    if (PAID_STATUSES.includes(order.status)) {
      alreadyPaid++;
      try {
        await db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            orderId: order.id,
            amountCzk: payment.amountCzk,
            variableSymbol: payment.variableSymbol,
            status: "already_paid",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
          },
        });
        existingTxIds.add(payment.transactionId);
      } catch (err) {
        if (isUniqueConstraintError(err)) { duplicates++; alreadyPaid--; }
      }
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "already_paid",
        buyerName: order.buyerName,
      });
      continue;
    }

    if (LATE_STATUSES.includes(order.status)) {
      latePayment++;
      try {
        await db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            orderId: order.id,
            amountCzk: payment.amountCzk,
            variableSymbol: payment.variableSymbol,
            status: "late_payment",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
          },
        });
        existingTxIds.add(payment.transactionId);
      } catch (err) {
        if (isUniqueConstraintError(err)) { duplicates++; latePayment--; }
      }
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "late_payment",
        buyerName: order.buyerName,
      });
      continue;
    }

    if (payment.amountCzk !== order.totalAmountCzk) {
      amountMismatch++;
      try {
        await db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            orderId: order.id,
            amountCzk: payment.amountCzk,
            variableSymbol: payment.variableSymbol,
            status: "amount_mismatch",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
            note: `Očekáváno: ${order.totalAmountCzk} Kč, přijato: ${payment.amountCzk} Kč`,
          },
        });
        existingTxIds.add(payment.transactionId);
      } catch (err) {
        if (isUniqueConstraintError(err)) { duplicates++; amountMismatch--; }
      }
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "amount_mismatch",
        buyerName: order.buyerName,
      });
      continue;
    }

    // Exact match — transaction: create PaymentRecord + update Order
    // Order.update uses status guard so tickets_issued can never revert to paid
    try {
      await db.$transaction([
        db.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            orderId: order.id,
            amountCzk: payment.amountCzk,
            variableSymbol: payment.variableSymbol,
            status: "matched",
            transactionId: payment.transactionId,
            paymentDate: payment.paymentDate,
            counterpartyAccount: payment.counterpartyAccount,
            counterpartyName: payment.counterpartyName,
            source: "raiffeisenbank_csv",
          },
        }),
        db.order.updateMany({
          where: { id: order.id, status: { notIn: ["paid", "tickets_issued"] } },
          data: { status: "paid" },
        }),
      ]);
      matched++;
      matchedAmountCzk += payment.amountCzk;
      newlyPaidTicketsQuantity += order.quantity;
      existingTxIds.add(payment.transactionId);
      order.status = "paid";
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "matched",
        buyerName: order.buyerName,
      });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        duplicates++;
        details.push({
          transactionId: payment.transactionId,
          variableSymbol: payment.variableSymbol,
          amountCzk: payment.amountCzk,
          result: "duplicate",
        });
      }
    }
  }

  // Post-loop stats
  const stillUnpaidOrders = orders.filter((o) => UNPAID_STATUSES.includes(o.status));
  const stillUnpaidOrdersCount = stillUnpaidOrders.length;
  const stillUnpaidTicketsQuantity = stillUnpaidOrders.reduce((s, o) => s + o.quantity, 0);

  const totalPaidTicketsQuantity = orders
    .filter((o) => PAID_STATUSES.includes(o.status))
    .reduce((s, o) => s + o.quantity, 0);

  const totalCapacity = ticketCategories.reduce((s, c) => s + c.capacity, 0);
  const totalSold = ticketCategories.reduce((s, c) => s + c.soldCount, 0);
  const remainingCapacity = Math.max(0, totalCapacity - totalSold - stillUnpaidTicketsQuantity);

  const errorCount = amountMismatch + missingSymbol + unknownSymbol + latePayment;

  const parts: string[] = [];
  if (matched > 0) {
    parts.push(`Nově označeno ${newlyPaidTicketsQuantity} lístků jako zaplacených.`);
  }
  if (stillUnpaidOrdersCount > 0) {
    parts.push(`${stillUnpaidTicketsQuantity} lístků stále čeká na platbu.`);
  }
  if (totalPaidTicketsQuantity > 0) {
    parts.push(`Celkem je zaplaceno ${totalPaidTicketsQuantity} lístků.`);
  }
  parts.push(`Zbývá volných ${remainingCapacity} míst.`);
  if (errorCount > 0) {
    parts.push(`U ${errorCount} plateb je potřeba ruční kontrola.`);
  }
  const humanSummary = parts.join(" ");

  return NextResponse.json({
    summary: {
      processed: payments.length,
      matched,
      newlyPaidOrdersCount: matched,
      newlyPaidTicketsQuantity,
      amountMismatch,
      unknownSymbol,
      missingSymbol,
      latePayment,
      alreadyPaid,
      duplicates,
      parseErrors: parseErrors.length,
      totalAmountCzk,
      matchedAmountCzk,
      stillUnpaidOrdersCount,
      stillUnpaidTicketsQuantity,
      totalPaidTicketsQuantity,
      remainingCapacity,
      errorCount,
      rowsWithMissingSymbol: missingSymbol,
      rowsWithAmountMismatch: amountMismatch,
      rowsWithUnknownSymbol: unknownSymbol,
      duplicatePaymentsCount: duplicates,
    },
    humanSummary,
    details,
    parseErrors,
  });
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
