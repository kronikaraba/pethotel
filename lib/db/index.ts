// Veritabanı bağlantısı.
//
// - DATABASE_URL (veya POSTGRES_URL) tanımlıysa gerçek Postgres'e (Neon, Supabase, Railway…) bağlanır.
// - Tanımlı değilse projenin içindeki .data/pglite klasöründe gömülü Postgres (PGlite) çalıştırır.
//   Böylece yerelde hiçbir kurulum yapmadan `npm run dev` ile proje ayağa kalkar.
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { bootstrapData } from "./bootstrap";

export type DB = NodePgDatabase<typeof schema>;
/** db.transaction(...) içindeki `tx` nesnesi. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
/** Hem db hem tx kabul eden fonksiyonlar için. */
export type Queryable = DB | Tx;
export type Driver = "pg" | "pglite";

type DbState = {
  db: DB;
  driver: Driver;
  ready: Promise<void>;
  close: () => Promise<void>;
};

const globalForDb = globalThis as unknown as { __pethotelDb?: Promise<DbState> };

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** Gömülü yerel veritabanı (PGlite) mı kullanılıyor? */
export function isLocalDatabase(): boolean {
  return !databaseUrl();
}

function migrationsFolder() {
  return path.join(process.cwd(), "drizzle");
}

async function connect(): Promise<DbState> {
  const url = databaseUrl();

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 5),
    });
    const db = drizzle(pool, { schema });
    const ready = (async () => {
      // Canlıda migration'lar derleme sırasında (npm run build) uygulanır.
      // Yerel geliştirmede uzak veritabanına bağlanıldıysa burada da uygulanır.
      if (process.env.NODE_ENV !== "production" || process.env.DB_MIGRATE_ON_START === "true") {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        await migrate(db, { migrationsFolder: migrationsFolder() });
      }
      await bootstrapData(db, "pg");
    })();
    return { db, driver: "pg", ready, close: () => pool.end() };
  }

  if (process.env.VERCEL) {
    // Vercel'in dosya sistemi salt okunurdur; gömülü veritabanı orada çalışamaz.
    throw new Error(
      "DATABASE_URL tanımlı değil. Vercel projesinde Storage → Neon (Postgres) bağlayıp yeniden deploy et.",
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = process.env.PGLITE_DATA_DIR || path.join(process.cwd(), ".data", "pglite");
  if (!dataDir.startsWith("memory://")) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
  }
  const client = new PGlite(dataDir);
  const pgliteDb = drizzle(client, { schema });
  const db = pgliteDb as unknown as DB;
  const ready = (async () => {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(pgliteDb, { migrationsFolder: migrationsFolder() });
    await bootstrapData(db, "pglite");
  })();
  return { db, driver: "pglite", ready, close: () => client.close() };
}

async function state(): Promise<DbState> {
  if (!globalForDb.__pethotelDb) {
    const pending = connect();
    globalForDb.__pethotelDb = pending;
    pending
      .then((s) => s.ready)
      .catch(async (error) => {
        console.error("[db] Veritabanı hazırlanamadı:", error);
        // Bir sonraki istekte yeniden denensin.
        if (globalForDb.__pethotelDb === pending) globalForDb.__pethotelDb = undefined;
        try {
          await (await pending).close();
        } catch {
          /* yok say */
        }
      });
  }
  const s = await globalForDb.__pethotelDb;
  await s.ready;
  return s;
}

/** Hazır (migration'ları uygulanmış) veritabanı bağlantısını döndürür. */
export async function getDb(): Promise<DB> {
  return (await state()).db;
}

export async function getDriver(): Promise<Driver> {
  return (await state()).driver;
}

/** Komut satırı betikleri için bağlantıyı kapatır. */
export async function closeDb(): Promise<void> {
  const pending = globalForDb.__pethotelDb;
  globalForDb.__pethotelDb = undefined;
  if (pending) await (await pending).close();
}

export { schema };
