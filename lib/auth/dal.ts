// Veri erişim katmanı: oturumu doğrular ve yetkiyi kontrol eder.
// Panel sayfaları ve sunucu işlemleri yetki kontrolünü daima buradan yapar.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { clinics, users, type Clinic } from "../db/schema";
import { readSession } from "./session";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "clinic_admin" | "clinic_staff";
  clinicId: string | null;
};

/** Geçerli oturumun kullanıcısı (istek boyunca önbelleklenir). Kullanıcı silindiyse null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, clinicId: users.clinicId })
    .from(users)
    .where(eq(users.id, session.uid))
    .limit(1);
  return user ?? null;
});

const getClinic = cache(async (id: string): Promise<Clinic | null> => {
  const db = await getDb();
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id)).limit(1);
  return clinic ?? null;
});

export type ClinicContext = { user: CurrentUser & { clinicId: string }; clinic: Clinic; isAdmin: boolean };

/** Klinik paneli için oturum ister. adminOnly ise yalnızca klinik yöneticisi girebilir. */
export async function requireClinicUser(opts: { adminOnly?: boolean } = {}): Promise<ClinicContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.role === "superadmin") redirect("/admin");
  if (!user.clinicId) redirect("/giris");
  const clinic = await getClinic(user.clinicId);
  if (!clinic) redirect("/giris");
  const isAdmin = user.role === "clinic_admin";
  if (opts.adminOnly && !isAdmin) redirect("/panel");
  return { user: { ...user, clinicId: user.clinicId }, clinic, isAdmin };
}

export async function requireSuperadmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.role !== "superadmin") redirect("/panel");
  return user;
}
