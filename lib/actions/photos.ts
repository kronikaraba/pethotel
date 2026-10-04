"use server";
// Klinik fotoğrafı yükleme, sıralama ve silme. Yalnızca klinik yöneticisi kullanabilir.
import { revalidatePath } from "next/cache";
import { getDb } from "../db";
import { requireClinicUser } from "../auth/dal";
import { addClinicPhoto, deleteClinicPhoto, moveClinicPhoto, PhotoError, type PhotoMeta } from "../data/photos";
import type { PanelResult } from "./panel";

function refresh(slug: string) {
  revalidatePath("/panel/fotograflar");
  revalidatePath(`/klinik/${slug}`);
  revalidatePath("/klinikler");
  revalidatePath("/");
}

export async function uploadClinicPhotoAction(formData: FormData): Promise<PanelResult<PhotoMeta>> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Fotoğraf seçilmedi." };
  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));
  try {
    const db = await getDb();
    const photo = await addClinicPhoto(db, clinic.id, new Uint8Array(await file.arrayBuffer()), { width, height });
    refresh(clinic.slug);
    return { ok: true, data: photo };
  } catch (error) {
    if (error instanceof PhotoError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function deleteClinicPhotoAction(id: string): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const db = await getDb();
  if (!(await deleteClinicPhoto(db, clinic.id, id))) return { ok: false, error: "Fotoğraf bulunamadı." };
  refresh(clinic.slug);
  return { ok: true, message: "Fotoğraf silindi." };
}

export async function moveClinicPhotoAction(id: string, to: "first" | "left" | "right"): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  if (!["first", "left", "right"].includes(to)) return { ok: false, error: "Geçersiz işlem." };
  const db = await getDb();
  if (!(await moveClinicPhoto(db, clinic.id, id, to))) return { ok: false, error: "Fotoğraf bulunamadı." };
  refresh(clinic.slug);
  return { ok: true, message: to === "first" ? "Kapak fotoğrafı güncellendi." : undefined };
}
