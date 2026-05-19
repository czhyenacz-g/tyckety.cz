import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOATCOUNTER_CODE } from "./config/analytics";

export const metadata: Metadata = {
  title: "TEST — Heavy metal koncert | Tyckety.cz",
  description: "Ukázková koncertní stránka vytvořená v Tyckety. Vstupenky přes QR platbu a ověření mobilem.",
  openGraph: {
    title: "TEST — Heavy metal koncert | Tyckety.cz",
    description: "Ukázková koncertní stránka vytvořená v Tyckety. Vstupenky přes QR platbu a ověření mobilem.",
    url: "https://tyckety.cz",
    siteName: "Tyckety.cz",
    locale: "cs_CZ",
    type: "website",
    images: [{ url: "https://tyckety.cz/images/test_koncert_web.webp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TEST — Heavy metal koncert | Tyckety.cz",
    description: "Ukázková koncertní stránka vytvořená v Tyckety. Vstupenky přes QR platbu a ověření mobilem.",
    images: ["https://tyckety.cz/images/test_koncert_web.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body className="bg-gray-900 text-white antialiased">
        {children}
        <Analytics />
        {GOATCOUNTER_CODE && (
          <Script
            data-goatcounter={`https://${GOATCOUNTER_CODE}.goatcounter.com/count`}
            src="//gc.zgo.at/count.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
