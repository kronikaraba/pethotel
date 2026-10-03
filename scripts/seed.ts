// Demo verileri yükler (klinik tablosu boşsa) ve platform yöneticisini oluşturur.
// Kullanım: npm run db:seed
// Canlı veritabanında çalıştırmak için önce .env dosyana DATABASE_URL, ADMIN_EMAIL ve ADMIN_PASSWORD yaz.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
process.env.SEED_DEMO_DATA = "true";

async function main() {
  const { getDb, getDriver, closeDb } = await import("../lib/db");
  await getDb(); // migration + yönetici + demo veriler
  console.log(`[seed] Tamamlandı (${(await getDriver()) === "pglite" ? "yerel PGlite" : "Postgres"}).`);
  await closeDb();
}

main().catch((error) => {
  console.error("[seed] Hata:", error);
  process.exit(1);
});
