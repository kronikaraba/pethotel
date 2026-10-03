// Tarih/saat yardımcıları. Tüm klinikler Türkiye saatinde (Europe/Istanbul) çalışır.
// Tarihler "YYYY-MM-DD" metni, saatler gece yarısından itibaren dakika olarak tutulur.

export const TIME_ZONE = "Europe/Istanbul";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Verilen andaki (varsayılan: şimdi) İstanbul tarihi ve dakikası. */
export function nowInIstanbul(at: Date = new Date()): { date: string; minutes: number } {
  const parts = partsFormatter.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export function todayInIstanbul(): string {
  return nowInIstanbul().date;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = parseDate(value);
  return !Number.isNaN(d.getTime()) && formatDateKey(d) === value;
}

/** "YYYY-MM-DD" → UTC gece yarısı Date nesnesi (yalnızca takvim hesabı için). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function formatDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const d = parseDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateKey(d);
}

/** b - a (gün). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

/** 0 = Pazar … 6 = Cumartesi */
export function weekdayOf(value: string): number {
  return parseDate(value).getUTCDay();
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

// ---------- Türkçe biçimlendirme ----------

const longFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
  weekday: "long",
});
const mediumFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  weekday: "long",
});
const shortFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const weekdayShortFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "UTC",
  weekday: "short",
});
const dayMonthFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
});

/** "5 Ekim 2026 Pazartesi" */
export function formatDateLong(value: string): string {
  return longFormatter.format(parseDate(value));
}

/** "5 Ekim Pazartesi" */
export function formatDateMedium(value: string): string {
  return mediumFormatter.format(parseDate(value));
}

/** "5 Eki" */
export function formatDateShort(value: string): string {
  return shortFormatter.format(parseDate(value));
}

/** "5 Ekim" */
export function formatDayMonth(value: string): string {
  return dayMonthFormatter.format(parseDate(value));
}

/** "Pzt" */
export function formatWeekdayShort(value: string): string {
  return weekdayShortFormatter.format(parseDate(value));
}

/** "Bugün", "Yarın", "Dün" ya da "5 Ekim Pazartesi" */
export function relativeDayLabel(value: string, today: string = todayInIstanbul()): string {
  const diff = diffDays(today, value);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  return formatDateMedium(value);
}

/** Cümle içinde kullanım: "bugün", "yarın", "dün" küçük harfle; tarihler olduğu gibi ("5 Ekim Pazartesi"). */
export function relativeDayWord(value: string, today: string = todayInIstanbul()): string {
  const label = relativeDayLabel(value, today);
  return label === "Bugün" || label === "Yarın" || label === "Dün" ? label.toLocaleLowerCase("tr-TR") : label;
}
