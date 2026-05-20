import type { Metadata } from "next";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů | Tyckety.cz",
  description: "Zásady ochrany osobních údajů platformy Tyckety.cz.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-12 text-gray-300 leading-relaxed">
        <h1 className="text-3xl font-bold text-white mb-2">Zásady ochrany osobních údajů</h1>
        <p className="text-sm text-gray-500 mb-10">Platné od 1. 6. 2025</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Kdo zpracovává vaše údaje</h2>
          <p className="mb-3">
            Tyckety.cz poskytují technické řešení pro ticketing. Při objednávce vstupenky vstupují
            do role zpracovatele osobních údajů dvě strany:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>
              <strong className="text-gray-300">Pořadatel akce</strong> — správce osobních údajů
              spojených s konkrétní akcí (viz stránka akce).
            </li>
            <li>
              <strong className="text-gray-300">Tyckety.cz</strong> — technický zpracovatel, který
              provozuje platformu a ukládá údaje pro pořadatele.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. Jaké údaje zpracováváme</h2>
          <p className="mb-3">Při vytvoření objednávky zpracováváme:</p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>jméno a příjmení kupujícího,</li>
            <li>e-mailová adresa,</li>
            <li>údaje o objednávce (počet vstupenek, kategorie, celková cena),</li>
            <li>variabilní symbol platby a stav platby,</li>
            <li>identifikátor objednávky a vstupenky (včetně QR kódu),</li>
            <li>čas vytvoření objednávky a čas použití vstupenky u vstupu.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Účel zpracování</h2>
          <p className="mb-3">Vaše údaje zpracováváme za těmito účely:</p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>vytvoření objednávky a vystavení vstupenek,</li>
            <li>doručení vstupenek e-mailem,</li>
            <li>ověření platnosti vstupenky u vstupu na akci,</li>
            <li>řešení problémů s objednávkou nebo platbou,</li>
            <li>bezpečnost a ochrana před zneužitím platformy.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Právní základ zpracování</h2>
          <p>
            Zpracování osobních údajů je nezbytné pro splnění smlouvy (vyřízení vaší objednávky
            a poskytnutí vstupenek). Nejde o zpracování na základě marketingového souhlasu —
            souhlas s těmito podmínkami je součástí objednávkového procesu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Marketing</h2>
          <p>
            Vaše kontaktní údaje nepoužíváme k marketingovým účelům bez vašeho výslovného
            a odděleného souhlasu. Pokud taková možnost v budoucnu vznikne, bude vždy dobrovolná.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Příjemci údajů</h2>
          <p>
            Vaše osobní údaje jsou přístupné pořadateli akce, na kterou jste zakoupili vstupenku.
            Pořadatel je oprávněn zpracovávat vaše údaje pro účely organizace akce a kontroly
            vstupu. Tyckety.cz neprodávají ani nepřenášejí vaše údaje třetím stranám mimo
            nezbytný technický provoz platformy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. Vaše práva</h2>
          <p className="mb-3">Máte právo na přístup ke svým osobním údajům, jejich opravu nebo výmaz, pokud to dovoluje zákon a účel zpracování. Pro uplatnění práv kontaktujte:</p>
          <ul className="list-disc list-inside space-y-1.5 text-gray-400">
            <li>
              <strong className="text-gray-300">Pořadatele akce</strong> — pro údaje spojené s konkrétní akcí.
            </li>
            <li>
              <strong className="text-gray-300">Tyckety.cz</strong> na{" "}
              <a href="mailto:info@tyckety.cz" className="text-amber-400 hover:underline">
                info@tyckety.cz
              </a>{" "}
              — pro dotazy k technické platformě.
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </>
  );
}
