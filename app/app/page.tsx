import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";

const stats = [
  { label: "Akce celkem", value: 0 },
  { label: "Prodané lístky", value: 0 },
  { label: "Příjmy (Kč)", value: 0 },
];

export default async function AppDashboard() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  const { organizer } = session;

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <Link href="/" className="text-amber-400 font-bold text-lg tracking-tight">
              Tyckety.cz
            </Link>
            <p className="text-white font-semibold mt-3">{organizer.name}</p>
            <p className="text-gray-400 text-sm">{organizer.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-white transition-colors mt-1"
            >
              Odhlásit
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/app/akce/nova"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          + Vytvořit první akci
        </Link>

        {/* Nav links */}
        <div className="mt-8 flex gap-4 text-sm text-gray-500">
          <Link href="/app/akce" className="hover:text-white transition-colors">
            Moje akce
          </Link>
        </div>
      </div>
    </main>
  );
}
