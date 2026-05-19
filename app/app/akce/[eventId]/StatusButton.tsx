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

  const isPublished = currentStatus === "published";

  async function toggle() {
    setLoading(true);
    await fetch(`/api/akce/${eventId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isPublished ? "draft" : "published" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        isPublished
          ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
          : "bg-green-800 hover:bg-green-700 text-green-200"
      }`}
    >
      {loading ? "…" : isPublished ? "Depublikovat" : "Zveřejnit akci"}
    </button>
  );
}
