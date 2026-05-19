"use client";

import { useState } from "react";

export default function PrihlaseniForm() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Něco se pokazilo, zkuste to znovu.");
    } else {
      setLink(data.link);
    }
  }

  if (link) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
        <div className="text-2xl mb-3">✉️</div>
        <p className="font-medium mb-1">Přihlašovací odkaz je připraven</p>
        <p className="text-gray-400 text-sm mb-6">
          V produkci přijde na váš e-mail. Pro MVP klikněte na tlačítko níže.
        </p>
        <a
          href={link}
          className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          Přihlásit se →
        </a>
        <p className="text-gray-600 text-xs mt-4">Odkaz vyprší za 15 minut.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vas@email.cz"
        required
        autoFocus
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        {loading ? "Odesílám..." : "Odeslat přihlašovací odkaz"}
      </button>
    </form>
  );
}
