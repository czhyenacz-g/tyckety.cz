import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Nav from "@/app/components/Nav";
import LocationNavigationPopup from "@/app/components/LocationNavigationPopup";
import { db } from "@/lib/db";
import { getReservedCount } from "@/lib/orders";
import { siteUrl } from "@/lib/config";
import PurchaseForm from "./PurchaseForm";

type Props = { params: Promise<{ organizerSlug: string; eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizerSlug, eventSlug } = await params;
  const event = await db.event.findFirst({
    where: { slug: eventSlug, status: "published", organizer: { slug: organizerSlug } },
    select: { title: true, description: true, startsAt: true, venueName: true, posterUrl: true },
  });
  if (!event) return {};

  const dateStr = new Date(event.startsAt).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const desc = event.description
    ? event.description.slice(0, 155)
    : `${dateStr}${event.venueName ? ` · ${event.venueName}` : ""} — kupte vstupenky online.`;

  const ogImages = event.posterUrl
    ? [{ url: `${siteUrl}${event.posterUrl}` }]
    : undefined;

  return {
    title: `${event.title} | Tyckety.cz`,
    description: desc,
    openGraph: {
      title: event.title,
      description: desc,
      type: "website",
      locale: "cs_CZ",
      siteName: "Tyckety.cz",
      images: ogImages,
    },
    twitter: {
      card: event.posterUrl ? "summary_large_image" : "summary",
      title: event.title,
      description: desc,
      images: ogImages ? ogImages.map((i) => i.url) : undefined,
    },
  };
}

export default async function EventPage({
  params,
}: Props) {
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
  const reserved = category ? await getReservedCount(event.id) : 0;
  const available = category ? Math.max(0, category.capacity - category.soldCount - reserved) : 0;

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
            {event.posterUrl && (
              <div className="rounded-xl overflow-hidden">
                <Image
                  src={event.posterUrl}
                  alt={`Plakát — ${event.title}`}
                  width={600}
                  height={850}
                  className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                  priority
                />
              </div>
            )}
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
                    📍{" "}
                    <LocationNavigationPopup
                      label={event.venueAddress ? `${event.venueName}, ${event.venueAddress}` : event.venueName}
                      venueName={event.venueName}
                      venueAddress={event.venueAddress ?? undefined}
                    />
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
            {organizerSlug === "demo-podnik" && (
              <div className="bg-amber-900/20 border border-amber-800/60 rounded-xl px-4 py-3 mb-4 text-xs text-amber-300 leading-relaxed">
                TEST je demo akce. Nevzniká nárok na vstup na skutečný koncert. Platba slouží jako dobrovolná podpora vývoje Tyckety.
              </div>
            )}
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
