import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";

export const metadata: Metadata = { robots: { index: false } };
import { db } from "@/lib/db";
import Nav from "@/app/components/Nav";

async function generateQrDataUrl(data: string): Promise<string> {
  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#111827", light: "#ffffff" },
  });
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const TICKET_STATUS = {
  issued: { label: "Platná vstupenka", color: "text-green-400 bg-green-900/30 border-green-800" },
  used: { label: "Vstupenka byla použita", color: "text-gray-400 bg-gray-800 border-gray-700" },
  cancelled: { label: "Vstupenka zrušena", color: "text-red-400 bg-red-900/30 border-red-800" },
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ticketToken: string }>;
}) {
  const { ticketToken } = await params;

  const ticket = await db.ticket.findUnique({
    where: { token: ticketToken },
    include: {
      event: {
        select: {
          title: true,
          startsAt: true,
          venueName: true,
          venueAddress: true,
          posterUrl: true,
          organizer: { select: { name: true } },
        },
      },
      category: { select: { name: true, priceCzk: true } },
      order: { select: { buyerName: true, buyerEmail: true } },
    },
  });

  if (!ticket) notFound();

  const statusInfo = TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS] ?? TICKET_STATUS.cancelled;
  const qrUrl = `${process.env.APP_URL ?? "https://tyckety.cz"}/vstupenka/${ticket.token}`;
  const qrDataUrl = await generateQrDataUrl(qrUrl);

  return (
    <>
      <Nav />
      <main className="min-h-screen max-w-sm mx-auto px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">Vstupenka</h1>
          <p className="text-gray-500 text-xs font-mono">{ticket.token.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Status */}
        <div className={`border rounded-xl px-5 py-4 mb-5 text-sm text-center ${statusInfo.color}`}>
          <p className="font-semibold text-base">{statusInfo.label}</p>
          {ticket.usedAt && (
            <p className="text-xs mt-1 opacity-75">
              Použita: {new Date(ticket.usedAt).toLocaleString("cs-CZ")}
            </p>
          )}
        </div>

        {/* Plakát akce */}
        {ticket.event.posterUrl && (
          <div className="rounded-xl overflow-hidden mb-4">
            <Image
              src={ticket.event.posterUrl}
              alt={`Plakát — ${ticket.event.title}`}
              width={400}
              height={565}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* QR kód */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-4 flex flex-col items-center">
          <div className="bg-white rounded-xl p-3 inline-block mb-3">
            <Image
              src={qrDataUrl}
              alt="QR kód vstupenky"
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <p className="text-gray-500 text-xs text-center">
            Předložte tento QR kód u vstupu
          </p>
        </div>

        {/* Detaily */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Akce</p>
            <p className="font-semibold">{ticket.event.title}</p>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(ticket.event.startsAt).toLocaleDateString("cs-CZ", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {ticket.event.venueName && (
              <p className="text-sm text-gray-500 mt-0.5">
                {ticket.event.venueName}
                {ticket.event.venueAddress ? `, ${ticket.event.venueAddress}` : ""}
              </p>
            )}
          </div>

          <div className="border-t border-gray-700 pt-3 space-y-2">
            <Row label="Pořadatel" value={ticket.event.organizer.name} />
            <Row label="Držitel" value={ticket.order.buyerName} />
            <Row label="Kategorie" value={ticket.category.name} />
            <Row label="Cena" value={`${ticket.category.priceCzk.toLocaleString("cs-CZ")} Kč`} />
          </div>

          <div className="border-t border-gray-700/50 pt-3 text-center">
            <a href="/" className="text-xs text-gray-600 hover:text-gray-500 transition-colors">
              Vstupenka z Tyckety.cz
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}
