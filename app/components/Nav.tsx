import Link from "next/link";

export default function Nav() {
  return (
    <nav className="border-b border-gray-800 px-4 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-amber-400 tracking-tight">
          Tyckety.cz
        </Link>
        <Link
          href="/prihlaseni"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Přihlásit se
        </Link>
      </div>
    </nav>
  );
}
