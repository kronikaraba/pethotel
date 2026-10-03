"use server";
// Klinik başvurusu: klinik (onay bekliyor) + klinik yöneticisi hesabı oluşturur ve panele yönlendirir.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { clinics, services, users } from "../db/schema";
import { hashPassword } from "../auth/password";
import { createSession } from "../auth/session";
import { DEFAULT_HOURS, STARTER_SERVICES, uniqueClinicSlug } from "../registration";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { clinicRegistrationInput, fieldErrors } from "../validation";
import type { FormState } from "./auth";

const FIELDS = [
  "clinicName",
  "city",
  "district",
  "address",
  "phone",
  "clinicEmail",
  "description",
  "contactName",
  "email",
  "website",
] as const;

export async function registerClinicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(FIELDS.map((k) => [k, String(formData.get(k) ?? "")]));
  if (!(await rateLimit("register", 5, 60 * 60_000))) return { error: RATE_LIMIT_MESSAGE, values };

  const parsed = clinicRegistrationInput.safeParse({
    ...values,
    password: String(formData.get("password") ?? ""),
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    return { error: "Lütfen işaretli alanları kontrol et.", fieldErrors: fieldErrors(parsed.error), values };
  }
  const d = parsed.data;

  const db = await getDb();
  const taken = await db.select({ id: users.id }).from(users).where(eq(users.email, d.email)).limit(1);
  if (taken.length > 0) {
    return { fieldErrors: { email: "Bu e-posta adresiyle bir hesap zaten var. Giriş yapmayı dene." }, values };
  }

  const slug = await uniqueClinicSlug(d.clinicName);
  const passwordHash = await hashPassword(d.password);
  const user = await db.transaction(async (tx) => {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        slug,
        name: d.clinicName,
        status: "pending",
        city: d.city,
        district: d.district,
        address: d.address,
        phone: d.phone,
        email: d.clinicEmail,
        description: d.description,
        workingHours: DEFAULT_HOURS,
      })
      .returning();
    await tx.insert(services).values(STARTER_SERVICES.map((s, i) => ({ ...s, clinicId: clinic.id, sortOrder: i })));
    const [created] = await tx
      .insert(users)
      .values({ email: d.email, passwordHash, name: d.contactName, role: "clinic_admin", clinicId: clinic.id })
      .returning();
    return created;
  });

  await createSession({ uid: user.id, role: user.role, cid: user.clinicId });
  redirect("/panel");
}
