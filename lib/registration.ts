// Klinik başvurusu yardımcıları.
import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { clinics, type WeekHours } from "./db/schema";
import type { ServiceCategory } from "./constants";
import { slugify } from "./format";

/** Klinik adından benzersiz bağlantı adı üretir. */
export async function uniqueClinicSlug(name: string): Promise<string> {
  const db = await getDb();
  const base = slugify(name) || "klinik";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const exists = await db.select({ id: clinics.id }).from(clinics).where(eq(clinics.slug, candidate)).limit(1);
    if (exists.length === 0) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Yeni kliniğin başlangıç çalışma saatleri (panelden değiştirilebilir). */
export const DEFAULT_HOURS: WeekHours = {
  "1": { open: "09:00", close: "18:00", breakStart: null, breakEnd: null },
  "2": { open: "09:00", close: "18:00", breakStart: null, breakEnd: null },
  "3": { open: "09:00", close: "18:00", breakStart: null, breakEnd: null },
  "4": { open: "09:00", close: "18:00", breakStart: null, breakEnd: null },
  "5": { open: "09:00", close: "18:00", breakStart: null, breakEnd: null },
  "6": { open: "10:00", close: "15:00", breakStart: null, breakEnd: null },
  "0": null,
};

/** Yeni kliniğe önerilen başlangıç hizmetleri (fiyatsız; klinik düzenler). */
export const STARTER_SERVICES: { name: string; category: ServiceCategory; durationMinutes: number }[] = [
  { name: "Genel muayene", category: "muayene", durationMinutes: 30 },
  { name: "Karma aşı", category: "asi", durationMinutes: 15 },
  { name: "Kuduz aşısı", category: "asi", durationMinutes: 15 },
  { name: "İç ve dış parazit uygulaması", category: "asi", durationMinutes: 15 },
  { name: "Check-up ve kan tahlili", category: "checkup", durationMinutes: 45 },
];
