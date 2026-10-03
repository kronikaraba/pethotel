// Müsaitlik hesapları. Saf fonksiyonlardır: veritabanına dokunmaz, birim testle doğrulanır.
import type { DayHours, WeekHours } from "../db/schema";
import type { WeekdayKey } from "../constants";
import { addDays, diffDays, timeToMinutes, weekdayOf } from "../time";

export type Interval = { start: number; end: number };

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function hoursForDay(hours: WeekHours, date: string): DayHours {
  return hours[String(weekdayOf(date)) as WeekdayKey] ?? null;
}

export type DayWindow = { open: number; close: number; breaks: Interval[] };

/** Kliniğin o günkü açık olduğu aralık; kapalıysa null. */
export function dayWindow(hours: WeekHours, date: string, closedDates: string[] = []): DayWindow | null {
  if (closedDates.includes(date)) return null;
  const day = hoursForDay(hours, date);
  if (!day) return null;
  const open = timeToMinutes(day.open);
  const close = timeToMinutes(day.close);
  if (!(close > open)) return null;
  const breaks: Interval[] = [];
  if (day.breakStart && day.breakEnd) {
    const b = { start: timeToMinutes(day.breakStart), end: timeToMinutes(day.breakEnd) };
    if (b.end > b.start) breaks.push(b);
  }
  return { open, close, breaks };
}

export function isOpenOn(hours: WeekHours, date: string, closedDates: string[] = []): boolean {
  return dayWindow(hours, date, closedDates) !== null;
}

/** Tarih, bugünden itibaren rezervasyon penceresinin içinde mi? */
export function isWithinBookingWindow(date: string, today: string, maxDaysAhead: number): boolean {
  const d = diffDays(today, date);
  return d >= 0 && d <= maxDaysAhead;
}

export type SlotRequest = {
  date: string;
  now: { date: string; minutes: number };
  hours: WeekHours;
  closedDates: string[];
  slotMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  durationMinutes: number;
  /** Uygun veterinerler ve o günkü dolu aralıkları. */
  vets: { id: string; busy: Interval[] }[];
};

export type Slot = { start: number; end: number; vetIds: string[] };

/** O gün için seçilen hizmete uygun boş başlangıç saatleri. */
export function computeSlots(req: SlotRequest): Slot[] {
  if (!isWithinBookingWindow(req.date, req.now.date, req.maxDaysAhead)) return [];
  const day = dayWindow(req.hours, req.date, req.closedDates);
  if (!day || req.vets.length === 0 || req.durationMinutes <= 0) return [];

  const step = Math.max(5, req.slotMinutes);
  const earliest = req.date === req.now.date ? req.now.minutes + req.minNoticeMinutes : -Infinity;
  const slots: Slot[] = [];

  for (let start = day.open; start + req.durationMinutes <= day.close; start += step) {
    if (start < earliest) continue;
    const candidate = { start, end: start + req.durationMinutes };
    if (day.breaks.some((b) => overlaps(b, candidate))) continue;
    const vetIds = req.vets
      .filter((v) => !v.busy.some((b) => overlaps(b, candidate)))
      .map((v) => v.id);
    if (vetIds.length > 0) slots.push({ ...candidate, vetIds });
  }
  return slots;
}

/** "Fark etmez" seçildiğinde: o gün en az randevusu olan veteriner (eşitlikte listedeki sıra). */
export function pickVet(candidateIds: string[], orderedVetIds: string[], dayLoad: Map<string, number>): string {
  const ranked = [...candidateIds].sort((a, b) => {
    const load = (dayLoad.get(a) ?? 0) - (dayLoad.get(b) ?? 0);
    if (load !== 0) return load;
    return orderedVetIds.indexOf(a) - orderedVetIds.indexOf(b);
  });
  return ranked[0];
}

// ---------------- Pet otel ----------------

/** Konaklanan gecelerin tarihleri: giriş günü dahil, çıkış günü hariç. */
export function stayNights(checkIn: string, checkOut: string): string[] {
  const n = diffDays(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

export type NightOccupancy = { date: string; used: number; free: number };

export function boardingOccupancy(params: {
  checkIn: string;
  checkOut: string;
  capacity: number;
  existing: { checkIn: string; checkOut: string }[];
}): { nights: NightOccupancy[]; minFree: number; available: boolean } {
  const nights = stayNights(params.checkIn, params.checkOut).map((date) => {
    const used = params.existing.filter((r) => r.checkIn <= date && date < r.checkOut).length;
    return { date, used, free: Math.max(0, params.capacity - used) };
  });
  const minFree = nights.length ? Math.min(...nights.map((n) => n.free)) : 0;
  return { nights, minFree, available: nights.length > 0 && minFree > 0 };
}

export type StayProblem =
  | "INVALID_DATES"
  | "PAST"
  | "TOO_FAR"
  | "TOO_LONG"
  | "CHECKIN_CLOSED"
  | "CHECKOUT_CLOSED";

export const STAY_PROBLEM_MESSAGES: Record<StayProblem, string> = {
  INVALID_DATES: "Çıkış tarihi giriş tarihinden sonra olmalı.",
  PAST: "Giriş tarihi bugünden önce olamaz.",
  TOO_FAR: "En fazla 6 ay sonrası için konaklama isteyebilirsin.",
  TOO_LONG: "Tek seferde en fazla 30 gece konaklama isteyebilirsin.",
  CHECKIN_CLOSED: "Klinik giriş gününde kapalı. Başka bir giriş tarihi seç.",
  CHECKOUT_CLOSED: "Klinik çıkış gününde kapalı. Başka bir çıkış tarihi seç.",
};

export function validateStay(params: {
  checkIn: string;
  checkOut: string;
  today: string;
  hours: WeekHours;
  closedDates: string[];
  maxNights: number;
  maxDaysAhead: number;
}): StayProblem | null {
  const nights = diffDays(params.checkIn, params.checkOut);
  if (nights < 1) return "INVALID_DATES";
  if (diffDays(params.today, params.checkIn) < 0) return "PAST";
  if (diffDays(params.today, params.checkIn) > params.maxDaysAhead) return "TOO_FAR";
  if (nights > params.maxNights) return "TOO_LONG";
  if (!isOpenOn(params.hours, params.checkIn, params.closedDates)) return "CHECKIN_CLOSED";
  if (!isOpenOn(params.hours, params.checkOut, params.closedDates)) return "CHECKOUT_CLOSED";
  return null;
}
