"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventRow = {
  id: string;
  title: string;
  organizerName: string;
  organizerEmail: string;
  organizerSlug: string;
  slug: string;
  startsAt: string;
  status: string;
  capacity: number;
  reserved: number;
  paidOrderCount: number;
  issuedTickets: number;
  usedTickets: number;
  available: number;
  confirmedRevenue: number;
  pendingRevenue: number;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_review: "Ke schválení",
  published: "Publikovaná",
  blocked: "Zablokovaná",
  cancelled: "Zrušená",
  ended: "Ukončená",
};

const statusBadge: Record<string, string> = {
  draft: "text-gray-400 bg-gray-700/50 border-gray-600",
  pending_review: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  published: "text-green-400 bg-green-900/30 border-green-800",
  blocked: "text-red-400 bg-red-900/30 border-red-800",
  cancelled: "text-gray-400 bg-gray-800/50 border-gray-700",
  ended: "text-gray-500 bg-gray-800/30 border-gray-700",
};

function czk(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("cs-CZ") + " Kč";
}

function Num({ n }: { n: number }) {
  return <span>{n.toLocaleString("cs-CZ")}</span>;
}

export default function InternalTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(eventId: string, status: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(`${eventId}-status-${status}`);
    await fetch(`/api/internal/events/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  async function deactivateScanner(eventId: string) {
    setBusy(`${eventId}-scanner`);
    await fetch(`/api/internal/events/${eventId}/deactivate-scanner`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm text-left whitespace-nowrap">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700 text-xs uppercase tracking-wide">
            <th className="py-2 pr-5">Akce</th>
            <th className="py-2 pr-5">Pořadatel</th>
            <th className="py-2 pr-5">Datum</th>
            <th className="py-2 pr-5">Status</th>
            <th className="py-2 pr-5 text-right">Kapacita</th>
            <th className="py-2 pr-5 text-right">Rezervováno</th>
            <th className="py-2 pr-5 text-right">Zapl. obj.</th>
            <th className="py-2 pr-5 text-right">Vstupenky</th>
            <th className="py-2 pr-5 text-right">Použito</th>
            <th className="py-2 pr-5 text-right">Zbývá</th>
            <th className="py-2 pr-5 text-right">Tržby potvrzené</th>
            <th className="py-2 pr-5 text-right">Tržby čekající</th>
            <th className="py-2">Akce</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="border-b border-gray-800 hover:bg-gray-800/40 align-top">
              {/* Akce */}
              <td className="py-3 pr-5">
                <div className="font-medium text-white max-w-[180px] truncate" title={ev.title}>
                  {ev.title}
                </div>
                <div className="text-xs text-gray-500 space-x-2 mt-0.5">
                  <a
                    href={`/internal/events/${ev.id}`}
                    className="hover:text-amber-400 text-amber-600"
                  >
                    Detail ↗
                  </a>
                  <a
                    href={`/${ev.organizerSlug}/${ev.slug}`}
                    target="_blank"
                    className="hover:text-amber-400"
                  >
                    Veřejná ↗
                  </a>
                  <a
                    href={`/app/akce/${ev.id}`}
                    target="_blank"
                    className="hover:text-amber-400"
                  >
                    Admin ↗
                  </a>
                </div>
              </td>

              {/* Pořadatel */}
              <td className="py-3 pr-5">
                <div className="text-gray-200">{ev.organizerName}</div>
                <div className="text-xs text-gray-500">{ev.organizerEmail}</div>
              </td>

              {/* Datum */}
              <td className="py-3 pr-5 text-gray-300">
                {new Date(ev.startsAt).toLocaleDateString("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                })}
              </td>

              {/* Status badge */}
              <td className="py-3 pr-5">
                <span
                  className={`text-xs border rounded-full px-2 py-0.5 font-medium ${statusBadge[ev.status] ?? "text-gray-400 border-gray-600"}`}
                >
                  {statusLabel[ev.status] ?? ev.status}
                </span>
              </td>

              {/* Kapacita */}
              <td className="py-3 pr-5 text-right text-gray-300">
                <Num n={ev.capacity} />
              </td>

              {/* Rezervováno */}
              <td className="py-3 pr-5 text-right text-gray-300">
                {ev.reserved > 0 ? (
                  <span className="text-amber-400 font-medium">
                    <Num n={ev.reserved} />
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Zaplaceno objednávek */}
              <td className="py-3 pr-5 text-right text-gray-300">
                {ev.paidOrderCount > 0 ? (
                  <span className="text-green-400 font-medium">
                    <Num n={ev.paidOrderCount} />
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Vygenerované vstupenky */}
              <td className="py-3 pr-5 text-right text-gray-300">
                {ev.issuedTickets > 0 ? (
                  <Num n={ev.issuedTickets} />
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Použito u vstupu */}
              <td className="py-3 pr-5 text-right text-gray-300">
                {ev.usedTickets > 0 ? (
                  <span className="text-blue-400 font-medium">
                    <Num n={ev.usedTickets} />
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Zbývá volných */}
              <td className="py-3 pr-5 text-right">
                <span
                  className={
                    ev.available === 0
                      ? "text-red-400 font-medium"
                      : ev.available < 10
                        ? "text-yellow-400 font-medium"
                        : "text-gray-300"
                  }
                >
                  <Num n={ev.available} />
                </span>
              </td>

              {/* Potvrzené tržby */}
              <td className="py-3 pr-5 text-right">
                {ev.confirmedRevenue > 0 ? (
                  <span className="text-green-400 font-medium">{czk(ev.confirmedRevenue)}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Čekající tržby */}
              <td className="py-3 pr-5 text-right">
                {ev.pendingRevenue > 0 ? (
                  <span className="text-amber-400">{czk(ev.pendingRevenue)}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>

              {/* Akce */}
              <td className="py-3">
                <div className="flex flex-col gap-1.5">
                  {ev.status === "pending_review" && (
                    <>
                      <Btn
                        label="✓ Schválit"
                        busy={busy === `${ev.id}-status-published`}
                        onClick={() => setStatus(ev.id, "published")}
                        color="green"
                      />
                      <Btn
                        label="✗ Blokovat"
                        busy={busy === `${ev.id}-status-blocked`}
                        onClick={() =>
                          setStatus(
                            ev.id,
                            "blocked",
                            `Opravdu zablokovat akci "${ev.title}"?`,
                          )
                        }
                        color="red"
                      />
                    </>
                  )}
                  {ev.status === "blocked" && (
                    <Btn
                      label="Odblokovat"
                      busy={busy === `${ev.id}-status-draft`}
                      onClick={() => setStatus(ev.id, "draft")}
                      color="yellow"
                    />
                  )}
                  {ev.status !== "pending_review" && ev.status !== "blocked" && ev.status !== "published" && (
                    <Btn
                      label="Publikovat"
                      busy={busy === `${ev.id}-status-published`}
                      onClick={() => setStatus(ev.id, "published")}
                      color="green"
                    />
                  )}
                  {ev.status === "published" && (
                    <Btn
                      label="Depublikovat"
                      busy={busy === `${ev.id}-status-draft`}
                      onClick={() => setStatus(ev.id, "draft")}
                      color="yellow"
                    />
                  )}
                  {ev.status !== "cancelled" && ev.status !== "ended" && (
                    <Btn
                      label="Zrušit akci"
                      busy={busy === `${ev.id}-status-cancelled`}
                      onClick={() =>
                        setStatus(
                          ev.id,
                          "cancelled",
                          `Opravdu zrušit akci "${ev.title}"? Tato akce je nevratná.`,
                        )
                      }
                      color="red"
                    />
                  )}
                  {ev.status !== "ended" && ev.status !== "cancelled" && (
                    <Btn
                      label="Ukončit"
                      busy={busy === `${ev.id}-status-ended`}
                      onClick={() => setStatus(ev.id, "ended")}
                      color="gray"
                    />
                  )}
                  <Btn
                    label="Deakt. scanner"
                    busy={busy === `${ev.id}-scanner`}
                    onClick={() => deactivateScanner(ev.id)}
                    color="gray"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Btn({
  label,
  busy,
  onClick,
  color,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  color: "green" | "yellow" | "red" | "gray";
}) {
  const colors = {
    green: "border-green-700 text-green-400 hover:bg-green-900/40",
    yellow: "border-yellow-700 text-yellow-400 hover:bg-yellow-900/40",
    red: "border-red-700 text-red-400 hover:bg-red-900/40",
    gray: "border-gray-600 text-gray-400 hover:bg-gray-700/40",
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`text-xs border rounded px-2 py-1 disabled:opacity-50 transition-colors ${colors[color]}`}
    >
      {busy ? "…" : label}
    </button>
  );
}
