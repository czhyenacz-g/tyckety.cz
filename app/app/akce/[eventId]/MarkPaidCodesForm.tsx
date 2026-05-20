"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResultKind = "matched" | "already_paid" | "not_found" | "capacity_blocked";

interface CodeResult {
  code: string;
  result: ResultKind;
  buyerName?: string;
  amountCzk?: number;
}

interface MarkPaidResponse {
  summary: {
    matched: number;
    alreadyPaid: number;
    notFound: number;
    capacityBlocked: number;
    duplicateInput: number;
  };
  results: CodeResult[];
  duplicateInputCodes: string[];
}

const RESULT_LABEL: Record<ResultKind, string> = {
  matched: "Označeno zaplaceno",
  already_paid: "Již zaplaceno",
  not_found: "Nenalezeno",
  capacity_blocked: "Kapacita plná",
};

const RESULT_COLOR: Record<ResultKind, string> = {
  matched: "text-green-400",
  already_paid: "text-gray-500",
  not_found: "text-red-400",
  capacity_blocked: "text-amber-400",
};

export default function MarkPaidCodesForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [codes, setCodes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkPaidResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codes.trim()) { setError("Vložte alespoň jeden kód"); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/akce/${eventId}/mark-paid-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Chyba serveru (${res.status})`);
        return;
      }

      const parsed = data as MarkPaidResponse;
      setResult(parsed);
      if (parsed.summary.matched > 0) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="mb-6 group">
      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400 transition-colors select-none py-1">
        Označit zaplacené podle kódů ›
      </summary>
      <div className="mt-3 bg-gray-800 border border-gray-700 rounded-xl p-5">
        <p className="text-xs text-gray-500 mb-3">
          Vložte variabilní symboly zaplacených objednávek. Můžete použít čárky, mezery, středníky nebo nové řádky.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={codes}
            onChange={(e) => setCodes(e.target.value)}
            rows={4}
            placeholder="Např. 123456, 987654, 555111"
            className="w-full text-sm font-mono bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-y"
          />
          <button
            type="submit"
            disabled={loading}
            className="text-xs px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-100 rounded-lg transition-colors"
          >
            {loading ? "Zpracovávám…" : "Označit jako zaplacené"}
          </button>
        </form>

        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}

        {result && (
          <div className="mt-5">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
              {[
                { label: "Označeno", value: result.summary.matched, color: result.summary.matched > 0 ? "text-green-400" : "" },
                { label: "Již zaplaceno", value: result.summary.alreadyPaid, color: "" },
                { label: "Nenalezeno", value: result.summary.notFound, color: result.summary.notFound > 0 ? "text-red-400" : "" },
                { label: "Kapacita plná", value: result.summary.capacityBlocked, color: result.summary.capacityBlocked > 0 ? "text-amber-400" : "" },
                { label: "Duplikáty", value: result.summary.duplicateInput, color: "" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-900 rounded-lg p-2 text-center">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {result.results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600 text-xs uppercase tracking-wide border-b border-gray-700">
                      <th className="pb-2 pr-3">Kód</th>
                      <th className="pb-2 pr-3">Zákazník</th>
                      <th className="pb-2 pr-3">Částka</th>
                      <th className="pb-2">Výsledek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {result.results.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-3 font-mono text-gray-400">{r.code}</td>
                        <td className="py-1.5 pr-3 text-gray-400">{r.buyerName ?? "—"}</td>
                        <td className="py-1.5 pr-3 tabular-nums">
                          {r.amountCzk != null ? `${r.amountCzk.toLocaleString("cs-CZ")} Kč` : "—"}
                        </td>
                        <td className={`py-1.5 font-medium ${RESULT_COLOR[r.result]}`}>
                          {RESULT_LABEL[r.result]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.duplicateInputCodes.length > 0 && (
              <p className="mt-3 text-gray-600 text-xs">
                Duplikáty ve vstupu (zpracován jen první výskyt):{" "}
                {result.duplicateInputCodes.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
