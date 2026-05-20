import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const NEEDS_CAPACITY_CHECK = [
  "payment_window_expired",
  "expired",
  "payment_received_late",
  "manual_review",
] as const;

const ALREADY_DONE = ["paid", "tickets_issued"] as const;

type ResultKind = "matched" | "already_paid" | "not_found" | "capacity_blocked";

interface CodeResult {
  code: string;
  result: ResultKind;
  buyerName?: string;
  amountCzk?: number;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { eventId } = await params;
  const { organizer } = session;

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, ticketCategories: { select: { capacity: true, soldCount: true } } },
  });
  if (!event) return NextResponse.json({ error: "Akce nenalezena" }, { status: 404 });

  let body: { codes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatné tělo požadavku" }, { status: 400 });
  }

  const rawCodes = typeof body.codes === "string" ? body.codes : "";
  if (!rawCodes.trim()) {
    return NextResponse.json({ error: "Žádné kódy ke zpracování" }, { status: 400 });
  }

  // Parse: split by comma, semicolon, whitespace, newlines
  const allTokens = rawCodes.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

  // Deduplicate and track which codes appeared more than once
  const seen = new Set<string>();
  const uniqueCodes: string[] = [];
  const duplicateInputCodes: string[] = [];

  for (const code of allTokens) {
    if (seen.has(code)) {
      if (!duplicateInputCodes.includes(code)) duplicateInputCodes.push(code);
    } else {
      seen.add(code);
      uniqueCodes.push(code);
    }
  }

  if (uniqueCodes.length === 0) {
    return NextResponse.json({ error: "Žádné platné kódy ke zpracování" }, { status: 400 });
  }

  // Fetch orders by variableSymbol first
  const ordersByVs = await db.order.findMany({
    where: { eventId, variableSymbol: { in: uniqueCodes } },
    select: {
      id: true,
      variableSymbol: true,
      publicToken: true,
      status: true,
      quantity: true,
      totalAmountCzk: true,
      buyerName: true,
    },
  });

  const codeToOrder = new Map<string, (typeof ordersByVs)[0]>();
  for (const o of ordersByVs) codeToOrder.set(o.variableSymbol, o);

  // Fallback: publicToken lookup for codes not matched by variableSymbol
  const unmatched = uniqueCodes.filter((c) => !codeToOrder.has(c));
  if (unmatched.length > 0) {
    const ordersByToken = await db.order.findMany({
      where: { eventId, publicToken: { in: unmatched } },
      select: {
        id: true,
        variableSymbol: true,
        publicToken: true,
        status: true,
        quantity: true,
        totalAmountCzk: true,
        buyerName: true,
      },
    });
    for (const o of ordersByToken) {
      // Key by the publicToken that was entered
      if (unmatched.includes(o.publicToken)) {
        codeToOrder.set(o.publicToken, o);
      }
    }
  }

  // Available capacity for expired orders (does not include pending reservations by design,
  // matching behavior of the single-order /paid endpoint)
  const totalCapacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
  const totalSold = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);
  let availableForExpired = totalCapacity - totalSold;

  // Process codes
  const results: CodeResult[] = [];
  let matched = 0;
  let alreadyPaid = 0;
  let notFound = 0;
  let capacityBlocked = 0;

  for (const code of uniqueCodes) {
    const order = codeToOrder.get(code);

    if (!order) {
      notFound++;
      results.push({ code, result: "not_found" });
      continue;
    }

    if ((ALREADY_DONE as readonly string[]).includes(order.status)) {
      alreadyPaid++;
      results.push({ code, result: "already_paid", buyerName: order.buyerName, amountCzk: order.totalAmountCzk });
      continue;
    }

    // Capacity guard for expired/late orders whose reservation was released
    if ((NEEDS_CAPACITY_CHECK as readonly string[]).includes(order.status)) {
      if (order.quantity > availableForExpired) {
        capacityBlocked++;
        results.push({ code, result: "capacity_blocked", buyerName: order.buyerName, amountCzk: order.totalAmountCzk });
        continue;
      }
      availableForExpired -= order.quantity; // reserve slot for subsequent codes in this batch
    }

    // Mark paid + audit record in a single transaction
    try {
      const txResult = await db.$transaction(async (tx) => {
        const updateResult = await tx.order.updateMany({
          where: { id: order.id, status: { notIn: ["paid", "tickets_issued"] } },
          data: { status: "paid" },
        });

        if (updateResult.count === 0) return { updated: false };

        await tx.paymentRecord.create({
          data: {
            organizerId: organizer.id,
            orderId: order.id,
            amountCzk: order.totalAmountCzk,
            variableSymbol: order.variableSymbol,
            status: "matched",
            source: "manual_codes",
            paymentDate: new Date(),
            note: "Marked paid by pasted codes",
          },
        });

        return { updated: true };
      });

      if (txResult.updated) {
        matched++;
        results.push({ code, result: "matched", buyerName: order.buyerName, amountCzk: order.totalAmountCzk });
      } else {
        // Concurrent update — already paid
        alreadyPaid++;
        if ((NEEDS_CAPACITY_CHECK as readonly string[]).includes(order.status)) {
          availableForExpired += order.quantity; // revert tentative reservation
        }
        results.push({ code, result: "already_paid", buyerName: order.buyerName, amountCzk: order.totalAmountCzk });
      }
    } catch {
      alreadyPaid++;
      if ((NEEDS_CAPACITY_CHECK as readonly string[]).includes(order.status)) {
        availableForExpired += order.quantity;
      }
      results.push({ code, result: "already_paid", buyerName: order.buyerName, amountCzk: order.totalAmountCzk });
    }
  }

  return NextResponse.json({
    summary: {
      matched,
      alreadyPaid,
      notFound,
      capacityBlocked,
      duplicateInput: duplicateInputCodes.length,
    },
    results,
    duplicateInputCodes,
  });
}
