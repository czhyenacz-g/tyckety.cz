import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/app/components/AppHeader";
import OrdersTable from "./OrdersTable";

const STATUS_LABEL: Record<string, string> = {
  draft: "Koncept",
  published: "Zveřejněno",
  cancelled: "Zrušeno",
  ended: "Proběhlo",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-gray-400 bg-gray-700",
  published: "text-green-400 bg-green-900/40",
  cancelled: "text-red-400 bg-red-900/40",
  ended: "text-gray-500 bg-gray-800",
};

export default async function EventDetail({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  const { eventId } = await params;
  const { organizer } = session;

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    include: {
      ticketCategories: true,
      scanTokens: { where: { active: true }, take: 1 },
      orders: {
        include: { _count: { select: { tickets: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) notFound();

  const category = event.ticketCategories[0];
  const scanToken = event.scanTokens[0];
  const sold = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);
  const capacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
  const revenue = event.ticketCategories.reduce((s, c) => s + c.soldCount * c.priceCzk, 0);

  const orders = event.orders.map((o) => ({
    id: o.id,
    buyerName: o.buyerName,
    buyerEmail: o.buyerEmail,
    status: o.status,
    totalAmountCzk: o.totalAmountCzk,
    variableSymbol: o.variableSymbol,
    publicToken: o.publicToken,
    createdAt: o.createdAt,
    ticketCount: o._count.tickets,
  }));

  const publicUrl = `/objednavka/${event.slug}`;
  const scanUrl = scanToken ? `/scan/${scanToken.token}` : null;
  const embedCode = `<script src="https://tyckety.cz/widget.js" data-event="${event.slug}"></script>`;

  const statusColor = STATUS_COLOR[event.status] ?? STATUS_COLOR.draft;
  const orderCount = event.orders.length;

  return (
    <>
      <AppHeader name={organizer.name} email={organizer.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb + title */}
        <div className="mb-6">
          <Link href="/app/akce" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Moje akce
          </Link>
          <div className="flex items-start justify-between mt-3">
            <div>
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {new Date(event.startsAt).toLocaleDateString("cs-CZ", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {event.venueName ? ` · ${event.venueName}` : ""}
                {event.venueAddress ? `, ${event.venueAddress}` : ""}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ml-4 mt-1 ${statusColor}`}>
              {STATUS_LABEL[event.status] ?? event.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Stats */}
          {[
            { label: "Prodáno", value: `${sold}/${capacity}` },
            { label: "Objednávky", value: orderCount },
            { label: "Příjmy (Kč)", value: revenue.toLocaleString("cs-CZ") },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Veřejný odkaz */}
          <InfoCard title="Odkaz pro zákazníky">
            <p className="text-xs text-gray-500 mb-2">Sdílejte tento odkaz pro prodej vstupenek.</p>
            <a
              href={publicUrl}
              className="block text-amber-400 hover:text-amber-300 text-sm break-all transition-colors"
            >
              tyckety.cz{publicUrl}
            </a>
          </InfoCard>

          {/* Scan odkaz */}
          <InfoCard title="Vstupní kontrola (QR skener)">
            <p className="text-xs text-gray-500 mb-2">Otevřete na telefonu pro skenování lístků.</p>
            {scanUrl ? (
              <a
                href={scanUrl}
                className="block text-amber-400 hover:text-amber-300 text-sm break-all transition-colors"
              >
                tyckety.cz{scanUrl}
              </a>
            ) : (
              <p className="text-gray-500 text-sm">Scan token nebyl vygenerován.</p>
            )}
          </InfoCard>

          {/* Embed kód */}
          <InfoCard title="Widget na váš web">
            <p className="text-xs text-gray-500 mb-2">Vložte kód na svůj web pro prodej přímo ze stránek.</p>
            <code className="block text-xs text-green-400 bg-gray-900 rounded px-3 py-2 break-all">
              {embedCode}
            </code>
          </InfoCard>

          {/* Kategorie vstupenek */}
          <InfoCard title="Kategorie vstupenek">
            {category ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{category.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {category.priceCzk} Kč · kapacita {category.capacity}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{category.soldCount} prodáno</span>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Žádná kategorie.</p>
            )}
          </InfoCard>
        </div>

        {/* Objednávky */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Objednávky</h2>
          <OrdersTable orders={orders} />
        </div>
      </main>
    </>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}
