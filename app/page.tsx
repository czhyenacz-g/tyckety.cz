import Link from "next/link";
import Nav from "./components/Nav";

const benefits = [
  {
    icon: "⚡",
    title: "Za pár minut na vašem webu",
    description:
      "Jeden řádek kódu a widget pro prodej vstupenek se zobrazí přímo na vašem webu nebo na stránce Tyckety.cz.",
  },
  {
    icon: "🏦",
    title: "Platba QR kódem na váš účet",
    description:
      "Bez platební brány, bez poplatků za transakce. Zákazník naskenuje QR kód a zaplatí přes svou bankovní aplikaci rovnou vám.",
  },
  {
    icon: "🎟️",
    title: "Prvních 200 lístků zdarma",
    description:
      "Začněte bez závazků a bez platební karty. Poplatky začínají až od 201. prodaného lístku.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="px-4 pt-24 pb-20 text-center">
          <div className="max-w-2xl mx-auto">
            <p className="text-amber-400 text-sm font-medium uppercase tracking-widest mb-6">
              Ticketing widget pro pořadatele
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              Vstupenky na váš web
              <br />
              <span className="text-amber-400">za pár minut</span>
            </h1>
            <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto">
              Bez platební brány. Zákazníci platí QR kódem přímo na váš bankovní
              účet. Vy máte peníze hned.
            </p>
            <Link
              href="/prihlaseni"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-colors text-base"
            >
              Vytvořit první akci zdarma →
            </Link>
            <p className="text-gray-600 text-sm mt-4">
              Bez platební karty · Prvních 200 lístků zdarma
            </p>
          </div>
        </section>

        {/* Benefits */}
        <section className="px-4 pb-24">
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6"
              >
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="border-t border-gray-800 px-4 py-16 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">Připraveni začít?</h2>
            <p className="text-gray-400 mb-8">
              Zaregistrujte se a mějte první akci online dřív, než si uvaříte kávu.
            </p>
            <Link
              href="/prihlaseni"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Začít zdarma
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Tyckety.cz
      </footer>
    </>
  );
}
