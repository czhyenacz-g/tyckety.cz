import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await db.event.findMany({
    where: { status: "published" },
    include: { organizer: { select: { slug: true } } },
    orderBy: { startsAt: "desc" },
  });

  const organizerSlugs = [...new Set(events.map((e) => e.organizer.slug))];

  const organizerUrls: MetadataRoute.Sitemap = organizerSlugs.map((slug) => ({
    url: `https://tyckety.cz/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const eventUrls: MetadataRoute.Sitemap = events.map((e) => ({
    url: `https://tyckety.cz/${e.organizer.slug}/${e.slug}`,
    lastModified: e.createdAt,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: "https://tyckety.cz",
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...organizerUrls,
    ...eventUrls,
  ];
}
