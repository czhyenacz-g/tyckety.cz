import { db } from "./db";

/**
 * Lazy expiration: označí awaiting_payment objednávky jako payment_window_expired
 * pokud vypršel jejich paymentDisplayDeadlineAt.
 * Volá se před tvorbou nové objednávky a při načtení admin stránky.
 */
export async function expireStaleOrders(eventId: string): Promise<void> {
  await db.order.updateMany({
    where: {
      eventId,
      status: "awaiting_payment",
      paymentDisplayDeadlineAt: { lt: new Date() },
    },
    data: { status: "payment_window_expired" },
  });
}

/**
 * Vrátí počet kapacity rezervované aktivními pending objednávkami
 * (awaiting_payment, deadline ještě neuplynul).
 */
export async function getReservedCount(eventId: string): Promise<number> {
  const result = await db.order.aggregate({
    where: {
      eventId,
      status: "awaiting_payment",
      paymentDisplayDeadlineAt: { gt: new Date() },
    },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}
