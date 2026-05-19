import Link from "next/link";

interface Props {
  name: string;
  email: string;
}

export default function AppHeader({ name, email }: Props) {
  return (
    <header className="border-b border-gray-800 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-amber-400 font-bold tracking-tight">
            Tyckety.cz
          </Link>
          <nav className="flex gap-4 text-sm text-gray-400">
            <Link href="/app" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/app/akce" className="hover:text-white transition-colors">
              Akce
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-white leading-none">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Odhlásit
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
