"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportSummary {
  processed: number;
  matched: number;
  amountMismatch: number;
  unknownSymbol: number;
  missingSymbol: number;
  latePayment: number;
  alreadyPaid: number;
  duplicates: number;
  parseErrors: number;
  totalAmountCzk: number;
  matchedAmountCzk: number;
}

interface ImportDetail {
  transactionId: string;
  variableSymbol: string | null;
  amountCzk: number;
  result: string;
  buyerName?: string;
}

interface ImportResult {
  summary: ImportSummary;
  details: ImportDetail[];
  parseErrors: { line: number; error: string }[];
}

const RESULT_LABEL: Record<string, string> = {
  matched: "Spárováno",
  amount_mismatch: "Špatná částka",
  unknown_symbol: "Neznámý VS",
  missing_symbol: "Chybí VS",
  late_payment: "Pozdní platba",
  already_paid: "Již zaplaceno",
  duplicate: "Duplikát",
  wrong_account: "Cizí účet",
};

const RESULT_COLOR: Record<string, string> = {
  matched: "text-green-400",
  amount_mismatch: "text-red-400",
  unknown_symbol: "text-yellow-400",
  missing_symbol: "text-yellow-400",
  late_payment: "text-blue-400",
  already_paid: "text-gray-500",
  duplicate: "text-gray-600",
  wrong_account: "text-gray-600",
};

export default function CsvImportForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Vyberte CSV soubor");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const csvContent = await file.text();
      const res = await fetch(`/api/akce/${eventId}/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Chyba serveru (${res.status})`);
        return;
      }

      setResult(data as ImportResult);
      if ((data as ImportResult).summary.matched > 0) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neznámá chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="mb-6 group">
      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400 transition-colors select-none py-1">
        Import plateb z bankovního výpisu (CSV) ›
      </summary>
      <div className="mt-3 bg-gray-800 border border-gray-700 rounded-xl p-5">
        <p className="text-xs text-gray-500 mb-3">
          Nahrajte CSV výpis z Raiffeisenbank. Platby se automaticky spárují s objednávkami podle variabilního symbolu.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600 file:cursor-pointer"
          />
          <button
            type="submit"
            disabled={loading}
            className="text-xs px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-amber-100 rounded-lg transition-colors shrink-0"
          >
            {loading ? "Zpracovávám…" : "Zpracovat platby"}
          </button>
        </form>

        {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}

        {result && (
          <div className="mt-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: "Zpracováno", value: result.summary.processed, color: "" },
                { label: "Spárováno", value: result.summary.matched, color: result.summary.matched > 0 ? "text-green-400" : "" },
                { label: "Chybná částka", value: result.summary.amountMismatch, color: result.summary.amountMismatch > 0 ? "text-red-400" : "" },
                { label: "Neznámý VS", value: result.summary.unknownSymbol, color: "" },
                { label: "Chybí VS", value: result.summary.missingSymbol, color: "" },
                { label: "Pozdní platba", value: result.summary.latePayment, color: "" },
                { label: "Již zaplaceno", value: result.summary.alreadyPaid, color: "" },
                { label: "Duplikáty", value: result.summary.duplicates, color: "" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-900 rounded-lg p-2 text-center">
                  <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-gray-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>

            {result.summary.matchedAmountCzk > 0 && (
              <p className="text-green-400 text-sm font-medium mb-3">
                Automaticky spárováno: {result.summary.matchedAmountCzk.toLocaleString("cs-CZ")} Kč
              </p>
            )}

            {result.details.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600 text-xs uppercase tracking-wide border-b border-gray-700">
                      <th className="pb-2 pr-3">VS</th>
                      <th className="pb-2 pr-3">Částka</th>
                      <th className="pb-2 pr-3">Zákazník</th>
                      <th className="pb-2">Výsledek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {result.details.map((d) => (
                      <tr key={d.transactionId}>
                        <td className="py-1.5 pr-3 font-mono text-gray-400">{d.variableSymbol ?? "—"}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{d.amountCzk.toLocaleString("cs-CZ")} Kč</td>
                        <td className="py-1.5 pr-3 text-gray-400">{d.buyerName ?? "—"}</td>
                        <td className={`py-1.5 font-medium ${RESULT_COLOR[d.result] ?? ""}`}>
                          {RESULT_LABEL[d.result] ?? d.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.parseErrors.length > 0 && (
              <div className="mt-3 space-y-0.5">
                <p className="text-red-400 text-xs font-medium">Chyby při parsování ({result.parseErrors.length}):</p>
                {result.parseErrors.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">
                    Řádek {e.line}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
