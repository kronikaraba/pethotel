"use server";
// Klinik paneli işlemleri. Her işlem oturumu ve kaydın bu kliniğe ait olduğunu doğrular.
import { revalidatePath } from "next/cache";
import { and, count, eq, gte, inArray, ne } from "drizzle-orm";
import { getDb } from "../db";
import { appointments, boardingReservations, clinics, services, users, vets, type WeekHours } from "../db/schema";
import { requireClinicUser } from "../auth/dal";
import { hashPassword } from "../auth/password";
import { createAppointment } from "../booking/appointments";
import { getBoardingQuote } from "../booking/boarding";
import { BookingError } from "../booking/errors";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  WEEKDAYS,
  type AppointmentStatus,
  type BoardingStatus,
} from "../constants";
import { timeToMinutes, todayInIstanbul } from "../time";
import {
  clinicSettingsInput,
  fieldErrors,
  manualAppointmentInput,
  serviceInput,
  staffUserInput,
  vetInput,
  type ClinicSettingsInput,
} from "../validation";
import type { z } from "zod";

export type PanelResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const CHECK = "Lütfen işaretli alanları kontrol et.";

function refresh() {
  revalidatePath("/panel", "layout");
}

// ---------------- Randevular ----------------

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  completed: ["no_show"],
  no_show: ["completed"],
  cancelled: [],
};

export async function setAppointmentStatusAction(id: string, status: AppointmentStatus): Promise<PanelResult> {
  const { clinic } = await requireClinicUser();
  const db = await getDb();
  const [a] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinic.id)))
    .limit(1);
  if (!a) return { ok: false, error: "Randevu bulunamadı." };
  if (!APPOINTMENT_TRANSITIONS[a.status].includes(status)) {
    return { ok: false, error: "Bu randevunun durumu bu şekilde değiştirilemez." };
  }
  await db
    .update(appointments)
    .set({ status, cancelledBy: status === "cancelled" ? "clinic" : a.cancelledBy, updatedAt: new Date() })
    .where(and(eq(appointments.id, a.id), eq(appointments.status, a.status)));
  refresh();
  return { ok: true };
}

export async function createManualAppointmentAction(
  input: z.input<typeof manualAppointmentInput>,
): Promise<PanelResult<{ code: string; date: string }>> {
  const { clinic } = await requireClinicUser();
  const parsed = manualAppointmentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  try {
    const a = await createAppointment({
      clinicId: clinic.id,
      serviceId: d.serviceId,
      vetId: d.vetId,
      date: d.date,
      startMinute: timeToMinutes(d.time),
      petName: d.petName,
      petSpecies: d.petSpecies,
      ownerName: d.ownerName,
      ownerPhone: d.ownerPhone,
      notes: d.notes,
      mode: "clinic",
    });
    refresh();
    return { ok: true, data: { code: a.code, date: a.date } };
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.message };
    console.error("[panel] randevu eklenemedi", error);
    return { ok: false, error: "Randevu eklenemedi. Tekrar dene." };
  }
}

// ---------------- Pet otel ----------------

const BOARDING_TRANSITIONS: Record<BoardingStatus, BoardingStatus[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["checked_in", "cancelled"],
  checked_in: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export async function setBoardingStatusAction(id: string, status: BoardingStatus, note?: string): Promise<PanelResult> {
  const { clinic } = await requireClinicUser();
  const db = await getDb();
  const [r] = await db
    .select()
    .from(boardingReservations)
    .where(and(eq(boardingReservations.id, id), eq(boardingReservations.clinicId, clinic.id)))
    .limit(1);
  if (!r) return { ok: false, error: "Konaklama bulunamadı." };
  if (!BOARDING_TRANSITIONS[r.status].includes(status)) {
    return { ok: false, error: "Bu konaklamanın durumu bu şekilde değiştirilemez." };
  }
  if (status === "confirmed") {
    // Kapasite sonradan düşürüldüyse onay öncesi tekrar kontrol et.
    const quote = await getBoardingQuote({ clinic, species: r.species, checkIn: r.checkIn, checkOut: r.checkOut, excludeId: r.id });
    if (quote.ok && quote.minFree <= 0) {
      return { ok: false, error: "Bu tarihlerde kapasite dolu. Önce kapasiteyi artır ya da başka bir talebi reddet." };
    }
  }
  const cleanNote = note?.trim().slice(0, 300) || null;
  await db
    .update(boardingReservations)
    .set({
      status,
      cancelledBy: status === "cancelled" ? "clinic" : r.cancelledBy,
      clinicNote: cleanNote ?? r.clinicNote,
      updatedAt: new Date(),
    })
    .where(and(eq(boardingReservations.id, r.id), eq(boardingReservations.status, r.status)));
  refresh();
  return { ok: true };
}

// ---------------- Hizmetler ----------------

export async function saveServiceAction(
  id: string | null,
  input: z.input<typeof serviceInput>,
): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const parsed = serviceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrors(parsed.error) };
  const db = await getDb();
  if (id) {
    const updated = await db
      .update(services)
      .set(parsed.data)
      .where(and(eq(services.id, id), eq(services.clinicId, clinic.id)))
      .returning({ id: services.id });
    if (updated.length === 0) return { ok: false, error: "Hizmet bulunamadı." };
  } else {
    const [{ n }] = await db.select({ n: count() }).from(services).where(eq(services.clinicId, clinic.id));
    await db.insert(services).values({ ...parsed.data, clinicId: clinic.id, sortOrder: n });
  }
  refresh();
  return { ok: true, message: id ? "Hizmet güncellendi." : "Hizmet eklendi." };
}

