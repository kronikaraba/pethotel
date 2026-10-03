// Randevu oluşturma, müsaitlik sorgulama ve iptal işlemleri.
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb, type Queryable } from "../db";
import { appointments, clinics, services, vets, type Appointment, type Clinic } from "../db/schema";
import {
  ACTIVE_APPOINTMENT_STATUSES,
  CANCEL_CUTOFF_MINUTES,
  type AppointmentStatus,
  type PetSpecies,
} from "../constants";
import { computeSlots, pickVet, type Interval, type Slot } from "./availability";
import { BookingError } from "./errors";
import { generateBookingCode } from "./codes";
import { addDays, diffDays, minutesToTime, nowInIstanbul } from "../time";

type BusyRow = { vetId: string | null; startMinute: number; endMinute: number };

async function loadBusy(q: Queryable, clinicId: string, date: string): Promise<BusyRow[]> {
  return q
    .select({ vetId: appointments.vetId, startMinute: appointments.startMinute, endMinute: appointments.endMinute })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.date, date),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ),
    );
}

export function busyByVet(rows: BusyRow[]): Map<string, Interval[]> {
  const map = new Map<string, Interval[]>();
  for (const r of rows) {
    if (!r.vetId) continue;
    const list = map.get(r.vetId) ?? [];
    list.push({ start: r.startMinute, end: r.endMinute });
    map.set(r.vetId, list);
  }
  return map;
}

export async function getActiveVets(q: Queryable, clinicId: string) {
  return q
    .select()
    .from(vets)
    .where(and(eq(vets.clinicId, clinicId), eq(vets.isActive, true)))
    .orderBy(asc(vets.sortOrder), asc(vets.name));
}

export async function getActiveServices(q: Queryable, clinicId: string) {
  return q
    .select()
    .from(services)
    .where(and(eq(services.clinicId, clinicId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export type SlotOption = { start: number; end: number; label: string; vetIds: string[] };

export type BookingMode = "online" | "clinic";

/** Kliniğin kurallarını booking moduna göre ayarlar: klinik kendi girişinde ileri tarih/son dakika sınırına takılmaz. */
function rulesFor(clinic: Clinic, mode: BookingMode) {
  return {
    minNoticeMinutes: mode === "clinic" ? 0 : clinic.minNoticeMinutes,
    maxDaysAhead: mode === "clinic" ? 365 : clinic.maxDaysAhead,
  };
}

/** Bir gün için seçilen hizmete göre boş saatler. */
export async function getAvailableSlots(params: {
  clinic: Clinic;
  serviceId: string;
  date: string;
  vetId?: string | null;
  mode?: BookingMode;
}): Promise<SlotOption[]> {
  const db = await getDb();
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, params.serviceId), eq(services.clinicId, params.clinic.id), eq(services.isActive, true)))
    .limit(1);
  if (!service) throw new BookingError("SERVICE_NOT_FOUND");

  const vetRows = await getActiveVets(db, params.clinic.id);
  const selected = params.vetId ? vetRows.filter((v) => v.id === params.vetId) : vetRows;
  if (params.vetId && selected.length === 0) throw new BookingError("VET_NOT_FOUND");

  const busy = busyByVet(await loadBusy(db, params.clinic.id, params.date));
  const rules = rulesFor(params.clinic, params.mode ?? "online");
  const slots = computeSlots({
    date: params.date,
    now: nowInIstanbul(),
    hours: params.clinic.workingHours,
    closedDates: params.clinic.closedDates,
    slotMinutes: params.clinic.slotMinutes,
    durationMinutes: service.durationMinutes,
    vets: selected.map((v) => ({ id: v.id, busy: busy.get(v.id) ?? [] })),
    ...rules,
  });
  return slots.map((s: Slot) => ({ ...s, label: minutesToTime(s.start) }));
}

/**
 * `after` tarihinden sonraki ilk boş günü bulur (en fazla `days` gün ileri).
 * Tüm aralığın randevuları tek sorguda okunur.
 */
export async function findNextAvailableDate(params: {
  clinic: Clinic;
  serviceId: string;
  after: string;
  vetId?: string | null;
  mode?: BookingMode;
  days?: number;
}): Promise<string | null> {
  const db = await getDb();
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, params.serviceId), eq(services.clinicId, params.clinic.id), eq(services.isActive, true)))
    .limit(1);
  if (!service) return null;
  const vetRows = await getActiveVets(db, params.clinic.id);
  const selected = params.vetId ? vetRows.filter((v) => v.id === params.vetId) : vetRows;
  if (selected.length === 0) return null;

  const from = addDays(params.after, 1);
  const to = addDays(params.after, params.days ?? 21);
  const rows = await db
    .select({ vetId: appointments.vetId, date: appointments.date, startMinute: appointments.startMinute, endMinute: appointments.endMinute })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, params.clinic.id),
        gte(appointments.date, from),
        lte(appointments.date, to),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ),
    );

  const now = nowInIstanbul();
  const rules = rulesFor(params.clinic, params.mode ?? "online");
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const busy = busyByVet(rows.filter((r) => r.date === date));
    const slots = computeSlots({
      date,
      now,
      hours: params.clinic.workingHours,
      closedDates: params.clinic.closedDates,
      slotMinutes: params.clinic.slotMinutes,
      durationMinutes: service.durationMinutes,
      vets: selected.map((v) => ({ id: v.id, busy: busy.get(v.id) ?? [] })),
      ...rules,
    });
    if (slots.length > 0) return date;
  }
  return null;
}

