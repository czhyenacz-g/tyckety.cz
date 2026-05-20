"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { classifyOrder, type OrderGroup } from "@/lib/orders";

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
  source?: string;
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
  ticketTokens: string[];
  payment: PaymentInfo | null;
}


function problemReason(order: Order): string {
  if (order.payment) {
    switch (order.payment.status) {
      case "amount_mismatch": return "Nesedí částka";
      case "wrong_account": return "Chybný účet";
      case "missing_symbol": return "Chybí VS";
      case "unknown_symbol": return "Neznámý VS";
      case "late_payment": return "Pozdní platba";
    }
  }
  if (order.status === "manual_review") return "Ruční kontrola";
  return "Problém";
}

function sourceLabel(source?: string): string {
  if (!source || source === "manual") return "Ručně";
  if (source === "csv") return "CSV";
  return source;
}

function fmtDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function czk(n: number): string {
  return n.toLocaleString("cs-CZ") + " Kč";
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="pb-2 pr-4 font-normal text-gray-500 text-xs uppercase tracking-wide text-left">
      {children}
    </th>
  );
}

function Section({
  title,
  count,
  emptyMessage,
  children,
  variant = "normal",
}: {
  title: string;
  count: number;
  emptyMessage: string;
  children: React.ReactNode;
  variant?: "normal" | "warning";
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className={`font-semibold text-sm ${variant === "warning" ? "text-red-400" : "text-gray-300"}`}>
          {title}
        </h3>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          variant === "warning" && count > 0
            ? "text-red-300 bg-red-900/40"
            : "text-gray-500 bg-gray-700/60"
        }`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-gray-600 text-sm py-2 pl-1">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
}

function matchesSearch(order: Order, q: string): boolean {
  return (
    order.buyerName.toLowerCase().includes(q) ||
    order.buyerEmail.toLowerCase().includes(q) ||
    order.variableSymbol.toLowerCase().includes(q) ||
    order.publicToken.toLowerCase().includes(q) ||
    order.ticketTokens.some((t) => t.toLowerCase().includes(q))
  );
}

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const filtered = q ? orders.filter((o) => matchesSearch(o, q)) : orders;

  const emptySearch = "Nic nenalezeno v této sekci.";

  const groups: Record<OrderGroup, Order[]> = {
    problematic: [],
    pending: [],
    paid: [],
    issued: [],
  };
  for (const o of filtered) groups[classifyOrder(o)].push(o);

  return (
    <div className="space-y-8">

      {/* Search */}
      <div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat podle kódu, VS, e-mailu nebo jména…"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-600 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-gray-400 hover:text-white px-3 py-2 transition-colors shrink-0"
            >
              Vyčistit
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <p className="text-gray-600 text-xs">
            Hledá v objednávkách, variabilních symbolech, e-mailech a kódech vstupenek.
          </p>
          {q && (
            <p className="text-gray-400 text-xs shrink-0">
              Nalezeno: {filtered.length}
            </p>
          )}
        </div>
      </div>

      {/* ── 1. Problematické objednávky ── */}
      <Section
        title="Problematické objednávky"
        count={groups.problematic.length}
        emptyMessage={q ? emptySearch : "Žádné problematické objednávky."}
        variant="warning"
      >
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-700">
              <Th>Zákazník</Th>
              <Th>VS</Th>
              <Th>Důvod</Th>
              <Th>Očekáváno</Th>
              <Th>Přijato</Th>
              <Th>Datum platby</Th>
              <Th>Akce</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {groups.problematic.map((o) => (
              <tr key={o.id} className="bg-red-950/10">
                <td className="py-2.5 pr-4">
                  <a href={`/objednavka/${o.publicToken}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:text-amber-400 transition-colors">
                    {o.buyerName}
                  </a>
                  <p className="text-gray-500 text-xs">{o.buyerEmail}</p>
                </td>
                <td className="py-2.5 pr-4 font-mono text-gray-400 text-xs">{o.variableSymbol}</td>
                <td className="py-2.5 pr-4">
                  <span className="text-xs text-red-400 font-medium">{problemReason(o)}</span>
                </td>
                <td className="py-2.5 pr-4 text-amber-400 text-xs font-semibold">{czk(o.totalAmountCzk)}</td>
                <td className="py-2.5 pr-4 text-xs text-gray-300">
                  {o.payment?.amountCzk != null ? czk(o.payment.amountCzk) : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-400">
                  {o.payment?.paymentDate ? fmtDateTime(o.payment.paymentDate) : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-2.5">
                  <button
                    onClick={() => markPaid(o.id, o.status === "payment_window_expired" || o.status === "expired")}
                    disabled={loading === o.id + "-paid"}
                    className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-green-300 rounded-lg transition-colors"
                  >
                    {loading === o.id + "-paid" ? "…" : "Označit zaplaceno"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── 2. Objednávky (pending) ── */}
      <Section
        title="Objednávky"
        count={groups.pending.length}
        emptyMessage={q ? emptySearch : "Žádné čekající objednávky."}
      >
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-700">
              <Th>Zákazník</Th>
              <Th>Objednáno</Th>
              <Th>VS</Th>
              <Th>Částka</Th>
              <Th>Lhůta</Th>
              <Th>Ks</Th>
              <Th>Akce</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {groups.pending.map((o) => {
              const dl = new Date(o.paymentDisplayDeadlineAt);
              const isLhutaExpired = dl < new Date();
              return (
                <tr key={o.id}>
                  <td className="py-2.5 pr-4">
                    <a href={`/objednavka/${o.publicToken}`} target="_blank" rel="noopener noreferrer"
                      className="font-medium hover:text-amber-400 transition-colors">
                      {o.buyerName}
                    </a>
                    <p className="text-gray-500 text-xs">{o.buyerEmail}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">{fmtDateTime(o.createdAt)}</td>
                  <td className="py-2.5 pr-4 font-mono text-gray-400 text-xs">{o.variableSymbol}</td>
                  <td className="py-2.5 pr-4 text-amber-400 font-semibold text-xs">{czk(o.totalAmountCzk)}</td>
                  <td className="py-2.5 pr-4 text-xs">
                    {o.status === "awaiting_payment" && !isLhutaExpired
                      ? <span className="text-amber-400">do {fmtDateTime(dl)}</span>
                      : <span className="text-gray-500">vypršela {fmtDateTime(dl)}</span>
                    }
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">{o.quantity}</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => markPaid(o.id, o.status === "payment_window_expired" || o.status === "expired")}
                      disabled={loading === o.id + "-paid"}
                      className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-green-300 rounded-lg transition-colors"
                    >
                      {loading === o.id + "-paid" ? "…" : "Označit zaplaceno"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>

      {/* ── 3. Zaplacené objednávky ── */}
      <Section
        title="Zaplacené objednávky"
        count={groups.paid.length}
        emptyMessage={q ? emptySearch : "Žádné zaplacené objednávky čekající na vstupenky."}
      >
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-700">
              <Th>Zákazník</Th>
              <Th>Částka</Th>
              <Th>Ks</Th>
              <Th>Datum platby</Th>
              <Th>Způsob</Th>
              <Th>Akce</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {groups.paid.map((o) => (
              <tr key={o.id}>
                <td className="py-2.5 pr-4">
                  <a href={`/objednavka/${o.publicToken}`} target="_blank" rel="noopener noreferrer"
                    className="font-medium hover:text-amber-400 transition-colors">
                    {o.buyerName}
                  </a>
                  <p className="text-gray-500 text-xs">{o.buyerEmail}</p>
                </td>
                <td className="py-2.5 pr-4 text-amber-400 font-semibold text-xs">{czk(o.totalAmountCzk)}</td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs">{o.quantity}</td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs">
                  {o.payment?.paymentDate ? fmtDateTime(o.payment.paymentDate) : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs">
                  {o.payment ? sourceLabel(o.payment.source) : <span className="text-gray-600">—</span>}
                </td>
                <td className="py-2.5">
                  <button
                    onClick={() => issueTickets(o.id)}
                    disabled={loading === o.id + "-issue"}
                    className="text-xs px-3 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-200 rounded-lg transition-colors"
                  >
                    {loading === o.id + "-issue" ? "…" : "Vystavit vstupenky"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── 4. Vyřízené objednávky ── */}
      <Section
        title="Vyřízené objednávky"
        count={groups.issued.length}
        emptyMessage={q ? emptySearch : "Žádné vyřízené objednávky."}
      >
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-700">
              <Th>Zákazník</Th>
              <Th>Vstupenky</Th>
              <Th>Částka</Th>
              <Th>Odkaz</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {groups.issued.map((o) => (
              <tr key={o.id}>
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-gray-300">{o.buyerName}</span>
                  <p className="text-gray-500 text-xs">{o.buyerEmail}</p>
                </td>
                <td className="py-2.5 pr-4 text-gray-400 text-xs">
                  {o.ticketCount} / {o.quantity} ks
                </td>
                <td className="py-2.5 pr-4 text-amber-400 font-semibold text-xs">{czk(o.totalAmountCzk)}</td>
                <td className="py-2.5">
                  <a
                    href={`/objednavka/${o.publicToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
                  >
                    Zobrazit ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

    </div>
  );
}
