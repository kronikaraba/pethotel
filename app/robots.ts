import type { MetadataRoute } from "next";

// Arama motorları panel, yönetim ve kişisel rezervasyon sayfalarını taramasın.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/admin", "/api", "/rezervasyonum", "/giris"] }],
  };
}
