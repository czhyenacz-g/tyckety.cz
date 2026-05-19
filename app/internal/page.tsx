import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { db } from "@/lib/db";
import InternalTable from "./InternalTable";

export const metadata: Metadata = {
  title: "Internal — Tyckety",
  robots: { index: false, follow: false },
};

export default async function InternalPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.organizer.email)) redirect("/prihlaseni");

  const [organizerCount, eventCount, publishedCount, orderCount, ticketCount, events] = await Promise.all([
    db.organizer.count(),
    db.event.count(),
    db.event.count({ where: { status: "published" } }),
    db.order.count(),
    db.ticket.count({ where: { status: "issued" } }),
    db.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organizer: { select: { name: true, email: true, slug: true } },
        ticketCategories: { select: { capacity: true, soldCount: true } },
        orders: { where: { status: "awaiting_payment" }, select: { id: true } },
      },
    }),
  ]);

  const rows = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    organizerName: ev.organizer.name,
    organizerEmail: ev.organizer.email,
    organizerSlug: ev.organizer.slug,
    slug: ev.slug,
    startsAt: ev.startsAt.toISOString(),
    status: ev.status,
    sold: ev.ticketCategories.reduce((s, c) => s + c.soldCount, 0),
    capacity: ev.ticketCategories.reduce((s, c) => s + c.capacity, 0),
    pendingOrders: ev.orders.length,
  }));

  const stats = [
    { label: "Pořadatelů", value: organizerCount },
    { label: "Akcí celkem", value: eventCount },
    { label: "Publikovaných", value: publishedCount },
    { label: "Objednávek", value: orderCount },
    { label: "Vydaných vstupenek", value: ticketCount },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Internal</h1>
          <p className="text-gray-500 text-sm mt-1">Super admin · {session.organizer.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Events table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-4">Akce ({events.length})</h2>
          <InternalTable events={rows} />
        </div>
      </div>
    </div>
  );
}
