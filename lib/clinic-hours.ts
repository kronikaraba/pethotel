// Çalışma saati metinleri (klinik kartları ve detay sayfası için).
import type { WeekHours } from "./db/schema";
import { WEEKDAYS } from "./constants";
import { dayWindow } from "./booking/availability";
import { minutesToTime, nowInIstanbul } from "./time";

export type OpenStatus = { open: boolean; label: string };

export function openStatus(
  clinic: { workingHours: WeekHours; closedDates: string[] },
  now = nowInIstanbul(),
): OpenStatus {
  const w = dayWindow(clinic.workingHours, now.date, clinic.closedDates);
  if (!w) return { open: false, label: "Bugün kapalı" };
  if (now.minutes < w.open) return { open: false, label: `Bugün açılış ${minutesToTime(w.open)}` };
  if (now.minutes >= w.close) return { open: false, label: "Bugünlük kapandı" };
  const lunch = w.breaks.find((b) => now.minutes >= b.start && now.minutes < b.end);
  if (lunch) return { open: false, label: `Öğle arası, dönüş ${minutesToTime(lunch.end)}` };
  return { open: true, label: `Açık, kapanış ${minutesToTime(w.close)}` };
}

type Day = WeekHours[keyof WeekHours];

function dayKey(day: Day): string {
  if (!day) return "kapali";
  return `${day.open}-${day.close}-${day.breakStart ?? ""}-${day.breakEnd ?? ""}`;
}

/** Aynı saatlere sahip ardışık günleri gruplar: "Pazartesi – Cuma: 09:00–19:00" */
export function weekSummary(
  hours: WeekHours,
): { days: string; hours: string; breakText: string | null; closed: boolean }[] {
  const rows: { from: string; to: string; key: string; day: Day }[] = [];
  for (const d of WEEKDAYS) {
    const key = dayKey(hours[d.key]);
    const last = rows[rows.length - 1];
    if (last && last.key === key) last.to = d.label;
    else rows.push({ from: d.label, to: d.label, key, day: hours[d.key] });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? r.from : `${r.from} – ${r.to}`,
    hours: r.day ? `${r.day.open}–${r.day.close}` : "Kapalı",
    breakText: r.day?.breakStart && r.day.breakEnd ? `Öğle arası ${r.day.breakStart}–${r.day.breakEnd}` : null,
    closed: !r.day,
  }));
}