export async function deleteServiceAction(id: string): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.serviceId, id),
        eq(appointments.clinicId, clinic.id),
        gte(appointments.date, todayInIstanbul()),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ),
    );
  if (n > 0) {
    return { ok: false, error: `Bu hizmete ait ${n} yaklaşan randevu var. Silmek yerine pasifleştir.` };
  }
  await db.delete(services).where(and(eq(services.id, id), eq(services.clinicId, clinic.id)));
  refresh();
  return { ok: true, message: "Hizmet silindi." };
}

// ---------------- Ekip ----------------

export async function saveVetAction(id: string | null, input: z.input<typeof vetInput>): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const parsed = vetInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrors(parsed.error) };
  const db = await getDb();
  if (id) {
    const updated = await db
      .update(vets)
      .set(parsed.data)
      .where(and(eq(vets.id, id), eq(vets.clinicId, clinic.id)))
      .returning({ id: vets.id });
    if (updated.length === 0) return { ok: false, error: "Veteriner bulunamadı." };
  } else {
    const [{ n }] = await db.select({ n: count() }).from(vets).where(eq(vets.clinicId, clinic.id));
    await db.insert(vets).values({ ...parsed.data, clinicId: clinic.id, sortOrder: n });
  }
  refresh();
  return { ok: true, message: id ? "Bilgiler güncellendi." : "Veteriner eklendi." };
}

export async function deleteVetAction(id: string): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.vetId, id),
        eq(appointments.clinicId, clinic.id),
        gte(appointments.date, todayInIstanbul()),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ),
    );
  if (n > 0) {
    return { ok: false, error: `Bu veterinerin ${n} yaklaşan randevusu var. Silmek yerine pasifleştir.` };
  }
  await db.delete(vets).where(and(eq(vets.id, id), eq(vets.clinicId, clinic.id)));
  refresh();
  return { ok: true, message: "Veteriner silindi." };
}

// ---------------- Ayarlar ----------------

export async function saveClinicSettingsAction(input: ClinicSettingsInput): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const parsed = clinicSettingsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const workingHours = Object.fromEntries(
    WEEKDAYS.map(({ key }) => {
      const h = d.hours[key];
      return [
        key,
        h.closed
          ? null
          : { open: h.open, close: h.close, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null },
      ];
    }),
  ) as WeekHours;

  const db = await getDb();
  await db
    .update(clinics)
    .set({
      name: d.name,
      city: d.city,
      district: d.district,
      address: d.address,
      phone: d.phone,
      email: d.email,
      description: d.description,
      workingHours,
      closedDates: [...new Set(d.closedDates)].sort(),
      slotMinutes: d.slotMinutes,
      minNoticeMinutes: d.minNoticeMinutes,
      maxDaysAhead: d.maxDaysAhead,
      autoConfirm: d.autoConfirm,
      boardingEnabled: d.boardingEnabled,
      boardingCatCapacity: d.boardingCatCapacity,
      boardingDogCapacity: d.boardingDogCapacity,
      boardingCatPrice: d.boardingCatPrice,
      boardingDogPrice: d.boardingDogPrice,
      boardingNotes: d.boardingNotes,
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, clinic.id));
  refresh();
  revalidatePath(`/klinik/${clinic.slug}`);
  return { ok: true, message: "Ayarlar kaydedildi." };
}

// ---------------- Kullanıcılar ----------------

export async function addStaffUserAction(input: z.input<typeof staffUserInput>): Promise<PanelResult> {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const parsed = staffUserInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrors(parsed.error) };
  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existing.length) return { ok: false, error: CHECK, fieldErrors: { email: "Bu e-posta adresiyle bir hesap zaten var." } };
  await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    passwordHash: await hashPassword(parsed.data.password),
    clinicId: clinic.id,
  });
  refresh();
  return { ok: true, message: "Kullanıcı eklendi. Giriş bilgilerini kendisiyle paylaşabilirsin." };
}

export async function removeStaffUserAction(userId: string): Promise<PanelResult> {
  const { clinic, user } = await requireClinicUser({ adminOnly: true });
  if (userId === user.id) return { ok: false, error: "Kendi hesabını silemezsin." };
  const db = await getDb();
  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.clinicId, clinic.id)))
    .limit(1);
  if (!target) return { ok: false, error: "Kullanıcı bulunamadı." };
  if (target.role === "clinic_admin") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.clinicId, clinic.id), eq(users.role, "clinic_admin"), ne(users.id, userId)));
    if (n === 0) return { ok: false, error: "Klinikte en az bir yönetici kalmalı." };
  }
  await db.delete(users).where(eq(users.id, target.id));
  refresh();
  return { ok: true, message: "Kullanıcı kaldırıldı." };
}
