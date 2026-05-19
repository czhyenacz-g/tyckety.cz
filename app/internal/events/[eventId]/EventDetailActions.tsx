"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventTitle: string;
  status: string;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Publikovaná",
  cancelled: "Zrušená",
  ended: "Ukončená",
};

const statusBadge: Record<string, string> = {
  draft: "text-gray-400 bg-gray-700/50 border-gray-600",
  published: "text-green-400 bg-green-900/30 border-green-800",
  cancelled: "text-red-400 bg-red-900/30 border-red-800",
  ended: "text-yellow-400 bg-yellow-900/30 border-yellow-800",
};

export default function EventDetailActions({ eventId, eventTitle, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(newStatus: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(`status-${newStatus}`);
    await fetch(`/api/internal/events/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setBusy(null);
    router.refresh();
  }

  async function deactivateScanner() {
    setBusy("scanner");
    await fetch(`/api/internal/events/${eventId}/deactivate-scanner`, { method: "POST" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`text-xs border rounded-full px-2.5 py-1 font-medium ${statusBadge[status] ?? "text-gray-400 border-gray-600"}`}
      >
        {statusLabel[status] ?? status}
      </span>
      {status !== "published" && (
        <Btn label="Publikovat" busy={busy === "status-published"} onClick={() => setStatus("published")} color="green" />
      )}
      {status === "published" && (
        <Btn label="Depublikovat" busy={busy === "status-draft"} onClick={() => setStatus("draft")} color="yellow" />
      )}
      {status !== "cancelled" && status !== "ended" && (
        <Btn
          label="Zrušit akci"
          busy={busy === "status-cancelled"}
          onClick={() => setStatus("cancelled", `Opravdu zrušit akci "${eventTitle}"? Tato akce je nevratná.`)}
          color="red"
        />
      )}
      {status !== "ended" && status !== "cancelled" && (
        <Btn label="Ukončit" busy={busy === "status-ended"} onClick={() => setStatus("ended")} color="gray" />
      )}
      <Btn label="Deakt. scanner" busy={busy === "scanner"} onClick={deactivateScanner} color="gray" />
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
      className={`text-xs border rounded px-2.5 py-1 disabled:opacity-50 transition-colors ${colors[color]}`}
    >
      {busy ? "…" : label}
    </button>
  );
}
