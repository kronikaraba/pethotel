import { describe, expect, it } from "vitest";
import {
  boardingOccupancy,
  computeSlots,
  dayWindow,
  pickVet,
  stayNights,
  validateStay,
  type SlotRequest,
} from "@/lib/booking/availability";
import type { WeekHours } from "@/lib/db/schema";
import { addDays, diffDays, minutesToTime, nowInIstanbul, weekdayOf } from "@/lib/time";
import { formatPhone, normalizePhone, slugify } from "@/lib/format";
import { normalizeBookingCode } from "@/lib/booking/codes";

const day = { open: "09:00", close: "12:00", breakStart: null, breakEnd: null };
const hours: WeekHours = { "0": null, "1": day, "2": day, "3": day, "4": day, "5": day, "6": null };
// 2026-10-05 Pazartesi
const MONDAY = "2026-10-05";

function req(overrides: Partial<SlotRequest> = {}): SlotRequest {
  return {
    date: MONDAY,
    now: { date: "2026-10-03", minutes: 600 },
    hours,
    closedDates: [],
    slotMinutes: 30,
    minNoticeMinutes: 60,
    maxDaysAhead: 30,
    durationMinutes: 30,
    vets: [{ id: "a", busy: [] }],
    ...overrides,
  };
}

const labels = (slots: { start: number }[]) => slots.map((s) => minutesToTime(s.start));

describe("tarih yardımcıları", () => {
  it("haftanın gününü doğru bulur", () => {
    expect(weekdayOf("2026-10-03")).toBe(6); // Cumartesi
    expect(weekdayOf(MONDAY)).toBe(1);
  });
  it("ay ve yıl geçişlerinde gün ekler", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-10-30", "2026-11-02")).toBe(3);
  });
  it("İstanbul saatini UTC'den hesaplar (UTC+3)", () => {
    const n = nowInIstanbul(new Date("2026-10-03T22:30:00Z"));
    expect(n).toEqual({ date: "2026-10-04", minutes: 90 });
  });
});

