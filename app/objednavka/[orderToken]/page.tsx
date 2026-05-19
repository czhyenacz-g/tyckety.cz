import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import Nav from "@/app/components/Nav";
import { czechAccountToIBAN, buildSpdString } from "@/lib/spd";
import Countdown from "./Countdown";

// ─── Typy stavů ───────────────────────────────────────────────────────────────

type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "tickets_issued"
  | "payment_window_expired"
  | "expired"
  | "payment_received_late"
  | "manual_review";

const STATUS: Record<OrderStatus, { label: string; color: string }> = {
  awaiting_payment: {
    label: "Čeká na platbu",
    color: "text-amber-400 bg-amber-900/30 border-amber-800",
  },
  paid: {
    label: "Zaplaceno",
    color: "text-green-400 bg-green-900/30 border-green-800",
  },
  tickets_issued: {
    label: "Vstupenky vydány",
    color: "text-green-400 bg-green-900/30 border-green-800",
  },
  payment_window_expired: {
    label: "Platební lhůta vypršela",
    color: "text-red-400 bg-red-900/30 border-red-800",
  },
  expired: {
    label: "Objednávka expirovala",
    color: "text-gray-400 bg-gray-800 border-gray-700",
  },
  payment_received_late: {
    label: "Platba přijata po lhůtě",
    color: "text-blue-400 bg-blue-900/30 border-blue-800",
  },
  manual_review: {
    label: "Řeší se ručně",
    color: "text-blue-400 bg-blue-900/30 border-blue-800",
  },
};

// ─── QR generátor (SVG → data URL, bez canvas) ────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
        include: {
          organizer: { select: { name: true, bankAccount: true } },
        },
      },
      tickets: {
        include: { category: { select: { name: true, priceCzk: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  const status = (order.status as OrderStatus) ?? "expired";
  const statusInfo = STATUS[status] ?? STATUS.expired;
  const isPending = status === "awaiting_payment";
  const isPaid = status === "paid" || status === "tickets_issued";
  const isLate = status === "payment_received_late" || status === "manual_review";
  const isExpired = status === "payment_window_expired" || status === "expired";

  // QR platba: generuj pouze pro awaiting_payment
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
      <Nav />
      <main className="min-h-screen max-w-lg mx-auto px-4 py-12">
        {/* Hlavička */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-1">Objednávka</h1>
          <p className="text-gray-500 text-sm font-mono">VS: {order.variableSymbol}</p>
        </div>

        {/* Status banner */}
        <div className={`border rounded-xl px-5 py-4 mb-5 text-sm ${statusInfo.color}`}>
          <p className="font-semibold">{statusInfo.label}</p>
        </div>

        {/* Info o akci */}
        <Card title="Akce">
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

        {/* Souhrn vstupenek */}
        <Card title="Vstupenky">
          <p className="text-sm text-gray-400 mb-3">
            {order.buyerName} · {order.buyerEmail}
          </p>
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
          <div className="flex items-center justify-between border-t border-gray-700 mt-3 pt-3">
            <span className="text-sm text-gray-400">
              Celkem ({order.tickets.length} ks)
            </span>
            <span className="font-bold text-amber-400 text-lg">
              {order.totalAmountCzk.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        </Card>

        {/* ── Stavy ── */}

        {isPending && (
          <div className="bg-gray-800 border border-amber-800/60 rounded-xl p-5 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">
              Platební instrukce
            </h2>

            {/* QR kód */}
            {qrDataUrl ? (
              <div className="flex flex-col items-center mb-6">
                <div className="bg-white rounded-xl p-3 inline-block">
                  <Image
                    src={qrDataUrl}
                    alt="QR kód pro bankovní platbu"
                    width={200}
                    height={200}
                    unoptimized
                  />
                </div>
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Naskenujte v mobilním bankovnictví
                </p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl p-4 mb-4 text-center text-gray-500 text-sm">
                QR kód není dostupný — zadejte platbu ručně níže.
                {/* TODO: Generovat QR i když bankAccount není ve formátu "číslo/kód" — vyžádat IBAN přímo od pořadatele */}
              </div>
            )}

            {/* Platební detaily */}
            <div className="space-y-3">
              <Row label="Číslo účtu" value={order.event.organizer.bankAccount || "—"} />
              <Row
                label="Částka"
                value={`${order.totalAmountCzk.toLocaleString("cs-CZ")} Kč`}
              />
              <Row
                label="Variabilní symbol"
                value={order.variableSymbol}
                highlight
                copyable
              />
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

            {/* Note o pozdní platbě */}
            <p className="text-gray-500 text-xs mt-5 leading-relaxed border-t border-gray-700 pt-4">
              Platba musí být odeslána do konce odpočtu. Pozdější platby se systém
              pokusí automaticky spárovat, ale vydání vstupenek{" "}
              <strong className="text-gray-400">není garantováno</strong>. Pro jistotu
              kontaktujte pořadatele.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl p-5 mb-4">
            <p className="font-semibold text-green-400 mb-1">Platba potvrzena</p>
            <p className="text-gray-400 text-sm">
              Vstupenky vám byly zaslány na e-mail{" "}
              <strong className="text-gray-300">{order.buyerEmail}</strong>.
              Předložte je u vstupu na akci.
            </p>
          </div>
        )}

        {isExpired && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
            <p className="font-semibold text-gray-300 mb-1">Objednávka expirovala</p>
            <p className="text-gray-500 text-sm mb-4">
              Platba nebyla přijata v platební lhůtě a objednávka byla zrušena.
              Kapacita vstupenek byla uvolněna.
            </p>
            <Link
              href={`/`}
              className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
            >
              Koupit nové vstupenky →
            </Link>
          </div>
        )}

        {isLate && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-5 mb-4">
            <p className="font-semibold text-blue-400 mb-1">Platba přijata — zpracovává se</p>
            <p className="text-gray-400 text-sm">
              Platba dorazila po veřejné lhůtě. Pořadatel ji ručně ověřuje. Pokud
              bude potvrzena, obdržíte vstupenky e-mailem.
            </p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Zpět na Tyckety.cz
          </Link>
        </div>
      </main>
    </>
  );
}

// ─── Pomocné komponenty ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  copyable,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-sm">{label}</span>
      <span
        className={`font-mono text-right ${
          highlight ? "text-white font-bold text-base" : "text-gray-300 text-sm"
        }`}
        title={copyable ? "Zkopírujte do platby" : undefined}
      >
        {value}
      </span>
    </div>
  );
}
