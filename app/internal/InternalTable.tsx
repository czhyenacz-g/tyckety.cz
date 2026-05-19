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
  sold: number;
  capacity: number;
  pendingOrders: number;
};

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

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    published: "Publikovaná",
    cancelled: "Zrušená",
    ended: "Ukončená",
  };

  const statusColor: Record<string, string> = {
    draft: "text-gray-400",
    published: "text-green-400",
    cancelled: "text-red-400",
    ended: "text-yellow-400",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b border-gray-700 text-xs uppercase tracking-wide">
            <th className="py-2 pr-4">Akce</th>
            <th className="py-2 pr-4">Pořadatel</th>
            <th className="py-2 pr-4">Datum</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Prodáno/Kapacita</th>
            <th className="py-2 pr-4">Čekající</th>
            <th className="py-2 pr-4">Akce</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="py-3 pr-4">
                <div className="font-medium text-white">{ev.title}</div>
                <div className="text-xs text-gray-500 space-x-2 mt-0.5">
                  <a href={`/${ev.organizerSlug}/${ev.slug}`} target="_blank" className="hover:text-amber-400">
                    Veřejná ↗
                  </a>
                  <a href={`/app/akce/${ev.id}`} target="_blank" className="hover:text-amber-400">
                    Admin ↗
                  </a>
                </div>
              </td>
              <td className="py-3 pr-4">
                <div>{ev.organizerName}</div>
                <div className="text-xs text-gray-500">{ev.organizerEmail}</div>
              </td>
              <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">
                {new Date(ev.startsAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" })}
              </td>
              <td className={`py-3 pr-4 font-medium ${statusColor[ev.status] ?? "text-gray-400"}`}>
                {statusLabel[ev.status] ?? ev.status}
              </td>
              <td className="py-3 pr-4 text-gray-300">
                {ev.sold}/{ev.capacity}
              </td>
              <td className="py-3 pr-4 text-gray-300">{ev.pendingOrders}</td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1.5">
                  {ev.status !== "published" && (
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
                      onClick={() => setStatus(ev.id, "cancelled", `Opravdu zrušit akci "${ev.title}"? Tato akce je nevratná.`)}
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
