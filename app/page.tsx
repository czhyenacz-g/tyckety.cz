import Link from "next/link";
import Nav from "./components/Nav";

const benefits = [
  {
    icon: "🏦",
    title: "Platba QR kódem na váš účet",
    description:
      "Zákazník naskenuje QR kód a zaplatí přes svou bankovní aplikaci rovnou vám. Peníze jdou přímo — bez prostředníka, bez poplatků za transakce.",
  },
  {
    icon: "📱",
    title: "Kontrola u vstupu mobilem",
    description:
      "Každá vstupenka má unikátní QR kód. U vstupu ho ověříte na telefonu — jednoduše, bez speciálního hardwaru.",
  },
  {
    icon: "🌱",
    title: "Teď bez poplatků",
    description:
      "Tyckety je čerstvé MVP pro malé akce. Ceník necháme na později — teď hlavně chceme, aby to fungovalo.",
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
              Pro malé pořadatele
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              Vstupenky pro malé akce
              <br />
              <span className="text-amber-400">bez velkého ticketingu</span>
            </h1>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Vytvoříte akci, zákazník zaplatí QR kódem na váš účet a u vstupu
              jen ověříte lístek mobilem.
            </p>
            <Link
              href="/prihlaseni"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-colors text-base"
            >
              Vytvořit první akci →
            </Link>
            <p className="text-gray-600 text-sm mt-4">
              Bez registrace zákazníků · Teď bez poplatků
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
              Začít →
            </Link>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="border-t border-gray-800 px-4 py-8 text-center">
          <p className="text-gray-600 text-xs max-w-xl mx-auto leading-relaxed">
            Tyckety je nástroj pro vytvoření a kontrolu vstupenek. Pořadatel odpovídá za akci,
            ceny, kapacitu, přijetí plateb, vrácení peněz a komunikaci se zákazníky.
          </p>
        </section>
      </main>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-gray-600 text-sm">
        <div className="flex items-center justify-center gap-4">
          <span>© {new Date().getFullYear()} Tyckety.cz</span>
          <Link href="/podminky" className="hover:text-gray-400 transition-colors">
            Podmínky
          </Link>
        </div>
      </footer>
    </>
  );
}
