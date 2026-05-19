import Link from "next/link";

export default function NovaAkce() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Nová akce</h1>
        <p className="text-gray-400 text-sm mb-6">Formulář pro vytvoření akce — brzy k dispozici.</p>
        <Link href="/app/akce" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
          ← Zpět na akce
        </Link>
      </div>
    </main>
  );
}
