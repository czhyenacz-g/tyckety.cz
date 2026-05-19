"use client";

import { useState, useRef } from "react";

type ScanStatus =
  | "idle"
  | "not_found"
  | "wrong_event"
  | "cancelled"
  | "already_used"
  | "valid"
  | "marked_used"
  | "error";

interface ScanResult {
  status: ScanStatus;
  buyerName?: string;
  categoryName?: string;
  usedAt?: string | null;
  errorMessage?: string;
}

function extractTicketToken(input: string): string | null {
  const trimmed = input.trim();
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = trimmed.match(uuidRe);
  return match ? match[0] : null;
}

interface Props {
  scanToken: string;
  eventTitle: string;
}

export default function ScannerForm({ scanToken, eventTitle }: Props) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [marking, setMarking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleValidate(e: React.FormEvent) {
    e.preventDefault();
    const token = extractTicketToken(input);
    if (!token) {
      setResult({ status: "error", errorMessage: "Neplatný formát tokenu." });
      return;
    }
    setValidating(true);
    setResult(null);
    setCurrentToken(token);

    try {
      const res = await fetch(`/api/scan/${scanToken}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ status: "error", errorMessage: data.error });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ status: "error", errorMessage: "Chyba sítě." });
    } finally {
      setValidating(false);
    }
  }

  async function handleMarkUsed() {
    if (!currentToken || marking) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/scan/${scanToken}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketToken: currentToken }),
      });
      if (res.ok) {
        setResult({ status: "marked_used" });
      } else {
        const data = await res.json();
        // If already used by concurrent click, re-validate to show current state
        if (res.status === 409) {
          setResult({ status: "already_used", ...result });
        } else {
          setResult({ status: "error", errorMessage: data.error });
        }
      }
    } catch {
      setResult({ status: "error", errorMessage: "Chyba sítě." });
    } finally {
      setMarking(false);
    }
  }

  function handleReset() {
    setInput("");
    setResult(null);
    setCurrentToken(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="space-y-4">
      {/* Název akce */}
      <div className="text-center mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Vstupní kontrola</p>
        <h1 className="text-xl font-bold">{eventTitle}</h1>
      </div>

      {/* Formulář */}
      <form onSubmit={handleValidate} className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Vložte token nebo URL vstupenky"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
        />
        {/* TODO: camera QR scan — přidat html5-qrcode nebo jsQR knihovnu */}
        <button
          type="submit"
          disabled={validating || !input.trim()}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-semibold py-3.5 rounded-xl transition-colors"
        >
          {validating ? "Ověřuji…" : "Ověřit vstupenku"}
        </button>
      </form>

      {/* Výsledek */}
      {result && <ResultBanner result={result} onMarkUsed={handleMarkUsed} onReset={handleReset} marking={marking} />}
    </div>
  );
}

function ResultBanner({
  result,
  onMarkUsed,
  onReset,
  marking,
}: {
  result: ScanResult;
  onMarkUsed: () => void;
  onReset: () => void;
  marking: boolean;
}) {
  const cfg = {
    valid: {
      bg: "bg-green-900/40 border-green-700",
      icon: "✓",
      iconColor: "text-green-400",
      title: "Platná vstupenka",
      titleColor: "text-green-400",
    },
    marked_used: {
      bg: "bg-green-900/40 border-green-700",
      icon: "✓",
      iconColor: "text-green-400",
      title: "Vpuštěno",
      titleColor: "text-green-400",
    },
    already_used: {
      bg: "bg-orange-900/40 border-orange-700",
      icon: "!",
      iconColor: "text-orange-400",
      title: "Vstupenka již použita",
      titleColor: "text-orange-400",
    },
    not_found: {
      bg: "bg-red-900/40 border-red-700",
      icon: "✕",
      iconColor: "text-red-400",
      title: "Vstupenka nenalezena",
      titleColor: "text-red-400",
    },
    wrong_event: {
      bg: "bg-red-900/40 border-red-700",
      icon: "✕",
      iconColor: "text-red-400",
      title: "Vstupenka patří k jiné akci",
      titleColor: "text-red-400",
    },
    cancelled: {
      bg: "bg-red-900/40 border-red-700",
      icon: "✕",
      iconColor: "text-red-400",
      title: "Vstupenka zrušena",
      titleColor: "text-red-400",
    },
    error: {
      bg: "bg-gray-800 border-gray-600",
      icon: "?",
      iconColor: "text-gray-400",
      title: "Chyba",
      titleColor: "text-gray-300",
    },
    idle: {
      bg: "bg-gray-800 border-gray-600",
      icon: "?",
      iconColor: "text-gray-400",
      title: "",
      titleColor: "",
    },
  }[result.status];

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${cfg.bg}`}>
      <div className="flex items-center gap-3">
        <span className={`text-4xl font-bold ${cfg.iconColor}`}>{cfg.icon}</span>
        <div>
          <p className={`font-bold text-xl ${cfg.titleColor}`}>{cfg.title}</p>
          {result.buyerName && (
            <p className="text-gray-300 text-sm mt-0.5">{result.buyerName}</p>
          )}
          {result.categoryName && (
            <p className="text-gray-400 text-xs">{result.categoryName}</p>
          )}
          {result.status === "already_used" && result.usedAt && (
            <p className="text-orange-300 text-xs mt-1">
              Použita: {new Date(result.usedAt).toLocaleString("cs-CZ")}
            </p>
          )}
          {result.status === "error" && result.errorMessage && (
            <p className="text-gray-400 text-sm">{result.errorMessage}</p>
          )}
        </div>
      </div>

      {result.status === "valid" && (
        <button
          onClick={onMarkUsed}
          disabled={marking}
          className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          {marking ? "Označuji…" : "Označit jako použito →"}
        </button>
      )}

      <button
        onClick={onReset}
        className="w-full text-sm text-gray-400 hover:text-white py-2 transition-colors"
      >
        ← Další vstupenka
      </button>
    </div>
  );
}
