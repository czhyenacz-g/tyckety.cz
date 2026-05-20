export default function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-16 py-6 px-6">
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <span>© {new Date().getFullYear()} Tyckety.cz</span>
        <div className="flex gap-4">
          <a href="/legal/terms" className="hover:text-gray-300 transition-colors">
            Obchodní podmínky
          </a>
          <a href="/legal/privacy" className="hover:text-gray-300 transition-colors">
            Ochrana osobních údajů
          </a>
          <a href="mailto:info@tyckety.cz" className="hover:text-gray-300 transition-colors">
            Kontakt
          </a>
        </div>
      </div>
    </footer>
  );
}
