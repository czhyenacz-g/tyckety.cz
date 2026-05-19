import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/api/",
          "/scan/",
          "/embed/",
          "/objednavka/",
          "/vstupenka/",
          "/prihlaseni",
        ],
      },
    ],
    sitemap: "https://tyckety.cz/sitemap.xml",
  };
}
