// Uygulama ayarları ve canlı/yerel demo hesap davranışı (bellek içi PGlite; TEST_DATABASE_URL ile gerçek Postgres).
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.SEED_DEMO_DATA = "true";
} else {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
}

const { getDb, getDriver, closeDb } = await import("@/lib/db");
const { getOrCreateSetting } = await import("@/lib/db/settings");
const { users } = await import("@/lib/db/schema");
const { DEMO_PASSWORD } = await import("@/lib/db/demo-data");
const { verifyPassword } = await import("@/lib/auth/password");

afterAll(async () => {
  await closeDb();
});

describe("uygulama ayarları", () => {
  it("değeri ilk çağrıda üretir, sonra hep aynısını döndürür", async () => {
    const db = await getDb();
    let calls = 0;
    const create = () => `deger-${++calls}`;
    const key = `test-${Date.now()}`;

    const first = await getOrCreateSetting(db, key, create);
    const second = await getOrCreateSetting(db, key, create);

    expect(first).toBe("deger-1");
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it("aynı anda gelen çağrıların hepsi aynı değeri alır", async () => {
    const db = await getDb();
    const key = `yaris-${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => getOrCreateSetting(db, key, () => `aday-${i}`)),
    );
    expect(new Set(results).size).toBe(1);
  });
});

describe("demo klinik hesapları", () => {
  it("bilinen demo şifresi yalnızca yerel veritabanında geçerli", async () => {
    const db = await getDb();
    const [demoAdmin] = await db.select().from(users).where(eq(users.email, "moda@pethotel.local")).limit(1);
    expect(demoAdmin).toBeDefined();

    const knownPasswordWorks = await verifyPassword(DEMO_PASSWORD, demoAdmin.passwordHash);
    expect(knownPasswordWorks).toBe((await getDriver()) === "pglite");
  });
});
