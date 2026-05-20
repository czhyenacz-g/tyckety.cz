import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { db } from "@/lib/db";
import InternalTable from "./InternalTable";
import { FREE_TICKET_LIMIT, NEARING_TICKET_COUNT, SUPPORT_HINT_TICKET_COUNT, getUsageThresholdState } from "@/lib/usage";

export const metadata: Metadata = {
  title: "Internal — Tyckety",
  robots: { index: false, follow: false },
};

function czk(n: number) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

export default async function InternalPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session.organizer.email)) redirect("/prihlaseni?next=/internal");

  const now = new Date();

  const [
    organizerCount,
    eventCount,
    publishedCount,
    orderCount,
    pendingOrderCount,
    paidOrderCount,
    issuedTicketCount,
    usedTicketCount,
    revenueAgg,
    events,
  ] = await Promise.all([
    db.organizer.count(),
    db.event.count(),
    db.event.count({ where: { status: "published" } }),
    db.order.count(),
    db.order.count({
      where: { status: "awaiting_payment", paymentDisplayDeadlineAt: { gt: now } },
    }),
    db.order.count({ where: { status: { in: ["paid", "tickets_issued"] } } }),
    db.ticket.count({ where: { status: { in: ["issued", "used"] } } }),
    db.ticket.count({ where: { status: "used" } }),
    db.order.aggregate({
      where: { status: { in: ["paid", "tickets_issued"] } },
      _sum: { totalAmountCzk: true },
    }),
    db.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organizer: { select: { name: true, email: true, slug: true } },
        ticketCategories: { select: { capacity: true, soldCount: true } },
        orders: {
          select: {
            id: true,
            status: true,
            totalAmountCzk: true,
            quantity: true,
            paymentDisplayDeadlineAt: true,
          },
        },
        tickets: { select: { id: true, status: true } },
      },
    }),
  ]);

  const totalRevenue = revenueAgg._sum.totalAmountCzk ?? 0;

  const rows = events.map((ev) => {
    const capacity = ev.ticketCategories.reduce((s, c) => s + c.capacity, 0);
    const soldCount = ev.ticketCategories.reduce((s, c) => s + c.soldCount, 0);

    const activeOrders = ev.orders.filter(
      (o) => o.status === "awaiting_payment" && o.paymentDisplayDeadlineAt > now,
    );
    const reserved = activeOrders.reduce((s, o) => s + o.quantity, 0);

    const paidOrders = ev.orders.filter(
      (o) => o.status === "paid" || o.status === "tickets_issued",
    );

    const issuedTickets = ev.tickets.filter(
      (t) => t.status === "issued" || t.status === "used",
    ).length;
    const usedTickets = ev.tickets.filter((t) => t.status === "used").length;

    const available = Math.max(0, capacity - soldCount - reserved);
    const confirmedRevenue = paidOrders.reduce((s, o) => s + o.totalAmountCzk, 0);
    const pendingRevenue = activeOrders.reduce((s, o) => s + o.totalAmountCzk, 0);

    return {
      id: ev.id,
      title: ev.title,
      organizerName: ev.organizer.name,
      organizerEmail: ev.organizer.email,
      organizerSlug: ev.organizer.slug,
      slug: ev.slug,
      startsAt: ev.startsAt.toISOString(),
      status: ev.status,
      capacity,
      reserved,
      paidOrderCount: paidOrders.length,
      issuedTickets,
      usedTickets,
      available,
      confirmedRevenue,
      pendingRevenue,
    };
  });

  // Per-organizer issued ticket counts derived from existing rows (no extra DB query)
  const orgUsageMap = new Map<string, { name: string; email: string; issuedTickets: number }>();
  for (const row of rows) {
    const prev = orgUsageMap.get(row.organizerEmail);
    orgUsageMap.set(row.organizerEmail, {
      name: row.organizerName,
      email: row.organizerEmail,
      issuedTickets: (prev?.issuedTickets ?? 0) + row.issuedTickets,
    });
  }
  const usageRows = Array.from(orgUsageMap.values()).sort((a, b) => b.issuedTickets - a.issuedTickets);
  const exceededCount = usageRows.filter((r) => getUsageThresholdState(r.issuedTickets) === "exceeded").length;
  const nearingCount = usageRows.filter((r) => getUsageThresholdState(r.issuedTickets) === "nearing").length;
  const supportCount = usageRows.filter((r) => getUsageThresholdState(r.issuedTickets) === "support_hint").length;

  const stats = [
    { label: "Pořadatelů", value: organizerCount.toLocaleString("cs-CZ") },
    { label: "Akcí celkem", value: eventCount.toLocaleString("cs-CZ") },
    { label: "Publikovaných", value: publishedCount.toLocaleString("cs-CZ") },
    { label: "Objednávek celkem", value: orderCount.toLocaleString("cs-CZ") },
    { label: "Čekající objednávky", value: pendingOrderCount.toLocaleString("cs-CZ") },
    { label: "Zaplacené objednávky", value: paidOrderCount.toLocaleString("cs-CZ") },
    { label: "Vygenerované vstupenky", value: issuedTicketCount.toLocaleString("cs-CZ") },
    { label: "Použité vstupenky", value: usedTicketCount.toLocaleString("cs-CZ") },
    { label: "Potvrzené tržby", value: czk(totalRevenue) },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Internal</h1>
          <p className="text-gray-500 text-sm mt-1">Super admin · {session.organizer.email}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1 leading-tight">{s.label}</p>
              <p className="text-xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Events table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-4">Akce ({events.length})</h2>
          <InternalTable events={rows} />
        </div>

        {/* Usage per organizer */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-gray-300 mb-4">
            Využití — pořadatelé (limit: {FREE_TICKET_LIMIT} vydaných vstupenek)
          </h2>

          {/* Summary chips */}
          <div className="flex flex-wrap gap-3 mb-5 text-xs">
            <span className={`px-3 py-1 rounded-full ${exceededCount > 0 ? "bg-orange-900/50 text-orange-300 border border-orange-700/50" : "bg-gray-700 text-gray-500"}`}>
              Překročeno ({FREE_TICKET_LIMIT}+): <strong>{exceededCount}</strong>
            </span>
            <span className={`px-3 py-1 rounded-full ${nearingCount > 0 ? "bg-amber-900/40 text-amber-300 border border-amber-700/40" : "bg-gray-700 text-gray-500"}`}>
              Blíží se ({NEARING_TICKET_COUNT}–{FREE_TICKET_LIMIT - 1}): <strong>{nearingCount}</strong>
            </span>
            <span className={`px-3 py-1 rounded-full ${supportCount > 0 ? "bg-gray-700 text-gray-300 border border-gray-600" : "bg-gray-700 text-gray-500"}`}>
              Podpora ({SUPPORT_HINT_TICKET_COUNT}–{NEARING_TICKET_COUNT - 1}): <strong>{supportCount}</strong>
            </span>
          </div>

          {usageRows.length === 0 ? (
            <p className="text-gray-500 text-sm">Žádní pořadatelé.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-700">
                    <th className="pb-2 pr-6 font-medium">Pořadatel</th>
                    <th className="pb-2 pr-6 font-medium">E-mail</th>
                    <th className="pb-2 pr-6 font-medium text-right">Vydané vstupenky</th>
                    <th className="pb-2 font-medium">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {usageRows.map((r) => {
                    const state = getUsageThresholdState(r.issuedTickets);
                    const stateLabel: Record<typeof state, string> = {
                      ok: "OK",
                      support_hint: "Podpora",
                      nearing: "Blíží se",
                      exceeded: "Překročeno",
                    };
                    const stateColor: Record<typeof state, string> = {
                      ok: "text-gray-500",
                      support_hint: "text-gray-300",
                      nearing: "text-amber-400",
                      exceeded: "text-orange-400 font-semibold",
                    };
                    return (
                      <tr key={r.email} className={state === "exceeded" ? "bg-orange-950/20" : ""}>
                        <td className="py-2.5 pr-6 text-gray-200">{r.name}</td>
                        <td className="py-2.5 pr-6 text-gray-400">{r.email}</td>
                        <td className="py-2.5 pr-6 text-right font-mono text-gray-200">
                          {r.issuedTickets} / {FREE_TICKET_LIMIT}
                        </td>
                        <td className="py-2.5">
                          <span className={stateColor[state]}>{stateLabel[state]}</span>
                          {state === "exceeded" && (
                            <p className="text-orange-400/70 text-xs mt-0.5">
                              Kontaktovat kvůli férovému nastavení dalšího provozu.
                            </p>
                          )}
                          {state === "support_hint" && (
                            <p className="text-gray-500 text-xs mt-0.5">
                              Lze připomenout možnost podpory projektu.
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
