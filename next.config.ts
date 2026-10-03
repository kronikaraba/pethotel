import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Derleme sırasında gerçek bir Postgres adresi varsa (Vercel + Neon), yerel gömülü veritabanı
// paketini sunucu paketlerine eklemeye gerek yok.
const usingPostgres = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const nextConfig: NextConfig = {
  // PGlite (yerel gömülü Postgres) WASM dosyalarını node_modules içinden okur; paketlenmemeli.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Çalışma anında uygulanabilecek migration dosyaları sunucu paketine dahil edilsin.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  outputFileTracingExcludes: {
    "/**": ["./.data/**/*", ...(usingPostgres ? ["./node_modules/@electric-sql/pglite/**/*"] : [])],
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
