import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import Nav from "@/app/components/Nav";

const STATUS_MSG: Record<string, { label: string; color: string; note: string }> = {
  awaiting_payment: {
    label: "Čeká na platbu",
    color: "text-amber-400 bg-amber-900/30 border-amber-800",
    note: "Zašlete platbu na účet níže. Po přijetí vám přijdou vstupenky e-mailem.",
  },
  paid: {
    label: "Zaplaceno",
    color: "text-green-400 bg-green-900/30 border-green-800",
    note: "Platba přijata. Vstupenky vám byly zaslány na e-mail.",
  },
  tickets_issued: {
    label: "Vstupenky vydány",
    color: "text-green-400 bg-green-900/30 border-green-800",
    note: "Vstupenky byly odeslány na váš e-mail.",
  },
  payment_window_expired: {
    label: "Platební lhůta vypršela",
    color: "text-red-400 bg-red-900/30 border-red-800",
    note: "Platba nebyla přijata včas. Pro nákup vstupenek vytvořte novou objednávku.",
  },
  expired: {
    label: "Objednávka zrušena",
    color: "text-gray-400 bg-gray-800 border-gray-700",
    note: "Tato objednávka je neplatná.",
  },
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderToken: string }>;
}) {
  const { orderToken } = await params;

  const order = await db.order.findUnique({
    where: { publicToken: orderToken },
    include: {
      event: {
        include: {
          organizer: { select: { name: true, bankAccount: true } },
        },
      },
      tickets: {
        include: { category: { select: { name: true } } },
      },
    },
  });

  if (!order) notFound();

  const statusInfo = STATUS_MSG[order.status] ?? STATUS_MSG.expired;
  const isPending = order.status === "awaiting_payment";
  const displayDeadline = new Date(order.paymentDisplayDeadlineAt);
  const now = new Date();
  const minutesLeft = Math.max(0, Math.round((displayDeadline.getTime() - now.getTime()) / 60_000));

  return (
    <>
      <Nav />
      <main className="min-h-screen max-w-xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-1">Objednávka</h1>
          <p className="text-gray-500 text-sm">#{order.variableSymbol}</p>
        </div>

        {/* Status */}
        <div className={`border rounded-xl px-5 py-4 mb-6 text-sm ${statusInfo.color}`}>
          <p className="font-semibold mb-1">{statusInfo.label}</p>
          <p className="opacity-80">{statusInfo.note}</p>
        </div>

        {/* Event info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Akce</h2>
          <p className="font-semibold">{order.event.title}</p>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(order.event.startsAt).toLocaleDateString("cs-CZ", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {order.event.venueName && (
            <p className="text-gray-500 text-sm mt-0.5">{order.event.venueName}</p>
          )}
        </div>

        {/* Buyer + tickets */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vstupenky</h2>
          <p className="text-sm text-gray-300 mb-3">
            {order.buyerName} · {order.buyerEmail}
          </p>
          {order.tickets.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between py-1.5 border-t border-gray-700 first:border-0">
              <span className="text-sm text-gray-400">
                Vstupenka {i + 1} · {t.category.name}
              </span>
              <span className="text-xs text-gray-500 font-mono">{t.token.slice(0, 8)}…</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-gray-700 mt-2 pt-3">
            <span className="text-sm font-medium">Celkem</span>
            <span className="font-bold text-amber-400">
              {order.totalAmountCzk.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        </div>

        {/* Payment instructions */}
        {isPending && (
          <div className="bg-gray-800 border border-amber-800/50 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Platební instrukce
            </h2>
            <div className="space-y-2 text-sm">
              <Row label="Číslo účtu" value={order.event.organizer.bankAccount || "—"} />
              <Row label="Částka" value={`${order.totalAmountCzk.toLocaleString("cs-CZ")} Kč`} />
              <Row label="Variabilní symbol" value={order.variableSymbol} highlight />
              <Row
                label="Splatnout do"
                value={displayDeadline.toLocaleTimeString("cs-CZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "numeric",
                })}
              />
            </div>
            {minutesLeft > 0 && (
              <p className="text-amber-400 text-xs mt-4">
                Zbývá přibližně {minutesLeft} minut pro odeslání platby.
              </p>
            )}
            {/* TODO: Přidat QR kód pro CZ platbu (formát SHORT/LONG dle ČBA standardu) */}
            <p className="text-gray-600 text-xs mt-3">
              QR kód pro mobilní bankovnictví bude přidán v další verzi.
            </p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Zpět na Tyckety.cz
          </Link>
        </div>
      </main>
    </>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${highlight ? "text-white font-semibold text-base" : "text-gray-300"}`}>
        {value}
      </span>
    </div>
  );
}
