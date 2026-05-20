"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  priceCzk: number;
  available: number;
}

interface Props {
  eventId: string;
  category: Category;
}

export default function PurchaseForm({ eventId, category }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.min(category.available, 10);
  const total = qty * category.priceCzk;

  if (category.available <= 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
        <p className="text-gray-400 font-medium">Vstupenky jsou vyprodané.</p>
        <p className="text-gray-500 text-sm mt-1">Sledujte nás pro případné uvolnění kapacity.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/objednavka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        categoryId: category.id,
        buyerName: fd.get("buyerName"),
        buyerEmail: fd.get("buyerEmail"),
        quantity: qty,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Nepodařilo se vytvořit objednávku.");
    } else {
      router.push(`/objednavka/${data.orderToken}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{category.name}</span>
          <span className="text-amber-400 font-semibold">{category.priceCzk} Kč / ks</span>
        </div>
        <p className="text-gray-500 text-xs">Zbývá {category.available} míst</p>
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Jméno a příjmení *</label>
        <input
          type="text"
          name="buyerName"
          required
          autoComplete="name"
          placeholder="Jan Novák"
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">E-mail *</label>
        <input
          type="email"
          name="buyerEmail"
          required
          autoComplete="email"
          placeholder="jan@novak.cz"
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1.5">Počet vstupenek *</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            −
          </button>
          <span className="text-lg font-semibold w-6 text-center">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-bold transition-colors"
          >
            +
          </button>
          <span className="text-gray-500 text-sm ml-1">max {maxQty} ks</span>
        </div>
      </div>

      <div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            name="termsAccepted"
            required
            className="mt-0.5 accent-amber-500 shrink-0"
          />
          <span className="text-xs text-gray-400 leading-relaxed">
            Souhlasím s{" "}
            <a
              href="/legal/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              obchodními podmínkami
            </a>
            .
          </span>
        </label>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Osobní údaje zadané v objednávce zpracujeme za účelem vytvoření objednávky, doručení
        vstupenek, ověření vstupu na akci a řešení případných problémů s objednávkou.{" "}
        <a
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:underline"
        >
          Podrobnosti v Zásadách ochrany osobních údajů.
        </a>
      </p>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <div className="border-t border-gray-700 pt-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="sm:flex-1">
          <p className="text-xs text-gray-500">Celkem k úhradě</p>
          <p className="text-2xl font-bold text-amber-400">{total.toLocaleString("cs-CZ")} Kč</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-semibold px-5 py-2.5 rounded-xl transition-colors text-base"
        >
          {loading ? "Odesílám…" : "Vytvořit objednávku"}
        </button>
      </div>
    </form>
  );
}
