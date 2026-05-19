import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/app/components/AppHeader";

export default async function AppDashboard() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni?next=/app");

  const { organizer } = session;

  const [eventCount, categories] = await Promise.all([
    db.event.count({ where: { organizerId: organizer.id } }),
    db.ticketCategory.findMany({
      where: { event: { organizerId: organizer.id } },
      select: { soldCount: true, priceCzk: true },
    }),
  ]);

  const totalSold = categories.reduce((s, c) => s + c.soldCount, 0);
  const totalRevenue = categories.reduce((s, c) => s + c.soldCount * c.priceCzk, 0);

  const stats = [
    { label: "Akce celkem", value: eventCount },
    { label: "Prodané lístky", value: totalSold },
    { label: "Příjmy (Kč)", value: totalRevenue.toLocaleString("cs-CZ") },
  ];

  return (
    <>
      <AppHeader name={organizer.name} email={organizer.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <Link
          href="/app/akce/nova"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          + Vytvořit novou akci
        </Link>

        <div className="mt-4">
          <Link href="/app/akce" className="text-sm text-gray-500 hover:text-white transition-colors">
            Zobrazit všechny akce →
          </Link>
        </div>
      </main>
    </>
  );
}
