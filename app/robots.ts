import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/api/",
          "/internal/",
          "/scan/",
          "/embed/",
          "/objednavka/",
          "/vstupenka/",
          "/prihlaseni",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
