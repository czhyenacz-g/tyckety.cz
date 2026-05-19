import { NextRequest, NextResponse } from "next/server";
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
    include: { tickets: { select: { id: true } } },
  });

  if (!order) return NextResponse.json({ error: "Objednávka nenalezena" }, { status: 404 });

  if (order.status === "tickets_issued") {
    return NextResponse.json({ error: "Vstupenky již vystaveny" }, { status: 409 });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "Objednávka musí být nejprve označena jako zaplacená" }, { status: 409 });
  }

  await db.order.update({
    where: { id: orderId },
    data: { status: "tickets_issued" },
  });

  return NextResponse.json({ ok: true });
}
