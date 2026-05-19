import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { GOATCOUNTER_CODE } from "./config/analytics";

export const metadata: Metadata = {
  title: "Tyckety.cz",
  description: "Vstupenky na váš web za pár minut. Bez platební brány, platba QR kódem.",
  openGraph: {
    title: "Tyckety.cz",
    description: "Vstupenky na váš web za pár minut. Bez platební brány, platba QR kódem.",
    url: "https://tyckety.cz",
    siteName: "Tyckety.cz",
    locale: "cs_CZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyckety.cz",
    description: "Vstupenky na váš web za pár minut. Bez platební brány, platba QR kódem.",
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
