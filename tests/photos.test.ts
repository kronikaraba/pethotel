// Klinik fotoğrafları: dosya türü denetimi ve veritabanı işlemleri (bellek içi PGlite).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.SEED_DEMO_DATA = "true";
} else {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
}

const { getDb, closeDb } = await import("@/lib/db");
const { clinics, clinicPhotos } = await import("@/lib/db/schema");
const { addClinicPhoto, deleteClinicPhoto, getCoverPhotos, getPhotoFile, listClinicPhotos, moveClinicPhoto, PhotoError } =
  await import("@/lib/data/photos");
const { MAX_PHOTOS_PER_CLINIC, sniffImageType } = await import("@/lib/photos");

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")]);
const size = { width: 1600, height: 1200 };

let clinicId: string;
let otherClinicId: string;

beforeAll(async () => {
  const db = await getDb();
  const rows = await db.select().from(clinics);
  clinicId = rows.find((c) => c.slug === "moda-pati-veteriner")!.id;
  otherClinicId = rows.find((c) => c.slug !== "moda-pati-veteriner")!.id;
  await db.delete(clinicPhotos).where(eq(clinicPhotos.clinicId, clinicId));
}, 60_000);

afterAll(async () => {
  await closeDb();
});

describe("dosya türü", () => {
  it("JPEG, PNG ve WebP'yi ilk baytlarından tanır", () => {
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });

  it("resim olmayan dosyayı reddeder", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});

describe("klinik fotoğrafları", () => {
  it("fotoğrafı kaydeder ve aynı baytları geri verir", async () => {
    const db = await getDb();
    const photo = await addClinicPhoto(db, clinicId, JPEG, size);
    const file = await getPhotoFile(db, photo.id);
    expect(file?.mimeType).toBe("image/jpeg");
    expect(Array.from(file!.data)).toEqual(Array.from(JPEG));
  });

  it("resim olmayan dosyayı kaydetmez", async () => {
    const db = await getDb();
    await expect(addClinicPhoto(db, clinicId, new TextEncoder().encode("merhaba"), size)).rejects.toBeInstanceOf(PhotoError);
  });

  it("ilk fotoğraf kapak olur; kapak değiştirilebilir", async () => {
    const db = await getDb();
    const second = await addClinicPhoto(db, clinicId, PNG, size);
    const [first] = await listClinicPhotos(db, clinicId);
    expect((await getCoverPhotos(db, [clinicId])).get(clinicId)?.id).toBe(first!.id);

    await moveClinicPhoto(db, clinicId, second.id, "first");
    expect((await getCoverPhotos(db, [clinicId])).get(clinicId)?.id).toBe(second.id);
    expect((await listClinicPhotos(db, clinicId)).map((p) => p.id)).toEqual([second.id, first!.id]);
  });

  it("başka kliniğin fotoğrafını silemez ya da taşıyamaz", async () => {
    const db = await getDb();
    const [photo] = await listClinicPhotos(db, clinicId);
    expect(await deleteClinicPhoto(db, otherClinicId, photo!.id)).toBe(false);
    expect(await moveClinicPhoto(db, otherClinicId, photo!.id, "right")).toBe(false);
    expect(await getPhotoFile(db, photo!.id)).not.toBeNull();
  });

  it("silinen fotoğraftan sonra sıra boşluksuz kalır", async () => {
    const db = await getDb();
    const third = await addClinicPhoto(db, clinicId, WEBP, size);
    const [cover] = await listClinicPhotos(db, clinicId);
    expect(await deleteClinicPhoto(db, clinicId, cover!.id)).toBe(true);
    const rows = await db.select().from(clinicPhotos).where(eq(clinicPhotos.clinicId, clinicId));
    expect(rows.map((r) => r.sortOrder).sort()).toEqual([0, 1]);
    expect((await listClinicPhotos(db, clinicId)).at(-1)?.id).toBe(third.id);
  });

  it(`en fazla ${MAX_PHOTOS_PER_CLINIC} fotoğraf kabul eder`, async () => {
    const db = await getDb();
    const existing = (await listClinicPhotos(db, clinicId)).length;
    for (let i = existing; i < MAX_PHOTOS_PER_CLINIC; i++) await addClinicPhoto(db, clinicId, JPEG, size);
    await expect(addClinicPhoto(db, clinicId, JPEG, size)).rejects.toThrow(/En fazla/);
  });
});
