import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await db.event.findMany({
    where: { status: "published" },
    include: { organizer: { select: { slug: true } } },
    orderBy: { startsAt: "desc" },
  });

  const organizerSlugs = [...new Set(events.map((e) => e.organizer.slug))];

  const organizerUrls: MetadataRoute.Sitemap = organizerSlugs.map((slug) => ({
    url: `${siteUrl}/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const eventUrls: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${siteUrl}/${e.organizer.slug}/${e.slug}`,
    lastModified: e.createdAt,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...organizerUrls,
    ...eventUrls,
  ];
}
