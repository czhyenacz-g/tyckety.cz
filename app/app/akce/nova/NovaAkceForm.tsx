"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultBankAccount: string;
  defaultNotificationEmail: string;
}

export default function NovaAkceForm({ defaultBankAccount, defaultNotificationEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      startsAt: fd.get("startsAt"),
      venueName: fd.get("venueName"),
      venueAddress: fd.get("venueAddress"),
      description: fd.get("description"),
      posterUrl: fd.get("posterUrl"),
      priceCzk: fd.get("priceCzk"),
      capacity: fd.get("capacity"),
      bankAccount: fd.get("bankAccount"),
      notificationEmail: fd.get("notificationEmail"),
      ico: fd.get("ico"),
    };

    const res = await fetch("/api/akce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Něco se pokazilo.");
    } else {
      router.push(`/app/akce/${data.eventId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Základní info */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Základní informace</h2>
        <Field label="Název akce *" name="title" type="text" placeholder="Koncert Jana Nováka" required />
        <Field label="Datum a čas *" name="startsAt" type="datetime-local" required />
        <Field label="Místo / název *" name="venueName" type="text" placeholder="Divadlo Na Příkopě" required />
        <Field label="Adresa" name="venueAddress" type="text" placeholder="Na Příkopě 1, Praha 1" />
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Popis</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Stručný popis akce pro návštěvníky…"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Odkaz na plakát</label>
          <input
            type="url"
            name="posterUrl"
            placeholder="https://..."
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">Vložte odkaz na obrázek/plakát akce. Upload zatím neřešíme.</p>
        </div>
      </section>

      {/* Vstupenky */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Vstupenky</h2>
        <p className="text-xs text-gray-500">Vytvoří se jedna kategorie „Základní vstupenka". Další kategorie půjde přidat z detailu akce.</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cena (Kč) *" name="priceCzk" type="number" min="0" placeholder="350" required />
          <Field label="Kapacita *" name="capacity" type="number" min="1" placeholder="200" required />
        </div>
      </section>

      {/* Platba */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">Platba & notifikace</h2>
        <Field
          label="Bankovní účet *"
          name="bankAccount"
          type="text"
          placeholder="1234567890/0800"
          defaultValue={defaultBankAccount}
          required
        />
        <Field
          label="Notifikační e-mail"
          name="notificationEmail"
          type="email"
          placeholder="info@moje-akce.cz"
          defaultValue={defaultNotificationEmail}
        />
        <Field
          label="IČO"
          name="ico"
          type="text"
          placeholder="12345678"
          helperText="Vyplňte, pokud akci pořádáte jako podnikatel nebo organizace."
        />
      </section>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
      >
        {loading ? "Ukládám…" : "Vytvořit akci"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
  min,
  defaultValue,
  helperText,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  defaultValue?: string;
  helperText?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        min={min}
        defaultValue={defaultValue}
        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-sm"
      />
      {helperText && <p className="text-xs text-gray-600 mt-1">{helperText}</p>}
    </div>
  );
}
