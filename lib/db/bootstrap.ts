// Uygulama ilk açıldığında gerekli başlangıç verilerini hazırlar:
// 1) Platform yöneticisi (süper admin) hesabı
// 2) Yerel geliştirmede (veya SEED_DEMO_DATA=true ise) demo klinikler
import { count, eq, sql } from "drizzle-orm";
import type { DB, Driver } from "./index";
import { clinics, users } from "./schema";
import { hashPassword } from "../auth/password";
import { insertDemoData } from "./demo-data";

/** Yalnızca yerel (PGlite) veritabanında kullanılan varsayılan yönetici hesabı. */
export const DEV_ADMIN = { email: "admin@pethotel.local", password: "pethotel123" };

export async function bootstrapData(db: DB, driver: Driver): Promise<void> {
  await ensureSuperadmin(db, driver);

  const wantDemo =
    driver === "pglite"
      ? process.env.SEED_DEMO_DATA !== "false"
      : process.env.SEED_DEMO_DATA === "true";
  if (wantDemo) await seedDemoDataIfEmpty(db);
}

async function ensureSuperadmin(db: DB, driver: Driver) {
  let email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    if (driver !== "pglite") {
      const [{ n }] = await db
        .select({ n: count() })
        .from(users)
        .where(eq(users.role, "superadmin"));
      if (n === 0) {
        console.warn(
          "[pethotel] Platform yöneticisi yok. ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenlerini tanımla.",
        );
      }
      return;
    }
    email = DEV_ADMIN.email;
    password = DEV_ADMIN.password;
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) return;

  await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      name: "Platform Yöneticisi",
      role: "superadmin",
    })
    .onConflictDoNothing();
}

/** Klinik tablosu boşsa demo verileri yükler. Aynı anda iki sunucu açılırsa kilitle sıraya girer. */
export async function seedDemoDataIfEmpty(db: DB): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(727274)`);
    const [{ n }] = await tx.select({ n: count() }).from(clinics);
    if (n > 0) return false;
    await insertDemoData(tx);
    return true;
  });
}
