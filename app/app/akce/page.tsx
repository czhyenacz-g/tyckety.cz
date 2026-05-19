import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AppHeader from "@/app/components/AppHeader";

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

export default async function AkceList() {
  const session = await getSession();
  if (!session) redirect("/prihlaseni");

  const { organizer } = session;

  const events = await db.event.findMany({
    where: { organizerId: organizer.id },
    include: {
      ticketCategories: { select: { soldCount: true, capacity: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AppHeader name={organizer.name} email={organizer.email} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Moje akce</h1>
          <Link
            href="/app/akce/nova"
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            + Nová akce
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">Zatím nemáte žádné akce.</p>
            <Link
              href="/app/akce/nova"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              Vytvořit první akci
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const sold = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);
              const capacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
              const color = STATUS_COLOR[event.status] ?? STATUS_COLOR.draft;
              return (
                <Link
                  key={event.id}
                  href={`/app/akce/${event.id}`}
                  className="flex items-center justify-between bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl px-5 py-4 transition-colors group"
                >
                  <div>
                    <p className="font-semibold group-hover:text-amber-400 transition-colors">
                      {event.title}
                    </p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {new Date(event.startsAt).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {event.venueName ? ` · ${event.venueName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm text-gray-400">
                      <span className="text-white font-medium">{sold}</span>
                      {capacity > 0 ? `/${capacity}` : ""} lístků
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${color}`}>
                      {STATUS_LABEL[event.status] ?? event.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
