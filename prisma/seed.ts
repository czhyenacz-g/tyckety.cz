import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const organizer = await db.organizer.upsert({
    where: { slug: "demo-podnik" },
    update: {},
    create: {
      name: "Demo Podnik s.r.o.",
      slug: "demo-podnik",
      email: "info@demo-podnik.cz",
      bankAccount: "1234567890/0800",
      notificationEmail: "notifikace@demo-podnik.cz",
    },
  });

  const event = await db.event.upsert({
    where: { slug: "demo-akce-2025" },
    update: {},
    create: {
      organizerId: organizer.id,
      title: "Demo Akce 2025",
      slug: "demo-akce-2025",
      description: "Ukázková akce pro testování Tyckety.cz.",
      startsAt: new Date("2025-09-01T18:00:00Z"),
      venueName: "Divadlo Na Příkopě",
      venueAddress: "Na Příkopě 1, 110 00 Praha 1",
      status: "published",
    },
  });

  await db.ticketCategory.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      eventId: event.id,
      name: "Standardní vstupné",
      priceCzk: 350,
      capacity: 200,
    },
  });

  console.log(`Seed OK — organizer: ${organizer.slug}, event: ${event.slug}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
