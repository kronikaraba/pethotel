"use server";
// Kayıt: seçilen hesap türünde işletme (onay bekliyor) + yönetici hesabı oluşturur ve panele yönlendirir.
// Veteriner kliniği başlangıç hizmetleriyle, pet otel konaklama açık, pet sitter kendi takvimiyle başlar.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { clinics, services, users, vets } from "../db/schema";
import { hashPassword } from "../auth/password";
import { createSession } from "../auth/session";
import { DEFAULT_HOURS, DEFAULT_SITTER_HOURS, STARTER_SERVICES, STARTER_SITTER_SERVICES, uniqueClinicSlug } from "../registration";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { clinicRegistrationInput, fieldErrors } from "../validation";
import type { FormState } from "./auth";

const FIELDS = [
  "kind",
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
  // Pet sitter hesabı kişiseldir: profil adı aynı zamanda hesap sahibinin adıdır.
  if (values.kind === "sitter") values.contactName = values.clinicName;
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

  const slug = await uniqueClinicSlug(d.kind === "sitter" ? `${d.clinicName} pet sitter` : d.clinicName);
  const passwordHash = await hashPassword(d.password);
  const user = await db.transaction(async (tx) => {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        slug,
        name: d.clinicName,
        kind: d.kind,
        status: "pending",
        city: d.city,
        district: d.district,
        address: d.address,
        phone: d.phone,
        email: d.clinicEmail,
        description: d.description,
        workingHours: d.kind === "sitter" ? DEFAULT_SITTER_HOURS : DEFAULT_HOURS,
        slotMinutes: d.kind === "sitter" ? 30 : 15,
        // Pet otel konaklama açık başlar; kapasite ve fiyatlar otel ayarlarından girilir.
        boardingEnabled: d.kind === "hotel",
        boardingCatCapacity: d.kind === "hotel" ? 5 : 0,
        boardingDogCapacity: d.kind === "hotel" ? 5 : 0,
        autoConfirm: d.kind !== "sitter",
      })
      .returning();
    if (d.kind === "vet") {
      await tx.insert(services).values(STARTER_SERVICES.map((s, i) => ({ ...s, clinicId: clinic.id, sortOrder: i })));
    }
    if (d.kind === "sitter") {
      await tx.insert(services).values(STARTER_SITTER_SERVICES.map((s, i) => ({ ...s, clinicId: clinic.id, sortOrder: i })));
      // Randevu takvimi kişi bazında çalışır; pet sitterın takvimi kendisidir.
      await tx.insert(vets).values({ clinicId: clinic.id, name: d.clinicName, title: "Pet sitter" });
    }
    const [created] = await tx
      .insert(users)
      .values({ email: d.email, passwordHash, name: d.contactName, role: "clinic_admin", clinicId: clinic.id })
      .returning();
    return created;
  });

  await createSession({ uid: user.id, role: user.role, cid: user.clinicId });
  redirect("/panel");
}
