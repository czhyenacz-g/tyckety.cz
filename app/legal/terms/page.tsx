import type { Metadata } from "next";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Obchodní podmínky | Tyckety.cz",
  description: "Obchodní podmínky pro používání ticketovací platformy Tyckety.cz.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-12 text-gray-300 leading-relaxed">
        <h1 className="text-3xl font-bold text-white mb-2">Obchodní podmínky</h1>
        <p className="text-sm text-gray-500 mb-10">Platné od 1. 6. 2025</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Provozovatel platformy</h2>
          <p>
            Tyckety.cz (dále jen „Tyckety") je ticketovací platforma provozovaná jako MVP projekt.
            Tyckety poskytují technické řešení pro vytvoření, prodej/evidenci a ověření vstupenek.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Pořadatel akce</h2>
          <p className="mb-3">
            Pořadatelem akce je subjekt uvedený na stránce konkrétní akce (dále jen „pořadatel").
            Tyckety.cz nejsou pořadatelem akce, pokud není výslovně uvedeno jinak.
          </p>
          <p className="mb-3">
            Pořadatel odpovídá za:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400 mb-3">
            <li>pravdivost všech údajů zveřejněných v popisu akce,</li>
            <li>konání akce v uvedeném termínu a místě,</li>
            <li>případné změny programu, termínu nebo místa konání,</li>
            <li>zrušení akce a vrácení vstupného kupujícím,</li>
            <li>vyřizování reklamací a stížností zákazníků.</li>
          </ul>
          <p>
            Pořadatel prohlašuje, že má veškerá práva akci pořádat a prodávat na ni vstupenky.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Platba</h2>
          <p className="mb-3">
            Platba za vstupenku probíhá formou bankovního převodu přímo na bankovní účet pořadatele.
            Tyckety.cz nevybírají platby za vstupenky ani nedrží finanční prostředky zákazníků.
          </p>
          <p>
            Tyckety.cz neposkytují platební bránu ani nezprostředkovávají platby.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Vstupenky a objednávky</h2>
          <p className="mb-3">
            Po vytvoření objednávky a připsání platby na účet pořadatele jsou vstupenky vystaveny
            pořadatelem prostřednictvím platformy Tyckety. Vstupenka je platná pouze pro danou akci
            a je nepřenosná, pokud pořadatel nestanoví jinak.
          </p>
          <p>
            Tyckety poskytují technické řešení pro ověření platnosti vstupenek u vstupu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Ochrana platformy</h2>
          <p>
            Tyckety.cz si vyhrazují právo skrýt, pozastavit nebo zablokovat akci, která je
            podezřelá z porušení těchto podmínek, obsahuje nepravdivé údaje nebo by mohla
            způsobit škodu kupujícím. Rozhodnutí o blokaci je na uvážení provozovatele platformy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Kontakt</h2>
          <p>
            Dotazy k platformě zasílejte na{" "}
            <a href="mailto:info@tyckety.cz" className="text-amber-400 hover:underline">
              info@tyckety.cz
            </a>
            . Stížnosti a reklamace týkající se konkrétní akce směřujte přímo na pořadatele.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
