import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getReservedCount } from "@/lib/orders";
import PurchaseForm from "@/app/[organizerSlug]/[eventSlug]/PurchaseForm";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const event = await db.event.findFirst({
    where: { id: eventId, status: "published" },
    include: { ticketCategories: true },
  });

  if (!event) notFound();

  const category = event.ticketCategories[0];
  const reserved = category ? await getReservedCount(event.id) : 0;
  const available = category ? Math.max(0, category.capacity - category.soldCount - reserved) : 0;

  return (
    <main className="p-3">
      {category ? (
        <PurchaseForm
          eventId={event.id}
          category={{ id: category.id, name: category.name, priceCzk: category.priceCzk, available }}
        />
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
          Vstupenky nejsou k dispozici.
        </div>
      )}
    </main>
  );
}
