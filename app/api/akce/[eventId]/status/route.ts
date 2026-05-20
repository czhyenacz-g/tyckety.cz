import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/provider";
import { pendingReviewAdminTemplate } from "@/lib/email/templates";

// Pořadatel může jen odeslat ke schválení nebo stáhnout zpět. Publikovat/blokovat smí jen internal admin.
const VALID = ["draft", "pending_review", "cancelled", "ended"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { eventId } = await params;
  const { status } = await req.json().catch(() => ({}));

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Neplatný stav." }, { status: 400 });
  }

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: session.organizer.id },
    select: {
      id: true,
      status: true,
      title: true,
      slug: true,
      startsAt: true,
      venueName: true,
      venueAddress: true,
      organizer: { select: { name: true, email: true, ico: true, bankAccount: true } },
      ticketCategories: { select: { capacity: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Akce nenalezena." }, { status: 404 });

  const previousStatus = event.status;

  await db.event.update({ where: { id: eventId }, data: { status } });

  // Notify admin when transitioning TO pending_review (deduplicated)
  if (status === "pending_review" && previousStatus !== "pending_review") {
    const adminEmail = process.env.ADMIN_REVIEW_EMAIL;
    if (!adminEmail) {
      console.warn("[pending-review] ADMIN_REVIEW_EMAIL not set — skipping notification");
    } else {
      const appUrl = process.env.APP_URL ?? "https://tyckety.cz";
      const totalCapacity = event.ticketCategories.reduce((s, c) => s + c.capacity, 0);
      const { subject, html } = pendingReviewAdminTemplate({
        eventTitle: event.title,
        eventId: event.id,
        eventSlug: event.slug,
        startsAt: new Date(event.startsAt).toLocaleString("cs-CZ", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        organizerName: event.organizer.name,
        organizerEmail: event.organizer.email,
        organizerIco: event.organizer.ico,
        bankAccount: event.organizer.bankAccount,
        categoryCount: event.ticketCategories.length,
        totalCapacity,
        adminUrl: `${appUrl}/internal/events/${event.id}`,
        submittedAt: new Date().toLocaleString("cs-CZ", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      sendEmail({ to: adminEmail, subject, html }).then((result) => {
        if (!result.ok) {
          console.error("[pending-review] Failed to send admin notification:", result.error);
        }
      }).catch((err) => {
        console.error("[pending-review] Unexpected error sending notification:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
