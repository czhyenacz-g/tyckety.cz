"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "tickets_issued"
  | "payment_window_expired"
  | "expired"
  | "payment_received_late"
  | "manual_review";

interface PaymentInfo {
  status: string;
  paymentDate: Date | null;
  amountCzk: number;
}

interface Order {
  id: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  quantity: number;
  totalAmountCzk: number;
  variableSymbol: string;
  publicToken: string;
  createdAt: Date;
  paymentDisplayDeadlineAt: Date;
  ticketCount: number;
  payment: PaymentInfo | null;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Čeká na platbu",
  paid: "Zaplaceno",
  tickets_issued: "Vstupenky vydány",
  payment_window_expired: "Po lhůtě",
  expired: "Po lhůtě",
  payment_received_late: "Pozdní platba",
  manual_review: "Ruční kontrola",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  awaiting_payment: "text-amber-400 bg-amber-900/30",
  paid: "text-green-400 bg-green-900/30",
  tickets_issued: "text-green-400 bg-green-900/30",
  payment_window_expired: "text-amber-500 bg-amber-900/20",
  expired: "text-gray-400 bg-gray-700",
  payment_received_late: "text-blue-400 bg-blue-900/30",
  manual_review: "text-blue-400 bg-blue-900/30",
};

function fmtDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function DeadlineCell({ status, deadline }: { status: OrderStatus; deadline: Date | string }) {
  if (status === "paid" || status === "tickets_issued") {
    return <span className="text-gray-600">—</span>;
  }
  const dl = new Date(deadline);
  const now = new Date();
  if (status === "awaiting_payment") {
    return dl > now
      ? <span className="text-amber-400">do {fmtDateTime(dl)}</span>
      : <span className="text-gray-500">vypršela {fmtDateTime(dl)}</span>;
  }
  if (status === "payment_window_expired" || status === "expired") {
    return <span className="text-amber-500/70">vypršela {fmtDateTime(dl)}</span>;
  }
  return <span className="text-gray-500">{fmtDateTime(dl)}</span>;
}

function PaymentCell({ payment }: { payment: PaymentInfo | null }) {
  if (!payment) return <span className="text-gray-600">—</span>;
  switch (payment.status) {
    case "matched":
      return <span className="text-green-400">✓ {payment.amountCzk.toLocaleString("cs-CZ")} Kč</span>;
    case "amount_mismatch":
      return <span className="text-red-400">! Nesedí {payment.amountCzk.toLocaleString("cs-CZ")} Kč</span>;
    case "late_payment":
      return <span className="text-blue-400">Pozdní platba</span>;
    case "already_paid":
      return <span className="text-gray-500">Duplikát</span>;
    case "missing_symbol":
      return <span className="text-yellow-500">Chybí VS</span>;
    case "unknown_symbol":
      return <span className="text-yellow-500">Neznámý VS</span>;
    default:
      return <span className="text-gray-600">—</span>;
  }
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function markPaid(orderId: string, requireConfirm: boolean) {
    if (requireConfirm) {
      const ok = window.confirm("Objednávka je po lhůtě. Opravdu chcete ručně potvrdit platbu?");
      if (!ok) return;
    }
    setLoading(orderId + "-paid");
    const res = await fetch(`/api/objednavka/${orderId}/paid`, { method: "PATCH" });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Chyba při potvrzení platby.");
      return;
    }
    router.refresh();
  }

  async function issueTickets(orderId: string) {
    setLoading(orderId + "-issue");
    await fetch(`/api/objednavka/${orderId}/issue-tickets`, { method: "PATCH" });
    setLoading(null);
    router.refresh();
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Žádné objednávky zatím.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-700">
            <th className="pb-3 pr-4">Zákazník</th>
            <th className="pb-3 pr-4">Objednáno</th>
            <th className="pb-3 pr-4">VS</th>
            <th className="pb-3 pr-4">Částka</th>
            <th className="pb-3 pr-4">Platba</th>
            <th className="pb-3 pr-4">Lhůta</th>
            <th className="pb-3 pr-4">Vstupenky</th>
            <th className="pb-3 pr-4">Stav</th>
            <th className="pb-3">Akce</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {orders.map((o) => (
            <tr
              key={o.id}
              className={o.payment?.status === "amount_mismatch" ? "bg-red-950/20" : ""}
            >
              <td className="py-3 pr-4">
                <a
                  href={`/objednavka/${o.publicToken}`}
                  className="font-medium hover:text-amber-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {o.buyerName}
                </a>
                <p className="text-gray-500 text-xs">{o.buyerEmail}</p>
              </td>
              <td className="py-3 pr-4 text-gray-400 text-xs">
                {fmtDateTime(o.createdAt)}
              </td>
              <td className="py-3 pr-4 font-mono text-gray-400 text-xs">{o.variableSymbol}</td>
              <td className="py-3 pr-4 text-amber-400 font-semibold">
                {o.totalAmountCzk.toLocaleString("cs-CZ")} Kč
              </td>
              <td className="py-3 pr-4 text-xs">
                <PaymentCell payment={o.payment} />
              </td>
              <td className="py-3 pr-4 text-xs">
                <DeadlineCell status={o.status} deadline={o.paymentDisplayDeadlineAt} />
              </td>
              <td className="py-3 pr-4 text-gray-400 text-xs">
                {o.ticketCount > 0 ? `${o.ticketCount} / ${o.quantity}` : `0 / ${o.quantity}`}
              </td>
              <td className="py-3 pr-4">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status]}`}>
                  {STATUS_LABEL[o.status]}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  {(o.status === "awaiting_payment" ||
                    o.status === "payment_window_expired" ||
                    o.status === "expired" ||
                    o.status === "payment_received_late" ||
                    o.status === "manual_review") && (
                    <button
                      onClick={() => markPaid(
                        o.id,
                        o.status === "payment_window_expired" || o.status === "expired"
                      )}
                      disabled={loading === o.id + "-paid"}
                      className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-green-300 rounded-lg transition-colors"
                    >
                      {loading === o.id + "-paid" ? "…" : "Označit zaplaceno"}
                    </button>
                  )}
                  {o.status === "paid" && (
                    <button
                      onClick={() => issueTickets(o.id)}
                      disabled={loading === o.id + "-issue"}
                      className="text-xs px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-200 rounded-lg transition-colors"
                    >
                      {loading === o.id + "-issue" ? "…" : "Vystavit vstupenky"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
