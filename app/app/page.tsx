import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/app/components/AppHeader";
import {
  FREE_TICKET_LIMIT,
  getOrganizerIssuedTicketCount,
  getUsageThresholdState,
  type UsageThresholdState,
} from "@/lib/usage";

export default async function AppDashboard() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni?next=/app");

  const { organizer } = session;

  const [eventCount, categories, issuedCount] = await Promise.all([
    db.event.count({ where: { organizerId: organizer.id } }),
    db.ticketCategory.findMany({
      where: { event: { organizerId: organizer.id } },
      select: { soldCount: true, priceCzk: true },
    }),
    getOrganizerIssuedTicketCount(organizer.id),
  ]);

  const totalSold = categories.reduce((s, c) => s + c.soldCount, 0);
  const totalRevenue = categories.reduce((s, c) => s + c.soldCount * c.priceCzk, 0);
  const thresholdState = getUsageThresholdState(issuedCount);

  const stats = [
    { label: "Akce celkem", value: eventCount },
    { label: "Prodané lístky", value: totalSold },
    { label: "Příjmy (Kč)", value: totalRevenue.toLocaleString("cs-CZ") },
  ];

  return (
    <>
      <AppHeader name={organizer.name} email={organizer.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold mb-6">Dashboard</h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <UsageBox count={issuedCount} state={thresholdState} />

        <div className="mt-6">
        <Link
          href="/app/akce/nova"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          + Vytvořit novou akci
        </Link>

        <div className="mt-4">
          <Link href="/app/akce" className="text-sm text-gray-500 hover:text-white transition-colors">
            Zobrazit všechny akce →
          </Link>
        </div>
        </div>
      </main>
    </>
  );
}

function UsageBox({ count, state }: { count: number; state: UsageThresholdState }) {
  const bar = Math.min(100, Math.round((count / FREE_TICKET_LIMIT) * 100));

  if (state === "exceeded") {
    return (
      <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl px-5 py-4 text-sm space-y-2">
        <UsageHeader count={count} labelClass="text-amber-400 font-semibold" countClass="text-amber-400" bar={bar} barClass="bg-amber-500" />
        <p className="text-gray-200 text-xs">
          Vydali jste už <strong>{count}</strong> vstupenek. To je skvělé — Tyckety vám očividně slouží.
        </p>
        <p className="text-gray-300 text-xs">
          Do 666 vydaných vstupenek to neřešíme. Jakmile přes Tyckety začnete prodávat jako peklo, ozveme se a domluvíme se férově dál.
        </p>
        <p className="text-gray-500 text-xs">
          Žádný automatický paywall. Další provoz chceme řešit normálně domluvou — orientačně třeba 2–5 Kč z vydané vstupenky podle trafficu.
        </p>
      </div>
    );
  }

  if (state === "nearing") {
    return (
      <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl px-5 py-4 text-sm space-y-2">
        <UsageHeader count={count} labelClass="text-amber-400 font-medium" countClass="text-amber-400" bar={bar} barClass="bg-amber-500" />
        <p className="text-gray-300 text-xs">
          Blížíte se k hranici 666 vydaných vstupenek. Do té doby to neřešíme. Jakmile přes Tyckety začnete prodávat jako peklo, ozveme se a domluvíme se férově dál.
        </p>
        <p className="text-gray-500 text-xs">
          Do budoucna může dávat smysl příspěvek např. 2–5 Kč z vydané vstupenky podle trafficu a domluvy.
        </p>
      </div>
    );
  }

  if (state === "support_hint") {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-5 py-4 text-sm space-y-2">
        <UsageHeader count={count} labelClass="text-gray-300 font-medium" countClass="text-gray-400" bar={bar} barClass="bg-gray-600" />
        <p className="text-gray-400 text-xs">
          Tyckety je pořád zdarma, ale pokud vám pomáhá, můžete podpořit vývoj koupí testovacího lístku na demo koncert kapely TEST.
        </p>
        <a
          href="/demo-podnik/test-heavy-metal-koncert"
          className="inline-block text-amber-400 hover:text-amber-300 text-xs transition-colors"
        >
          Podpořit vývoj přes TEST koncert →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 border border-gray-800 rounded-xl px-5 py-4 text-sm space-y-2">
      <UsageHeader count={count} labelClass="text-gray-400 font-medium" countClass="text-gray-500" bar={bar} barClass="bg-gray-700" />
      <p className="text-gray-600 text-xs">
        Tyckety je zatím v testovacím provozu zdarma. Náklady zatím bereme na sebe.
      </p>
    </div>
  );
}

function UsageHeader({
  count,
  labelClass,
  countClass,
  bar,
  barClass,
}: {
  count: number;
  labelClass: string;
  countClass: string;
  bar: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={labelClass}>Testovací provoz zdarma</span>
        <span className={`${countClass} text-xs`}>{count} / {FREE_TICKET_LIMIT} vstupenek</span>
      </div>
      <div className="w-full bg-gray-700/60 rounded-full h-1">
        <div className={`${barClass} h-1 rounded-full transition-all`} style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}
