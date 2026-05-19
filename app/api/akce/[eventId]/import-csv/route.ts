import { NextResponse } from "next/server";
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
  if (csvContent.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "CSV je příliš velký (max 5 MB)" }, { status: 413 });
  }

  const { payments, errors: parseErrors } = parseRaiffeisenCsv(csvContent);

  const [orders, org, existingTxRecords] = await Promise.all([
    db.order.findMany({
      where: { eventId },
      select: {
        id: true,
        variableSymbol: true,
        totalAmountCzk: true,
        status: true,
        buyerName: true,
        paymentGraceDeadlineAt: true,
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
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "unknown_symbol",
      });
      continue;
    }

    // Order found — categorize
    if (PAID_STATUSES.includes(order.status)) {
      alreadyPaid++;
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
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "late_payment",
        buyerName: order.buyerName,
      });
      continue;
    }

    // Matchable status — check amount
    if (payment.amountCzk !== order.totalAmountCzk) {
      amountMismatch++;
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
      details.push({
        transactionId: payment.transactionId,
        variableSymbol: payment.variableSymbol,
        amountCzk: payment.amountCzk,
        result: "amount_mismatch",
        buyerName: order.buyerName,
      });
      continue;
    }

    // Exact match — create PaymentRecord + mark order as paid
    matched++;
    matchedAmountCzk += payment.amountCzk;
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
      db.order.update({
        where: { id: order.id },
        data: { status: "paid" },
      }),
    ]);
    existingTxIds.add(payment.transactionId);
    // Update local map so subsequent rows don't re-match the same order
    order.status = "paid";
    details.push({
      transactionId: payment.transactionId,
      variableSymbol: payment.variableSymbol,
      amountCzk: payment.amountCzk,
      result: "matched",
      buyerName: order.buyerName,
    });
  }

  return NextResponse.json({
    summary: {
      processed: payments.length,
      matched,
      amountMismatch,
      unknownSymbol,
      missingSymbol,
      latePayment,
      alreadyPaid,
      duplicates,
      parseErrors: parseErrors.length,
      totalAmountCzk,
      matchedAmountCzk,
    },
    details,
    parseErrors,
  });
}
