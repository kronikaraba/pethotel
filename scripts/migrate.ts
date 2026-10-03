// Veritabanı migration'larını uygular. `npm run build` bu betiği otomatik çalıştırır.
// DATABASE_URL tanımlı değilse (yerel gömülü PGlite) atlanır; yerelde migration'lar uygulama açılırken uygulanır.
import path from "node:path";
import { loadEnvConfig } from "@next/env";

// .env / .env.local dosyalarını Next.js ile aynı şekilde yükle.
loadEnvConfig(process.cwd());

async function main() {
  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!url) {
    console.log("[migrate] DATABASE_URL tanımlı değil, atlanıyor (yerelde uygulama açılırken otomatik uygulanır).");
    return;
  }

  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    console.log("[migrate] Veritabanı şeması güncel.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[migrate] Migration uygulanamadı:", error);
  process.exit(1);
});
