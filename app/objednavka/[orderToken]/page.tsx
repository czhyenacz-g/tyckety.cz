import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";

export const metadata: Metadata = { robots: { index: false } };

import { db } from "@/lib/db";
import Nav from "@/app/components/Nav";
import { czechAccountToIBAN, buildSpdString } from "@/lib/spd";
import Countdown from "./Countdown";
import PrintButton from "./PrintButton";
import CopyVS from "./CopyVS";
import OrderLinkActions from "./OrderLinkActions";

type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "tickets_issued"
  | "payment_window_expired"
  | "expired"
  | "payment_received_late"
  | "manual_review";

const STATUS: Record<OrderStatus, { label: string; color: string }> = {
  awaiting_payment: { label: "Čeká na platbu", color: "text-amber-400 bg-amber-900/30 border-amber-800" },
  paid: { label: "Zaplaceno — čeká na vstupenky", color: "text-green-400 bg-green-900/30 border-green-800" },
  tickets_issued: { label: "Vstupenky vydány", color: "text-green-400 bg-green-900/30 border-green-800" },
  payment_window_expired: { label: "Platební lhůta vypršela", color: "text-red-400 bg-red-900/30 border-red-800" },
  expired: { label: "Objednávka expirovala", color: "text-gray-400 bg-gray-800 border-gray-700" },
  payment_received_late: { label: "Platba přijata po lhůtě", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
  manual_review: { label: "Řeší se ručně", color: "text-blue-400 bg-blue-900/30 border-blue-800" },
};

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

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderToken: string }>;
}) {
  const { orderToken } = await params;

  const order = await db.order.findUnique({
    where: { publicToken: orderToken },
    include: {
      event: {
        include: { organizer: { select: { name: true, slug: true, bankAccount: true } } },
      },
      tickets: {
        include: { category: { select: { name: true, priceCzk: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  // Lazy display expiry: pokud uplynul veřejný deadline, zobraz jako expired
  const dbStatus = order.status as OrderStatus;
  const now = new Date();
  const effectiveStatus: OrderStatus =
    dbStatus === "awaiting_payment" && now > order.paymentDisplayDeadlineAt
      ? "payment_window_expired"
      : dbStatus;

  const statusInfo = STATUS[effectiveStatus] ?? STATUS.expired;

  const isPending = effectiveStatus === "awaiting_payment";
  const isPaymentConfirmed = effectiveStatus === "paid";       // zaplaceno, vstupenky ještě nevystaveny
  const isIssued = effectiveStatus === "tickets_issued";       // vstupenky existují
  const isLate = effectiveStatus === "payment_received_late" || effectiveStatus === "manual_review";
  const isExpired = effectiveStatus === "payment_window_expired" || effectiveStatus === "expired";

  // QR vstupenky: pouze když jsou skutečně vystaveny
  const ticketQrUrls: Record<string, string> = {};
  if (isIssued) {
    for (const ticket of order.tickets) {
      const url = `https://tyckety.cz/vstupenka/${ticket.token}`;
      ticketQrUrls[ticket.id] = await generateQrDataUrl(url);
    }
  }

  // QR platba: pouze pro awaiting_payment
  let qrDataUrl: string | null = null;
  if (isPending && order.event.organizer.bankAccount) {
    const iban = czechAccountToIBAN(order.event.organizer.bankAccount);
    if (iban) {
      const spd = buildSpdString({
        iban,
        amountCzk: order.totalAmountCzk,
        variableSymbol: order.variableSymbol,
        message: `Tyckety ${order.event.title.slice(0, 40)}`,
      });
      qrDataUrl = await generateQrDataUrl(spd);
    }
  }

  const displayDeadline = new Date(order.paymentDisplayDeadlineAt);

  return (
    <>
      <Nav className="no-print" />
      <main className="min-h-screen max-w-lg mx-auto px-4 py-12">
        <div className="mb-8 text-center no-print">
          <h1 className="text-2xl font-bold mb-1">Objednávka</h1>
          <p className="text-gray-500 text-sm font-mono">VS: {order.variableSymbol}</p>
        </div>

        <div className={`border rounded-xl px-5 py-4 mb-5 text-sm no-print ${statusInfo.color}`}>
          <p className="font-semibold">{statusInfo.label}</p>
        </div>

        <Card title="Akce" className="no-print">
          <p className="font-semibold">{order.event.title}</p>
          <p className="text-gray-400 text-sm mt-1">
            {new Date(order.event.startsAt).toLocaleDateString("cs-CZ", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {order.event.venueName && (
            <p className="text-gray-500 text-sm mt-0.5">{order.event.venueName}</p>
          )}
        </Card>

        {/* Souhrn: tickety pokud existují, jinak počet a cena */}
        <Card title="Vstupenky" className="no-print">
          <p className="text-sm text-gray-400 mb-3">
            {order.buyerName} · {order.buyerEmail}
          </p>
          {order.tickets.length > 0 ? (
            <div className="space-y-2">
              {order.tickets.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-t border-gray-700 first:border-0"
                >
                  <span className="text-sm text-gray-300">
                    #{i + 1} {t.category.name}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {t.token.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{order.quantity} ks vstupenek</p>
          )}
          <div className="flex items-center justify-between border-t border-gray-700 mt-3 pt-3">
            <span className="text-sm text-gray-400">
              Celkem ({order.tickets.length > 0 ? order.tickets.length : order.quantity} ks)
            </span>
            <span className="font-bold text-amber-400 text-lg">
              {order.totalAmountCzk.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        </Card>

        {order.event.organizer.slug === "demo-podnik" && (
          <div className="bg-amber-900/20 border border-amber-800/60 rounded-xl px-4 py-3 mb-4 text-xs text-amber-300 leading-relaxed no-print">
            TEST je demo akce. Nevzniká nárok na vstup na skutečný koncert. Platba slouží jako dobrovolná podpora vývoje Tyckety.
          </div>
        )}

        {isPending && (
          <div className="bg-gray-800 border border-amber-800/60 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">
              Platební instrukce
            </h2>

            {qrDataUrl ? (
              <div className="flex flex-col items-center mb-6">
                <div className="bg-white rounded-xl p-3 inline-block">
                  <Image src={qrDataUrl} alt="QR kód pro bankovní platbu" width={200} height={200} unoptimized />
                </div>
                <p className="text-gray-500 text-xs mt-2 text-center">Naskenujte v mobilním bankovnictví</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl p-4 mb-4 text-center text-gray-500 text-sm">
                QR kód není dostupný — zadejte platbu ručně níže.
              </div>
            )}

            <div className="space-y-3">
              <Row label="Číslo účtu" value={order.event.organizer.bankAccount || "—"} />
              <Row label="Částka" value={`${order.totalAmountCzk.toLocaleString("cs-CZ")} Kč`} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-500 text-sm">Zbývá čas</span>
                <Countdown deadlineIso={displayDeadline.toISOString()} />
              </div>
              <Row
                label="Zaplaťte do"
                value={displayDeadline.toLocaleString("cs-CZ", {
                  day: "numeric",
                  month: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>

            <CopyVS value={order.variableSymbol} />

            <p className="text-gray-600 text-xs mt-3 leading-relaxed">
              Variabilní symbol si můžete uložit. Pokud by bylo potřeba platbu dohledat, pořadatel ji podle něj a podle e-mailu v objednávce najde v bankovním výpisu.
            </p>

            <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Co se stane po zaplacení</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                Po zaplacení vám vstupenky pošleme e-mailem. Zobrazí se také na této stránce, jakmile pořadatel platbu potvrdí. Odkaz na objednávku jsme vám poslali e-mailem — stránku si můžete pro jistotu uložit.
              </p>
              <p className="text-xs text-amber-400/80 mt-3 font-medium">Pokud jste už zaplatili, neplaťte znovu.</p>
            </div>

            <p className="text-gray-500 text-xs mt-5 leading-relaxed border-t border-gray-700 pt-4">
              Platba musí být odeslána do konce odpočtu. Pozdější platby se systém
              pokusí automaticky spárovat, ale vydání vstupenek{" "}
              <strong className="text-gray-400">není garantováno</strong>. Pro jistotu
              kontaktujte pořadatele.
            </p>
          </div>
        )}

        {isPaymentConfirmed && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-5 mb-4">
            <p className="font-semibold text-green-400 mb-2">Platba potvrzena</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              Pořadatel nyní vystaví vstupenky. Jakmile budou připravené, zobrazí se tady a dorazí vám e-mailem.
            </p>
          </div>
        )}

        {isIssued && (
          <>
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-5 mb-4 no-print">
              <p className="font-semibold text-green-400 mb-2">Vstupenky jsou připravené</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                Najdete je níže a také v e-mailu. U vstupu ukažte QR kód v telefonu nebo vytištěnou vstupenku.
              </p>
            </div>

            <PrintButton />

            {order.tickets.map((ticket, i) => (
              <div key={ticket.id} className="ticket-card bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs ticket-label text-gray-500 uppercase tracking-wide mb-1">Vstupenka #{i + 1}</p>
                    <p className="font-bold text-lg ticket-value">{order.event.title}</p>
                    <p className="text-sm ticket-label text-gray-400 mt-0.5">
                      {new Date(order.event.startsAt).toLocaleDateString("cs-CZ", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {order.event.venueName && (
                      <p className="text-sm ticket-label text-gray-500 mt-0.5">{order.event.venueName}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ml-3 mt-1 ${
                    ticket.status === "issued" ? "text-green-400 bg-green-900/40" :
                    ticket.status === "used" ? "text-gray-400 bg-gray-700" :
                    "text-red-400 bg-red-900/40"
                  }`}>
                    {ticket.status === "issued" ? "Platná" : ticket.status === "used" ? "Použitá" : "Zrušená"}
                  </span>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="bg-white rounded-xl p-3 inline-block">
                    <Image
                      src={ticketQrUrls[ticket.id]}
                      alt={`QR vstupenka ${i + 1}`}
                      width={180}
                      height={180}
                      unoptimized
                    />
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-gray-700 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="ticket-label text-gray-500">Jméno</span>
                    <span className="ticket-value font-medium">{order.buyerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="ticket-label text-gray-500">Kategorie</span>
                    <span className="ticket-value">{ticket.category.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="ticket-label text-gray-500">Cena</span>
                    <span className="ticket-value">{ticket.category.priceCzk.toLocaleString("cs-CZ")} Kč</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="ticket-label text-gray-500">Odkaz na vstupenku</span>
                    <Link
                      href={`/vstupenka/${ticket.token}`}
                      className="ticket-value font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      {ticket.token.slice(0, 8).toUpperCase()} ↗
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {isExpired && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
            <p className="font-semibold text-gray-300 mb-1">Objednávka expirovala</p>
            <p className="text-gray-500 text-sm mb-4">
              Platba nebyla přijata v platební lhůtě. Kapacita vstupenek byla uvolněna.
            </p>
            <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
              Koupit nové vstupenky →
            </Link>
          </div>
        )}

        {isLate && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-5 mb-4">
            <p className="font-semibold text-blue-400 mb-1">Platba přijata — zpracovává se</p>
            <p className="text-gray-400 text-sm">
              Platba dorazila po veřejné lhůtě. Pořadatel ji ručně ověřuje.
            </p>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4 no-print">
          <OrderLinkActions />
        </div>

        <div className="text-center mt-8 no-print">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Zpět na Tyckety.cz
          </Link>
        </div>
      </main>
    </>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4${className ? ` ${className}` : ""}`}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, highlight, copyable }: {
  label: string; value: string; highlight?: boolean; copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-sm">{label}</span>
      <span
        className={`font-mono text-right ${highlight ? "text-white font-bold text-base" : "text-gray-300 text-sm"}`}
        title={copyable ? "Zkopírujte do platby" : undefined}
      >
        {value}
      </span>
    </div>
  );
}
