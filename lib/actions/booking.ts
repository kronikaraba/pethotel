"use server";
// Ziyaretçi işlemleri: randevu, konaklama talebi, rezervasyon sorgulama ve iptal.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAppointment, cancelAppointmentByCustomer } from "../booking/appointments";
import { createBoardingReservation, cancelBoardingByCustomer } from "../booking/boarding";
import { BookingError } from "../booking/errors";
import { normalizeBookingCode } from "../booking/codes";
import { getActiveClinicBySlug } from "../data/public";
import { findBookingByCode } from "../data/lookup";
import { canViewBooking, rememberBooking } from "../lookup";
import { rateLimit, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { timeToMinutes } from "../time";
import {
  appointmentInput,
  boardingInput,
  fieldErrors,
  lookupInput,
  type AppointmentInput,
  type BoardingInput,
} from "../validation";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };

const CHECK_FIELDS = "Lütfen işaretli alanları kontrol et.";
const UNEXPECTED = "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";

export async function bookAppointmentAction(input: AppointmentInput): Promise<ActionResult<{ code: string }>> {
  if (!(await rateLimit("book", 60, 10 * 60_000))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const parsed = appointmentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  // Aynı telefonla kısa sürede çok sayıda randevu (spam) engellenir.
  if (!(await rateLimit("book-phone", 6, 60 * 60_000, d.ownerPhone))) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const clinic = await getActiveClinicBySlug(d.clinicSlug);
  if (!clinic) return { ok: false, error: new BookingError("CLINIC_NOT_FOUND").message };

  try {
    const appointment = await createAppointment({
      clinicId: clinic.id,
      serviceId: d.serviceId,
      vetId: d.vetId,
      date: d.date,
      startMinute: timeToMinutes(d.time),
      petName: d.petName,
      petSpecies: d.petSpecies,
      petBreed: d.petBreed,
      petAge: d.petAge,
      ownerName: d.ownerName,
      ownerPhone: d.ownerPhone,
      ownerEmail: d.ownerEmail,
      notes: d.notes,
      mode: "online",
    });
    await rememberBooking(appointment.code);
    return { ok: true, data: { code: appointment.code } };
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.message, code: error.code };
    console.error("[randevu] oluşturulamadı", error);
    return { ok: false, error: UNEXPECTED };
  }
}

export async function requestBoardingAction(input: BoardingInput): Promise<ActionResult<{ code: string }>> {
  if (!(await rateLimit("boarding", 40, 10 * 60_000))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const parsed = boardingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (!(await rateLimit("boarding-phone", 6, 60 * 60_000, d.ownerPhone))) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const clinic = await getActiveClinicBySlug(d.clinicSlug);
  if (!clinic) return { ok: false, error: new BookingError("CLINIC_NOT_FOUND").message };

  try {
    const reservation = await createBoardingReservation({
      clinicId: clinic.id,
      species: d.species,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      petName: d.petName,
      petBreed: d.petBreed,
      petAge: d.petAge,
      vaccinated: d.vaccinated,
      ownerName: d.ownerName,
      ownerPhone: d.ownerPhone,
      ownerEmail: d.ownerEmail,
      notes: d.notes,
    });
    await rememberBooking(reservation.code);
    return { ok: true, data: { code: reservation.code } };
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.message, code: error.code };
    console.error("[konaklama] oluşturulamadı", error);
    return { ok: false, error: UNEXPECTED };
  }
}

export type LookupState = { error?: string; fieldErrors?: Record<string, string>; values?: { code: string; phone: string } };

export async function lookupBookingAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const values = { code: String(formData.get("code") ?? ""), phone: String(formData.get("phone") ?? "") };
  if (!(await rateLimit("lookup", 40, 10 * 60_000))) return { error: RATE_LIMIT_MESSAGE, values };

  const parsed = lookupInput.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const code = normalizeBookingCode(parsed.data.code);
  const booking = code ? await findBookingByCode(code) : null;
  // Kod ya da telefon hatalıysa aynı mesajı ver (hangi bilginin doğru olduğu sızmasın).
  if (!code || !booking || booking.record.ownerPhone !== parsed.data.phone) {
    return { error: "Bu kod ve telefon numarasıyla eşleşen bir rezervasyon bulamadık. Bilgileri kontrol et.", values };
  }
  await rememberBooking(code);
  redirect(`/rezervasyonum/${code}`);
}

export async function cancelBookingAction(rawCode: string): Promise<ActionResult> {
  const code = normalizeBookingCode(rawCode);
  if (!code || !(await canViewBooking(code))) {
    return { ok: false, error: "Bu rezervasyonu yönetme iznin yok. Kod ve telefonla tekrar giriş yap." };
  }
  try {
    if (code.startsWith("R-")) await cancelAppointmentByCustomer(code);
    else await cancelBoardingByCustomer(code);
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, error: error.message };
    console.error("[iptal] başarısız", error);
    return { ok: false, error: UNEXPECTED };
  }
  revalidatePath(`/rezervasyonum/${code}`);
  return { ok: true, data: undefined };
}
