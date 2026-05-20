"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StatusButton({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/akce/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  if (currentStatus === "published") {
    return (
      <button
        onClick={() => setStatus("draft")}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-gray-700 hover:bg-gray-600 text-gray-300"
      >
        {loading ? "…" : "Depublikovat"}
      </button>
    );
  }

  if (currentStatus === "pending_review") {
    return (
      <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-yellow-900/40 text-yellow-300 border border-yellow-700/50">
        Čeká na schválení
      </span>
    );
  }

  if (currentStatus === "blocked") {
    return (
      <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-900/40 text-red-300 border border-red-700/50">
        Zablokováno
      </span>
    );
  }

  if (currentStatus === "draft") {
    return (
      <button
        onClick={() => setStatus("pending_review")}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 bg-green-800 hover:bg-green-700 text-green-200"
      >
        {loading ? "…" : "Odeslat ke schválení"}
      </button>
    );
  }

  return null;
}
