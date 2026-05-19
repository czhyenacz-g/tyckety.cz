import Link from "next/link";

export default function AppDashboard() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 text-sm mb-6">Správa akcí — brzy k dispozici.</p>
        <Link href="/app/akce" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
          Moje akce →
        </Link>
      </div>
    </main>
  );
}
