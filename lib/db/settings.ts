// Veritabanında saklanan uygulama ayarları (app_settings tablosu).
import { eq } from "drizzle-orm";
import type { Queryable } from "./index";
import { appSettings } from "./schema";

async function readSetting(db: Queryable, key: string): Promise<string | undefined> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row?.value;
}

/**
 * Ayar kayıtlıysa değerini döndürür; değilse `create` ile üretip kaydeder.
 * Birden fazla sunucu aynı anda çağırsa da hepsi ilk kaydedilen değeri alır.
 */
export async function getOrCreateSetting(db: Queryable, key: string, create: () => string): Promise<string> {
  const existing = await readSetting(db, key);
  if (existing !== undefined) return existing;

  await db.insert(appSettings).values({ key, value: create() }).onConflictDoNothing();
  const saved = await readSetting(db, key);
  if (saved === undefined) throw new Error(`"${key}" ayarı kaydedilemedi.`);
  return saved;
}
