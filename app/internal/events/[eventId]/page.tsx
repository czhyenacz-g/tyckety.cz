import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { db } from "@/lib/db";
import EventDetailActions from "./EventDetailActions";

export const metadata: Metadata = {
  title: "Interní detail akce — Tyckety",
  robots: { index: false, follow: false },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Čeká na platbu",
  payment_window_expired: "Lhůta vypršela",
  paid: "Zaplaceno",
  tickets_issued: "Vstupenky vydány",
  expired: "Expirováno",
  payment_received_late: "Platba dorazila pozdě",
  manual_review: "Ruční kontrola",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  awaiting_payment: "text-amber-400 border-amber-800 bg-amber-900/20",
  payment_window_expired: "text-gray-500 border-gray-700 bg-gray-800",
  paid: "text-green-400 border-green-800 bg-green-900/20",
  tickets_issued: "text-green-400 border-green-800 bg-green-900/20",
  expired: "text-gray-500 border-gray-700 bg-gray-800",
  payment_received_late: "text-blue-400 border-blue-800 bg-blue-900/20",
  manual_review: "text-blue-400 border-blue-800 bg-blue-900/20",
};

function czk(n: number) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

export default async function InternalEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const session = await getSession();
  if (!session || !isSuperAdmin(session.organizer.email)) redirect(`/prihlaseni?next=/internal/events/${eventId}`);

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: { select: { name: true, email: true, slug: true, bankAccount: true } },
      ticketCategories: { select: { id: true, name: true, capacity: true, soldCount: true, priceCzk: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          tickets: { select: { id: true, status: true } },
        },
      },
      scanTokens: { select: { id: true, token: true, active: true, createdAt: true } },
    },
  });

  if (!event) notFound();

  const now = new Date();

  // Per-event stats
  const capacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
  const soldCount = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);

  const activeOrders = event.orders.filter(
    (o) => o.status === "awaiting_payment" && o.paymentDisplayDeadlineAt > now,
  );
  const reserved = activeOrders.reduce((s, o) => s + o.quantity, 0);

  const paidOrders = event.orders.filter(
    (o) => o.status === "paid" || o.status === "tickets_issued",
  );

  const allTickets = event.orders.flatMap((o) => o.tickets);
  const issuedTickets = allTickets.filter((t) => t.status === "issued" || t.status === "used").length;
  const usedTickets = allTickets.filter((t) => t.status === "used").length;

  const available = Math.max(0, capacity - soldCount - reserved);
  const confirmedRevenue = paidOrders.reduce((s, o) => s + o.totalAmountCzk, 0);
  const pendingRevenue = activeOrders.reduce((s, o) => s + o.totalAmountCzk, 0);

  const uniqueContributors = new Set(paidOrders.map((o) => o.buyerEmail)).size;

  const activeScanToken = event.scanTokens.find((t) => t.active);
  const scanUrl = activeScanToken ? `/scan/${activeScanToken.token}` : null;

  const isPosterLocal = event.posterUrl?.startsWith("/");
  const posterSrc = event.posterUrl ?? null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <Link href="/internal" className="text-gray-500 hover:text-white text-sm transition-colors w-fit">
            ← Zpět na /internal
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {event.organizer.name} · {event.organizer.email}
              </p>
            </div>
            <EventDetailActions
              eventId={event.id}
              eventTitle={event.title}
              status={event.status}
            />
          </div>
        </div>

        {/* Info + poster */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3 text-sm">
            <Row label="Pořadatel" value={event.organizer.name} />
            <Row label="Email" value={event.organizer.email} />
            <Row label="Bankovní účet" value={event.organizer.bankAccount} />
            <Row
              label="Datum"
              value={new Date(event.startsAt).toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            {event.venueName && (
              <Row
                label="Místo"
                value={`${event.venueName}${event.venueAddress ? `, ${event.venueAddress}` : ""}`}
              />
            )}
            <div className="flex items-center justify-between border-t border-gray-700 pt-3 mt-1">
              <span className="text-gray-500">Veřejná URL</span>
              <a
                href={`/${event.organizer.slug}/${event.slug}`}
                target="_blank"
                className="text-amber-400 hover:text-amber-300 transition-colors font-mono text-xs"
              >
                /{event.organizer.slug}/{event.slug} ↗
              </a>
            </div>
            {scanUrl && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Scan URL</span>
                <a
                  href={scanUrl}
                  target="_blank"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-mono text-xs"
                >
                  {scanUrl} ↗
                </a>
              </div>
            )}
            {!scanUrl && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Scan URL</span>
                <span className="text-red-400 text-xs">Žádný aktivní token</span>
              </div>
            )}
          </div>

          {posterSrc && (
            <div className="rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center bg-gray-800">
              <Image
                src={posterSrc}
                alt={`Plakát — ${event.title}`}
                width={200}
                height={280}
                className="object-contain w-full h-full"
                unoptimized={!isPosterLocal}
              />
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {(
            [
              { label: "Kapacita", value: capacity.toLocaleString("cs-CZ") },
              { label: "Rezervováno", value: reserved.toLocaleString("cs-CZ"), highlight: reserved > 0 ? ("amber" as const) : undefined },
              { label: "Zapl. objednávky", value: paidOrders.length.toLocaleString("cs-CZ"), highlight: paidOrders.length > 0 ? ("green" as const) : undefined },
              { label: "Vstupenky", value: issuedTickets.toLocaleString("cs-CZ") },
              { label: "Použito", value: usedTickets.toLocaleString("cs-CZ"), highlight: usedTickets > 0 ? ("blue" as const) : undefined },
              { label: "Zbývá míst", value: available.toLocaleString("cs-CZ"), highlight: available === 0 ? ("red" as const) : available < 10 ? ("yellow" as const) : undefined },
              { label: "Tržby potvrzené", value: czk(confirmedRevenue), highlight: confirmedRevenue > 0 ? ("green" as const) : undefined },
              { label: "Tržby čekající", value: czk(pendingRevenue), highlight: pendingRevenue > 0 ? ("amber" as const) : undefined },
            ] as const
          ).map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} highlight={"highlight" in s ? s.highlight : undefined} />
          ))}
        </div>

        {/* Orders section */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="font-semibold text-gray-200">
              Objednávky a příspěvky ({event.orders.length})
            </h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="text-gray-500">Potvrzené: </span>
                <span className="text-green-400 font-semibold">{czk(confirmedRevenue)}</span>
              </span>
              <span>
                <span className="text-gray-500">Čekající: </span>
                <span className="text-amber-400 font-semibold">{czk(pendingRevenue)}</span>
              </span>
              <span>
                <span className="text-gray-500">Přispěvatelů: </span>
                <span className="text-white font-semibold">{uniqueContributors}</span>
              </span>
              <span>
                <span className="text-gray-500">Vydáno lístků: </span>
                <span className="text-white font-semibold">{issuedTickets}</span>
              </span>
            </div>
          </div>

          {event.orders.length === 0 ? (
            <p className="text-gray-500 text-sm">Žádné objednávky.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm text-left whitespace-nowrap w-full">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700 text-xs uppercase tracking-wide">
                    <th className="py-2 pr-4">Vytvořeno</th>
                    <th className="py-2 pr-4">Jméno</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4 text-right">Ks</th>
                    <th className="py-2 pr-4 text-right">Částka</th>
                    <th className="py-2 pr-4">VS</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Lístky</th>
                    <th className="py-2 pr-4 text-right">Použito</th>
                    <th className="py-2">Odkaz</th>
                  </tr>
                </thead>
                <tbody>
                  {event.orders.map((order) => {
                    const oIssued = order.tickets.filter(
                      (t) => t.status === "issued" || t.status === "used",
                    ).length;
                    const oUsed = order.tickets.filter((t) => t.status === "used").length;
                    const isActive =
                      order.status === "awaiting_payment" &&
                      order.paymentDisplayDeadlineAt > now;

                    return (
                      <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">
                          {new Date(order.createdAt).toLocaleDateString("cs-CZ", {
                            day: "numeric",
                            month: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-200">{order.buyerName}</td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{order.buyerEmail}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-300">{order.quantity}</td>
                        <td className="py-2.5 pr-4 text-right font-medium text-amber-400">
                          {czk(order.totalAmountCzk)}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">
                          {order.variableSymbol}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`text-xs border rounded-full px-2 py-0.5 ${ORDER_STATUS_COLOR[order.status] ?? "text-gray-400 border-gray-600"}`}
                          >
                            {ORDER_STATUS_LABEL[order.status] ?? order.status}
                            {order.status === "awaiting_payment" && !isActive && " (exp.)"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-300">
                          {oIssued > 0 ? oIssued : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right">
                          {oUsed > 0 ? (
                            <span className="text-blue-400">{oUsed}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <a
                            href={`/objednavka/${order.publicToken}`}
                            target="_blank"
                            className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                          >
                            Zobrazit ↗
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ticket categories */}
        {event.ticketCategories.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="font-semibold text-gray-200 mb-4">Kategorie vstupenek</h2>
            <div className="space-y-2">
              {event.ticketCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-gray-300">{cat.name}</span>
                  <div className="flex gap-6 text-right">
                    <span className="text-gray-500 text-xs">
                      Cena: <span className="text-white">{czk(cat.priceCzk)}</span>
                    </span>
                    <span className="text-gray-500 text-xs">
                      Prodáno: <span className="text-white">{cat.soldCount}</span>
                    </span>
                    <span className="text-gray-500 text-xs">
                      Kapacita: <span className="text-white">{cat.capacity}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 text-right max-w-[60%]">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "amber" | "blue" | "red" | "yellow";
}) {
  const colors: Record<string, string> = {
    green: "text-green-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
  };
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
      <p className="text-gray-500 text-xs mb-1 leading-tight">{label}</p>
      <p className={`text-lg font-bold ${highlight ? colors[highlight] : "text-white"}`}>{value}</p>
    </div>
  );
}
