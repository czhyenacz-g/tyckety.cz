"use client";

import { useState } from "react";

export default function CopyVS({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div className="bg-gray-900 border border-amber-700/50 rounded-xl p-4 mt-4">
      <p className="text-gray-500 text-xs uppercase tracking-wide text-center mb-1">Variabilní symbol</p>
      <p className="text-4xl font-black text-white tracking-widest text-center mb-4">{value}</p>
      <button
        onClick={handleCopy}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors bg-amber-800/40 hover:bg-amber-700/50 text-amber-300 border border-amber-700/60"
      >
        {copied ? "✓ Zkopírováno" : "Kopírovat variabilní symbol"}
      </button>
    </div>
  );
}
