import Link from "next/link";
import Image from "next/image";
import Nav from "./components/Nav";

const DEMO_URL = "/demo-podnik/test-heavy-metal-koncert";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="min-h-screen">

        {/* ── Hero: demo concert ── */}
        <section className="px-4 pt-16 pb-12">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">

            {/* Plakát */}
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
              <Image
                src="/images/test_koncert_web.webp"
                alt="Plakát — TEST Heavy metal koncert"
                width={600}
                height={848}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
                  Ukázková akce · Tyckety.cz
                </p>
                <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
                  TEST —<br />
                  <span className="text-amber-400">Heavy metal</span><br />
                  koncert
                </h1>
                <div className="space-y-1 text-gray-300 text-sm">
                  <p>📅 24. října 2026 · 19:00</p>
                  <p>📍 Klub Inferno, Praha</p>
                  <p>🎟 Základní vstupenka — 299 Kč</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Nezaměnitelná atmosféra, basy co otřásají zdmi a pět kapel nabitých riffama.
                Tohle není koncert pro slabé povahy — přijďte si vyčistit hlavu a nechat se rozdrtit hudbou.
              </p>

              {/* CTA */}
              <div className="flex flex-col gap-3">
                <Link
                  href={DEMO_URL}
                  className="inline-block text-center bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-6 py-3.5 rounded-xl transition-colors text-base"
                >
                  Vyzkoušet nákup lístku →
                </Link>
                <Link
                  href="/prihlaseni"
                  className="inline-block text-center border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  Chci takovou stránku pro vlastní akci
                </Link>
              </div>

              {/* Demo disclaimer */}
              <p className="text-gray-600 text-xs leading-relaxed border-t border-gray-800 pt-4">
                Tohle je demo akce vytvořená v Tyckety. Koupí testovacího lístku nevzniká nárok
                na vstup na skutečný koncert. Pokud lístek koupíte, berte to jako podporu vývoje projektu.
              </p>
            </div>
          </div>
        </section>

        {/* ── Product explanation ── */}
        <section className="border-t border-gray-800 px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Pro pořadatele
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Tuhle stránku si můžete udělat pro vlastní akci
            </h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto">
              Vstupenky pro malé akce bez velkého ticketingu. Bez platební brány, bez registrace zákazníků.
            </p>

            <div className="grid sm:grid-cols-4 gap-4 mb-10 text-left">
              {[
                { n: "1", text: "Vytvoříte akci a nastavíte cenu" },
                { n: "2", text: "Zákazník zaplatí QR kódem přímo na váš účet" },
                { n: "3", text: "Systém vygeneruje QR vstupenku a pošle ji e-mailem" },
                { n: "4", text: "U vstupu ověříte lístek mobilem" },
              ].map((s) => (
                <div key={s.n} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <p className="text-amber-400 text-2xl font-black mb-2">{s.n}</p>
                  <p className="text-gray-300 text-sm leading-snug">{s.text}</p>
                </div>
              ))}
            </div>

            <Link
              href="/prihlaseni"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold px-8 py-3.5 rounded-xl transition-colors"
            >
              Vytvořit vlastní akci →
            </Link>
            <p className="text-gray-600 text-xs mt-3">Teď bez poplatků · MVP ve vývoji</p>
          </div>
        </section>

      </main>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-gray-600 text-xs">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span>© {new Date().getFullYear()} Tyckety.cz</span>
          <Link href="/podminky" className="hover:text-gray-400 transition-colors">
            Podmínky
          </Link>
        </div>
        <p className="max-w-md mx-auto text-gray-700">
          Tyckety není pořadatel akce. U demo akce jde o ukázku produktu a podporu vývoje.
        </p>
      </footer>
    </>
  );
}