describe("computeSlots", () => {
  it("açık saatler içinde adım aralığıyla saat üretir", () => {
    expect(labels(computeSlots(req()))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("hizmet süresi kapanışı aşmaz", () => {
    expect(labels(computeSlots(req({ durationMinutes: 60 })))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("öğle arasıyla çakışan saatleri çıkarır", () => {
    const withBreak: WeekHours = { ...hours, "1": { ...day, breakStart: "10:00", breakEnd: "11:00" } };
    expect(labels(computeSlots(req({ hours: withBreak })))).toEqual(["09:00", "09:30", "11:00", "11:30"]);
  });

  it("kapalı günde ve tatil gününde boş saat vermez", () => {
    expect(computeSlots(req({ date: "2026-10-04" }))).toEqual([]); // Pazar
    expect(computeSlots(req({ closedDates: [MONDAY] }))).toEqual([]);
  });

  it("geçmiş tarih ve rezervasyon penceresi dışını reddeder", () => {
    expect(computeSlots(req({ date: "2026-10-02" }))).toEqual([]);
    expect(computeSlots(req({ maxDaysAhead: 1 }))).toEqual([]);
  });

  it("bugün için en erken saat = şimdi + minimum bildirim süresi", () => {
    const slots = computeSlots(req({ now: { date: MONDAY, minutes: 9 * 60 + 10 }, minNoticeMinutes: 60 }));
    expect(labels(slots)).toEqual(["10:30", "11:00", "11:30"]);
  });

  it("dolu aralıklarla çakışan saatleri veterinere göre eler", () => {
    const slots = computeSlots(
      req({
        vets: [
          { id: "a", busy: [{ start: 600, end: 660 }] }, // 10:00-11:00
          { id: "b", busy: [{ start: 540, end: 570 }] }, // 09:00-09:30
        ],
      }),
    );
    const byLabel = Object.fromEntries(slots.map((s) => [minutesToTime(s.start), s.vetIds]));
    expect(byLabel["09:00"]).toEqual(["a"]);
    expect(byLabel["10:00"]).toEqual(["b"]);
    expect(byLabel["11:00"]).toEqual(["a", "b"]);
  });

  it("45 dakikalık randevu sonrası ara saatleri doğru açar", () => {
    const slots = computeSlots(
      req({ slotMinutes: 15, durationMinutes: 15, vets: [{ id: "a", busy: [{ start: 540, end: 585 }] }] }),
    );
    expect(labels(slots)[0]).toBe("09:45");
  });

  it("veteriner yoksa saat vermez", () => {
    expect(computeSlots(req({ vets: [] }))).toEqual([]);
  });
});

describe("pickVet", () => {
  it("o gün en az randevusu olanı seçer, eşitlikte sıraya bakar", () => {
    const load = new Map([["a", 3], ["b", 1], ["c", 1]]);
    expect(pickVet(["a", "b", "c"], ["c", "b", "a"], load)).toBe("c");
    expect(pickVet(["a", "b"], ["a", "b"], new Map())).toBe("a");
  });
});

describe("pet otel", () => {
  it("geceleri giriş dahil, çıkış hariç sayar", () => {
    expect(stayNights("2026-10-05", "2026-10-08")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });

  it("her gece için doluluğu hesaplar", () => {
    const occ = boardingOccupancy({
      checkIn: "2026-10-05",
      checkOut: "2026-10-08",
      capacity: 2,
      existing: [
        { checkIn: "2026-10-01", checkOut: "2026-10-06" }, // 5. gece dolu
        { checkIn: "2026-10-07", checkOut: "2026-10-10" }, // 7. gece dolu
        { checkIn: "2026-10-07", checkOut: "2026-10-09" }, // 7. gece dolu
      ],
    });
    expect(occ.nights.map((n) => n.used)).toEqual([1, 0, 2]);
    expect(occ.available).toBe(false);
    expect(occ.minFree).toBe(0);
  });

  it("konaklama tarihlerini doğrular", () => {
    const base = { today: "2026-10-03", hours, closedDates: [], maxNights: 30, maxDaysAhead: 180 };
    expect(validateStay({ ...base, checkIn: MONDAY, checkOut: "2026-10-07" })).toBeNull();
    expect(validateStay({ ...base, checkIn: MONDAY, checkOut: MONDAY })).toBe("INVALID_DATES");
    expect(validateStay({ ...base, checkIn: "2026-10-01", checkOut: MONDAY })).toBe("PAST");
    expect(validateStay({ ...base, checkIn: "2026-10-04", checkOut: MONDAY })).toBe("CHECKIN_CLOSED");
    expect(validateStay({ ...base, checkIn: MONDAY, checkOut: "2026-10-10" })).toBe("CHECKOUT_CLOSED");
    expect(validateStay({ ...base, checkIn: MONDAY, checkOut: "2026-11-30" })).toBe("TOO_LONG");
  });

  it("dayWindow geçersiz saatlerde kapalı sayar", () => {
    const broken: WeekHours = { ...hours, "1": { open: "12:00", close: "09:00" } };
    expect(dayWindow(broken, MONDAY)).toBeNull();
  });
});

describe("biçimlendirme", () => {
  it("telefon numaralarını standartlaştırır", () => {
    expect(normalizePhone("0532 123 45 67")).toBe("+905321234567");
    expect(normalizePhone("+90 (532) 123-4567")).toBe("+905321234567");
    expect(normalizePhone("5321234567")).toBe("+905321234567");
    expect(normalizePhone("0216 000 00 01")).toBe("+902160000001");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0132 123 45 67")).toBeNull();
    expect(formatPhone("+905321234567")).toBe("0532 123 45 67");
  });

  it("Türkçe karakterli adlardan bağlantı adı üretir", () => {
    expect(slugify("Çankaya Can Dost Veteriner Kliniği")).toBe("cankaya-can-dost-veteriner-klinigi");
    expect(slugify("  IŞIK & Ünal Pet ")).toBe("isik-unal-pet");
  });

  it("rezervasyon kodunu standartlaştırır", () => {
    expect(normalizeBookingCode("r 7k3m9q")).toBe("R-7K3M9Q");
    expect(normalizeBookingCode("k-4tq8zp")).toBe("K-4TQ8ZP");
    expect(normalizeBookingCode("X-123456")).toBeNull();
  });
});
