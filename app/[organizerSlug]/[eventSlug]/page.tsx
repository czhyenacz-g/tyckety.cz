import { notFound } from "next/navigation";
import Nav from "@/app/components/Nav";
import { db } from "@/lib/db";
import PurchaseForm from "./PurchaseForm";

export default async function EventPage({
  params,
}: {
  params: Promise<{ organizerSlug: string; eventSlug: string }>;
}) {
  const { organizerSlug, eventSlug } = await params;

  const event = await db.event.findFirst({
    where: {
      slug: eventSlug,
      status: "published",
      organizer: { slug: organizerSlug },
    },
    include: {
      organizer: { select: { name: true, slug: true } },
      ticketCategories: true,
    },
  });

  if (!event) notFound();

  // Pro MVP: první aktivní kategorie. Model podporuje více kategorií.
  const category = event.ticketCategories[0];
  const available = category ? category.capacity - category.soldCount : 0;

  return (
    <>
      <Nav />
      <main className="min-h-screen max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8">
          <a href={`/${organizerSlug}`} className="hover:text-white transition-colors">
            {event.organizer.name}
          </a>
          <span className="mx-2">›</span>
          <span className="text-gray-300">{event.title}</span>
        </nav>

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left: event info */}
          <div className="md:col-span-3 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
              <div className="space-y-1.5 text-sm text-gray-400">
                <p>
                  🗓{" "}
                  {new Date(event.startsAt).toLocaleDateString("cs-CZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {event.venueName && (
                  <p>
                    📍 {event.venueName}
                    {event.venueAddress ? `, ${event.venueAddress}` : ""}
                  </p>
                )}
                {category && (
                  <p>🎟 {category.name} — {category.priceCzk} Kč</p>
                )}
              </div>
            </div>

            {event.description && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  O akci
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Right: purchase form */}
          <div className="md:col-span-2">
            {category ? (
              <PurchaseForm
                eventId={event.id}
                category={{
                  id: category.id,
                  name: category.name,
                  priceCzk: category.priceCzk,
                  available,
                }}
              />
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                Vstupenky nejsou k dispozici.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
