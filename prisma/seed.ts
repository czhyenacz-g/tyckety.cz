import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const organizer = await db.organizer.upsert({
    where: { slug: "demo-podnik" },
    update: { bankAccount: "8216903002/5500", notificationEmail: "czhyenacz@gmail.com" },
    create: {
      name: "Demo Podnik s.r.o.",
      slug: "demo-podnik",
      email: "info@demo-podnik.cz",
      bankAccount: "8216903002/5500",
      notificationEmail: "czhyenacz@gmail.com",
    },
  });

  // 2026-10-24 19:00 Europe/Prague = 17:00 UTC (CEST, UTC+2)
  const event = await db.event.upsert({
    where: { slug: "test-heavy-metal-koncert" },
    update: {},
    create: {
      organizerId: organizer.id,
      title: "TEST — Heavy metal koncert",
      slug: "test-heavy-metal-koncert",
      description:
        "Nezaměnitelná atmosféra, basy co otřásají zdmi a pět kapel nabitých riffama. Tohle není koncert pro slabé povahy — přijďte si vyčistit hlavu a nechat se rozdrtit hudbou.",
      startsAt: new Date("2026-10-24T17:00:00.000Z"),
      venueName: "Klub Inferno",
      venueAddress: "Praha",
      posterUrl: "/images/test_koncert_web.webp",
      status: "published",
    },
  });

  await db.ticketCategory.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: { priceCzk: 299 },
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      eventId: event.id,
      name: "Základní vstupenka",
      priceCzk: 299,
      capacity: 120,
    },
  });

  // Scan token — vytvoř jen pokud žádný aktivní neexistuje
  const existingToken = await db.scanAccessToken.findFirst({
    where: { eventId: event.id, active: true },
  });
  if (!existingToken) {
    await db.scanAccessToken.create({ data: { eventId: event.id } });
  }

  console.log(`Seed OK — organizer: ${organizer.slug}, event: ${event.slug}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
