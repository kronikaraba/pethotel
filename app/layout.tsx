import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree/wght.css";
import "./globals.css";

// Sayfalar veritabanından canlı veri okur; derleme sırasında önceden üretilmez.
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PetHotel — Veteriner randevusu ve pet otel",
    template: "%s | PetHotel",
  },
  description:
    "Şehrindeki veteriner kliniklerini karşılaştır, boş saatleri gör ve üye olmadan randevu al. Tatile çıkarken pet otel rezervasyonu da yap.",
  applicationName: "PetHotel",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "PetHotel",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f5c4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
