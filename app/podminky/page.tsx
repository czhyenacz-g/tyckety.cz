import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/app/components/Nav";

export const metadata: Metadata = {
  title: "Podmínky použití | Tyckety.cz",
  description: "Tyckety je nástroj pro správu vstupenek. Pořadatel odpovídá za akci a komunikaci se zákazníky.",
  robots: { index: false },
};

export default function PodminkyPage() {
  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Podmínky použití</h1>
        <p className="text-gray-500 text-sm mb-10">Tyckety.cz · MVP testovací provoz</p>

        <div className="space-y-8 text-gray-300 text-sm leading-relaxed">
          <Section title="Co Tyckety je">
            <p>
              Tyckety.cz je nástroj, který pořadatelům umožní vytvořit akci, přijímat
              objednávky vstupenek a ověřovat vstupenky u vstupu. Tyckety není pořadatel
              akce ani platební brána.
            </p>
          </Section>

          <Section title="Platby">
            <p>
              Tyckety nezpracovává platby. Peníze jdou přímo z účtu zákazníka na bankovní
              účet pořadatele prostřednictvím standardního bankovního převodu (QR platba).
              Tyckety nemá přístup k penězům zákazníků ani pořadatelů.
            </p>
          </Section>

          <Section title="Odpovědnost pořadatele">
            <p>Pořadatel akce odpovídá za:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>správnost údajů o akci (termín, místo, cena, kapacita),</li>
              <li>přijetí a evidenci plateb,</li>
              <li>vrácení peněz zákazníkům v případě zrušení nebo změny akce,</li>
              <li>komunikaci se zákazníky před a po akci,</li>
              <li>dodržení platných právních předpisů (spotřebitelské právo, GDPR).</li>
            </ul>
          </Section>

          <Section title="Testovací provoz">
            <p>
              Tyckety je v testovacím provozu (MVP). Služba je poskytována bez garance
              dostupnosti, bez SLA a může být kdykoli změněna nebo přerušena. Nedoporučujeme
              ji pro komerční akce s vysokým objemem vstupenek nebo s požadavky na vysokou
              dostupnost.
            </p>
          </Section>

          <Section title="Ochrana dat">
            <p>
              Tyckety ukládá pouze údaje nezbytné pro provoz služby: jméno a e-mail kupujícího,
              stav objednávky a token vstupenky. Pořadatel má přístup k datům svých zákazníků
              a odpovídá za jejich zpracování v souladu s GDPR.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
            ← Zpět na úvod
          </Link>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-white font-semibold text-base mb-2">{title}</h2>
      {children}
    </div>
  );
}
