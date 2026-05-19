import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import Nav from "@/app/components/Nav";

type Props = { params: Promise<{ organizerSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizerSlug } = await params;
  const organizer = await db.organizer.findUnique({
    where: { slug: organizerSlug },
    select: { name: true },
  });
  if (!organizer) return {};
  return {
    title: `${organizer.name} — vstupenky | Tyckety.cz`,
    description: `Kupte vstupenky na akce pořadatele ${organizer.name} přímo online na Tyckety.cz.`,
    openGraph: {
      title: `${organizer.name} | Tyckety.cz`,
      description: `Vstupenky na akce — ${organizer.name}`,
      locale: "cs_CZ",
      siteName: "Tyckety.cz",
    },
  };
}

export default async function OrganizerPage({ params }: Props) {
  const { organizerSlug } = await params;

  const organizer = await db.organizer.findUnique({
    where: { slug: organizerSlug },
    include: {
      events: {
        where: { status: "published" },
        include: {
          ticketCategories: { select: { priceCzk: true, soldCount: true, capacity: true } },
        },
        orderBy: { startsAt: "asc" },
      },
    },
  });

  if (!organizer) notFound();

  return (
    <>
      <Nav />
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold">{organizer.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Pořadatel akcí</p>
        </header>

        {organizer.events.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Žádné akce momentálně v prodeji.
          </div>
        ) : (
          <div className="space-y-4">
            {organizer.events.map((event) => {
              const minPrice = Math.min(...event.ticketCategories.map((c) => c.priceCzk));
              const totalCapacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
              const totalSold = event.ticketCategories.reduce((s, c) => s + c.soldCount, 0);
              const available = totalCapacity - totalSold;

              return (
                <div
                  key={event.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-0"
                >
                  {event.posterUrl && (
                    <div className="shrink-0 sm:w-24 sm:h-24 w-full h-32 relative">
                      <Image
                        src={event.posterUrl}
                        alt={`Plakát — ${event.title}`}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <h2 className="font-semibold text-lg">{event.title}</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {new Date(event.startsAt).toLocaleDateString("cs-CZ", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {event.venueName && (
                      <p className="text-gray-500 text-sm mt-0.5">
                        {event.venueName}
                        {event.venueAddress ? `, ${event.venueAddress}` : ""}
                      </p>
                    )}
                    <p className="text-amber-400 text-sm font-medium mt-2">
                      od {minPrice} Kč
                    </p>
                  </div>
                  <div className="shrink-0 text-right p-5 pl-0">
                    {available <= 0 ? (
                      <span className="block text-gray-500 text-sm mb-2">Vyprodáno</span>
                    ) : (
                      <span className="block text-gray-500 text-xs mb-2">
                        Zbývá {available} míst
                      </span>
                    )}
                    <Link
                      href={`/${organizerSlug}/${event.slug}`}
                      className={`inline-block font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm ${
                        available <= 0
                          ? "bg-gray-700 text-gray-500 cursor-not-allowed pointer-events-none"
                          : "bg-amber-500 hover:bg-amber-400 text-gray-900"
                      }`}
                    >
                      Koupit vstupenku
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
