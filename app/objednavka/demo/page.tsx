import Link from "next/link";

export default function ObjednavkaDemo() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-amber-400 text-xs font-medium uppercase tracking-widest mb-4">Demo objednávka</p>
        <h1 className="text-2xl font-bold mb-2">Objednávka lístku</h1>
        <p className="text-gray-400 text-sm mb-6">Nákupní flow — brzy k dispozici.</p>
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
          ← Zpět na úvod
        </Link>
      </div>
    </main>
  );
}
