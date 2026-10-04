// Klinik fotoğraflarının veritabanı işlemleri.
import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Queryable } from "../db";
import { clinicPhotos } from "../db/schema";
import { MAX_PHOTO_BYTES, MAX_PHOTO_EDGE, MAX_PHOTOS_PER_CLINIC, sniffImageType, type PhotoMimeType } from "../photos";

export type PhotoMeta = { id: string; width: number; height: number };

export class PhotoError extends Error {}

const meta = { id: clinicPhotos.id, width: clinicPhotos.width, height: clinicPhotos.height };

export async function listClinicPhotos(db: Queryable, clinicId: string): Promise<PhotoMeta[]> {
  return db
    .select(meta)
    .from(clinicPhotos)
    .where(eq(clinicPhotos.clinicId, clinicId))
    .orderBy(asc(clinicPhotos.sortOrder), asc(clinicPhotos.createdAt));
}

/** Her kliniğin kapak fotoğrafı (sıralamada ilk fotoğraf). Fotoğrafı olmayan klinik haritada yer almaz. */
export async function getCoverPhotos(db: Queryable, clinicIds: string[]): Promise<Map<string, PhotoMeta>> {
  const covers = new Map<string, PhotoMeta>();
  if (clinicIds.length === 0) return covers;
  const rows = await db
    .select({ ...meta, clinicId: clinicPhotos.clinicId })
    .from(clinicPhotos)
    .where(inArray(clinicPhotos.clinicId, clinicIds))
    .orderBy(asc(clinicPhotos.sortOrder), asc(clinicPhotos.createdAt));
  for (const { clinicId, ...photo } of rows) if (!covers.has(clinicId)) covers.set(clinicId, photo);
  return covers;
}

export async function getPhotoFile(db: Queryable, id: string): Promise<{ mimeType: string; data: Uint8Array } | null> {
  const [row] = await db
    .select({ mimeType: clinicPhotos.mimeType, data: clinicPhotos.data })
    .from(clinicPhotos)
    .where(eq(clinicPhotos.id, id))
    .limit(1);
  return row ?? null;
}

export async function addClinicPhoto(
  db: Queryable,
  clinicId: string,
  bytes: Uint8Array,
  size: { width: number; height: number },
): Promise<PhotoMeta> {
  if (bytes.length === 0) throw new PhotoError("Dosya boş.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new PhotoError("Fotoğraf çok büyük. En fazla 1,5 MB olabilir.");
  const mimeType: PhotoMimeType | null = sniffImageType(bytes);
  if (!mimeType) throw new PhotoError("Yalnızca JPEG, PNG ya da WebP fotoğraf yükleyebilirsin.");
  const width = Math.round(size.width);
  const height = Math.round(size.height);
  if (!(width > 0 && height > 0 && width <= MAX_PHOTO_EDGE * 2 && height <= MAX_PHOTO_EDGE * 2)) {
    throw new PhotoError("Fotoğraf boyutu okunamadı.");
  }
  const [{ n }] = await db.select({ n: count() }).from(clinicPhotos).where(eq(clinicPhotos.clinicId, clinicId));
  if (n >= MAX_PHOTOS_PER_CLINIC) throw new PhotoError(`En fazla ${MAX_PHOTOS_PER_CLINIC} fotoğraf ekleyebilirsin.`);
  const [row] = await db
    .insert(clinicPhotos)
    .values({ clinicId, mimeType, data: bytes, width, height, byteSize: bytes.length, sortOrder: n })
    .returning(meta);
  return row!;
}

export async function deleteClinicPhoto(db: Queryable, clinicId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(clinicPhotos)
    .where(and(eq(clinicPhotos.id, id), eq(clinicPhotos.clinicId, clinicId)))
    .returning({ id: clinicPhotos.id });
  if (deleted.length === 0) return false;
  await renumber(db, clinicId, (await listClinicPhotos(db, clinicId)).map((p) => p.id));
  return true;
}

/** Fotoğrafı başa (kapak), bir sola ya da bir sağa taşır. */
export async function moveClinicPhoto(
  db: Queryable,
  clinicId: string,
  id: string,
  to: "first" | "left" | "right",
): Promise<boolean> {
  const order = (await listClinicPhotos(db, clinicId)).map((p) => p.id);
  const i = order.indexOf(id);
  if (i === -1) return false;
  const j = to === "first" ? 0 : to === "left" ? i - 1 : i + 1;
  if (j < 0 || j >= order.length || j === i) return true;
  order.splice(i, 1);
  order.splice(j, 0, id);
  await renumber(db, clinicId, order);
  return true;
}

async function renumber(db: Queryable, clinicId: string, order: string[]) {
  for (const [sortOrder, id] of order.entries()) {
    await db
      .update(clinicPhotos)
      .set({ sortOrder })
      .where(and(eq(clinicPhotos.id, id), eq(clinicPhotos.clinicId, clinicId)));
  }
}