export type NewAppointmentInput = {
  clinicId: string;
  serviceId: string;
  vetId?: string | null;
  date: string;
  startMinute: number;
  petName: string;
  petSpecies: PetSpecies;
  petBreed?: string | null;
  petAge?: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  notes?: string | null;
  mode: BookingMode;
};

/**
 * Randevuyu oluşturur. Aynı klinikte eşzamanlı istekler klinik satırı kilitlenerek sıraya alınır;
 * böylece aynı saate iki randevu yazılamaz.
 */
export async function createAppointment(input: NewAppointmentInput): Promise<Appointment> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [clinic] = await tx.select().from(clinics).where(eq(clinics.id, input.clinicId)).for("update");
    if (!clinic) throw new BookingError("CLINIC_NOT_FOUND");
    if (input.mode === "online" && clinic.status !== "active") throw new BookingError("CLINIC_NOT_FOUND");
    if (clinic.status === "suspended") throw new BookingError("CLINIC_NOT_FOUND");

    const [service] = await tx
      .select()
      .from(services)
      .where(and(eq(services.id, input.serviceId), eq(services.clinicId, clinic.id), eq(services.isActive, true)))
      .limit(1);
    if (!service) throw new BookingError("SERVICE_NOT_FOUND");

    const vetRows = await getActiveVets(tx, clinic.id);
    if (input.vetId && !vetRows.some((v) => v.id === input.vetId)) throw new BookingError("VET_NOT_FOUND");

    const busyRows = await loadBusy(tx, clinic.id, input.date);
    const busy = busyByVet(busyRows);
    const candidates = (input.vetId ? vetRows.filter((v) => v.id === input.vetId) : vetRows).map((v) => ({
      id: v.id,
      busy: busy.get(v.id) ?? [],
    }));

    const slot = computeSlots({
      date: input.date,
      now: nowInIstanbul(),
      hours: clinic.workingHours,
      closedDates: clinic.closedDates,
      slotMinutes: clinic.slotMinutes,
      durationMinutes: service.durationMinutes,
      vets: candidates,
      ...rulesFor(clinic, input.mode),
    }).find((s) => s.start === input.startMinute);
    if (!slot) throw new BookingError("SLOT_TAKEN");

    const load = new Map<string, number>();
    for (const r of busyRows) if (r.vetId) load.set(r.vetId, (load.get(r.vetId) ?? 0) + 1);
    const vetId = input.vetId ?? pickVet(slot.vetIds, vetRows.map((v) => v.id), load);
    const vet = vetRows.find((v) => v.id === vetId)!;

    const code = await uniqueAppointmentCode(tx);
    const status: AppointmentStatus = input.mode === "clinic" || clinic.autoConfirm ? "confirmed" : "pending";

    const [row] = await tx
      .insert(appointments)
      .values({
        code,
        clinicId: clinic.id,
        serviceId: service.id,
        vetId: vet.id,
        serviceName: service.name,
        vetName: vet.name,
        price: service.price,
        date: input.date,
        startMinute: slot.start,
        endMinute: slot.end,
        status,
        source: input.mode,
        petName: input.petName,
        petSpecies: input.petSpecies,
        petBreed: input.petBreed || null,
        petAge: input.petAge || null,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        ownerEmail: input.ownerEmail || null,
        notes: input.notes || null,
        consentAt: input.mode === "online" ? new Date() : null,
      })
      .returning();
    return row;
  });
}

async function uniqueAppointmentCode(q: Queryable): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateBookingCode("R");
    const exists = await q.select({ id: appointments.id }).from(appointments).where(eq(appointments.code, code)).limit(1);
    if (exists.length === 0) return code;
  }
  throw new Error("Randevu kodu üretilemedi");
}

/** Müşteri randevusunu çevrim içi iptal edebilir mi? */
export function canCustomerCancelAppointment(
  a: Pick<Appointment, "status" | "date" | "startMinute">,
  now = nowInIstanbul(),
): boolean {
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(a.status)) return false;
  const minutesUntil = diffDays(now.date, a.date) * 1440 + a.startMinute - now.minutes;
  return minutesUntil >= CANCEL_CUTOFF_MINUTES;
}

export async function cancelAppointmentByCustomer(code: string): Promise<Appointment> {
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.code, code)).limit(1);
  if (!a) throw new BookingError("NOT_FOUND");
  if (!canCustomerCancelAppointment(a)) throw new BookingError("NOT_CANCELLABLE");
  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled", cancelledBy: "customer", updatedAt: new Date() })
    .where(and(eq(appointments.id, a.id), inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES)))
    .returning();
  if (!updated) throw new BookingError("NOT_CANCELLABLE");
  return updated;
}
