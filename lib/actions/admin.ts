"use server";
// Platform yöneticisi işlemleri.
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { clinics } from "../db/schema";
import { requireSuperadmin } from "../auth/dal";
import type { ClinicStatus } from "../constants";

export async function setClinicStatusAction(
  clinicId: string,
  status: ClinicStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSuperadmin();
  if (!["active", "suspended", "pending"].includes(status)) return { ok: false, error: "Geçersiz durum." };
  const db = await getDb();
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  if (!clinic) return { ok: false, error: "Klinik bulunamadı." };
  await db
    .update(clinics)
    .set({
      status,
      approvedAt: status === "active" && !clinic.approvedAt ? new Date() : clinic.approvedAt,
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, clinicId));
  revalidatePath("/admin");
  revalidatePath(`/klinik/${clinic.slug}`);
  return { ok: true };
}
