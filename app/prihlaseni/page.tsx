import Link from "next/link";
import Nav from "../components/Nav";

export default function Prihlaseni() {
  return (
    <>
      <Nav />
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-2">Přihlášení</h1>
          <p className="text-gray-400 text-sm mb-8">Brzy k dispozici.</p>
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
            ← Zpět na úvod
          </Link>
        </div>
      </main>
    </>
  );
}
