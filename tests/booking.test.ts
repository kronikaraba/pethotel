// Veritabanı ile uçtan uca rezervasyon testleri (bellek içi PGlite).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

// Varsayılan: bellek içi PGlite. TEST_DATABASE_URL verilirse gerçek Postgres sürücüsü (pg) test edilir.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.SEED_DEMO_DATA = "true";
} else {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  delete process.env.POSTGRES_URL;
}

const { getDb, closeDb } = await import("@/lib/db");
const { clinics, services, vets, appointments, boardingReservations } = await import("@/lib/db/schema");
const { createAppointment, getAvailableSlots, cancelAppointmentByCustomer } = await import("@/lib/booking/appointments");
const { createBoardingReservation, getBoardingQuote } = await import("@/lib/booking/boarding");
const { BookingError } = await import("@/lib/booking/errors");
const { addDays, todayInIstanbul } = await import("@/lib/time");
const { isOpenOn } = await import("@/lib/booking/availability");

type Clinic = typeof clinics.$inferSelect;

let clinic: Clinic;
let hotel: Clinic;
let catHotel: Clinic;
let sitter: Clinic;
let serviceId: string;
let vetIds: string[];

/** Bugünden en az `offset` gün sonraki ilk açık gün. */
function openDayFrom(c: Clinic, offset: number): string {
  for (let i = offset; i < offset + 14; i++) {
    const d = addDays(todayInIstanbul(), i);
    if (isOpenOn(c.workingHours, d, c.closedDates)) return d;
  }
  throw new Error("açık gün bulunamadı");
}

const owner = {
  petName: "Test",
  petSpecies: "cat" as const,
  ownerName: "Test Kullanıcı",
  ownerPhone: "+905320000000",
};

beforeAll(async () => {
  const db = await getDb();
  [clinic] = await db.select().from(clinics).where(eq(clinics.slug, "moda-pati-veteriner"));
  const svc = await db.select().from(services).where(eq(services.clinicId, clinic.id));
  serviceId = svc.find((s) => s.name === "Genel muayene")!.id;
  vetIds = (await db.select().from(vets).where(eq(vets.clinicId, clinic.id))).map((v) => v.id);
  [hotel] = await db.select().from(clinics).where(eq(clinics.slug, "kadikoy-patili-pet-otel"));
  [catHotel] = await db.select().from(clinics).where(eq(clinics.slug, "cankaya-mirmir-kedi-oteli"));
  [sitter] = await db.select().from(clinics).where(eq(clinics.slug, "deniz-yalcin-pet-sitter"));
}, 60_000);

afterAll(async () => {
  await closeDb();
});

describe("demo veriler", () => {
  it("klinikler, hizmetler ve veterinerler yüklenir", () => {
    expect(clinic).toBeTruthy();
    expect(clinic.isDemo).toBe(true);
    expect(vetIds.length).toBe(2);
  });
});

describe("hesap türleri", () => {
  it("demo veride üç hesap türü de bulunur", () => {
    expect(clinic.kind).toBe("vet");
    expect(clinic.boardingEnabled).toBe(false);
    expect(hotel.kind).toBe("hotel");
    expect(hotel.boardingEnabled).toBe(true);
    expect(sitter.kind).toBe("sitter");
  });

  it("arama yalnızca seçilen türdeki hesapları getirir", async () => {
    const { searchClinics } = await import("@/lib/data/public");
    for (const kind of ["vet", "hotel", "sitter"] as const) {
      const items = await searchClinics({ kind });
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.clinic.kind === kind)).toBe(true);
    }
    const sitters = await searchClinics({ kind: "sitter", category: "gezdirme" });
    expect(sitters.map((i) => i.clinic.slug)).toContain("deniz-yalcin-pet-sitter");
  });

  it("veteriner konaklama, otel randevu almaz", async () => {
    const checkIn = openDayFrom(clinic, 20);
    await expect(
      createBoardingReservation({
        clinicId: clinic.id,
        species: "cat",
        checkIn,
        checkOut: addDays(checkIn, 2),
        petName: "x",
        vaccinated: true,
        ownerName: "Test",
        ownerPhone: "+905320000000",
      }),
    ).rejects.toMatchObject({ code: "BOARDING_DISABLED" });
    await expect(
      createAppointment({ ...owner, clinicId: hotel.id, serviceId, date: openDayFrom(hotel, 3), startMinute: 600, mode: "online" }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("pet sitter ziyareti tek kişilik takvimle alınır", async () => {
    const db = await getDb();
    const [svc] = await db.select().from(services).where(eq(services.clinicId, sitter.id));
    const date = openDayFrom(sitter, 3);
    const slots = await getAvailableSlots({ clinic: sitter, serviceId: svc.id, date });
    expect(slots.length).toBeGreaterThan(0);
    const appt = await createAppointment({ ...owner, clinicId: sitter.id, serviceId: svc.id, vetId: null, date, startMinute: slots[0].start, mode: "online" });
    expect(appt.code).toBeTruthy();
  });
});

describe("randevu", () => {
  it("aynı saate aynı veteriner için yalnızca bir randevu yazılır (eşzamanlı istek)", async () => {
    const date = openDayFrom(clinic, 3);
    const slots = await getAvailableSlots({ clinic, serviceId, date, vetId: vetIds[0] });
    expect(slots.length).toBeGreaterThan(0);
    const start = slots[0].start;

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        createAppointment({ ...owner, clinicId: clinic.id, serviceId, vetId: vetIds[0], date, startMinute: start, mode: "online" }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(4);
    for (const f of failed) {
      expect(f.reason).toBeInstanceOf(BookingError);
      expect(f.reason.code).toBe("SLOT_TAKEN");
    }
  });

  it("'fark etmez' seçiminde boş veteriner sayısı kadar randevu kabul edilir", async () => {
    const date = openDayFrom(clinic, 4);
    const slots = await getAvailableSlots({ clinic, serviceId, date });
    const start = slots[2].start;
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        createAppointment({ ...owner, clinicId: clinic.id, serviceId, vetId: null, date, startMinute: start, mode: "online" }),
      ),
    );
    const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ vetId: string | null }>[];
    expect(ok).toHaveLength(2);
    expect(new Set(ok.map((r) => r.value.vetId)).size).toBe(2);

    const after = await getAvailableSlots({ clinic, serviceId, date });
    expect(after.some((s) => s.start === start)).toBe(false);
  });

  it("iptal edilen randevunun saati yeniden boşa çıkar", async () => {
    const date = openDayFrom(clinic, 5);
    const [slot] = await getAvailableSlots({ clinic, serviceId, date, vetId: vetIds[1] });
    const a = await createAppointment({
      ...owner,
      clinicId: clinic.id,
      serviceId,
      vetId: vetIds[1],
      date,
      startMinute: slot.start,
      mode: "online",
    });
    expect(a.code).toMatch(/^R-[A-Z2-9]{6}$/);
    expect(a.status).toBe("confirmed");

    let free = await getAvailableSlots({ clinic, serviceId, date, vetId: vetIds[1] });
    expect(free.some((s) => s.start === slot.start)).toBe(false);

    const cancelled = await cancelAppointmentByCustomer(a.code);
    expect(cancelled.status).toBe("cancelled");
    free = await getAvailableSlots({ clinic, serviceId, date, vetId: vetIds[1] });
    expect(free.some((s) => s.start === slot.start)).toBe(true);
  });

  it("çalışma saatleri dışındaki bir saat reddedilir", async () => {
    const date = openDayFrom(clinic, 3);
    await expect(
      createAppointment({ ...owner, clinicId: clinic.id, serviceId, date, startMinute: 3 * 60, mode: "online" }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN" });
  });
});

describe("pet otel", () => {
  it("kapasite dolunca yeni konaklama kabul edilmez", async () => {
    const checkIn = openDayFrom(hotel, 20);
    let checkOut = addDays(checkIn, 2);
    while (!isOpenOn(hotel.workingHours, checkOut, hotel.closedDates)) checkOut = addDays(checkOut, 1);

    const quote = await getBoardingQuote({ clinic: hotel, species: "dog", checkIn, checkOut });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    const free = quote.minFree;
    expect(free).toBe(hotel.boardingDogCapacity);

    const results = await Promise.allSettled(
      Array.from({ length: free + 2 }, (_, i) =>
        createBoardingReservation({
          clinicId: hotel.id,
          species: "dog",
          checkIn,
          checkOut,
          petName: `Köpek ${i}`,
          vaccinated: true,
          ownerName: "Test",
          ownerPhone: "+905320000000",
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(free);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(rejected.every((r) => r.reason.code === "BOARDING_FULL")).toBe(true);

    const db = await getDb();
    const rows = await db.select().from(boardingReservations).where(eq(boardingReservations.checkIn, checkIn));
    expect(rows.every((r) => r.status === "pending" && r.code.startsWith("K-"))).toBe(true);
  });

  it("kapalı güne giriş istenirse açıklayıcı hata verir", async () => {
    let sunday = addDays(todayInIstanbul(), 7);
    while (new Date(sunday).getUTCDay() !== 0) sunday = addDays(sunday, 1);
    const quote = await getBoardingQuote({ clinic: catHotel, species: "cat", checkIn: sunday, checkOut: addDays(sunday, 2) });
    expect(quote.ok).toBe(false);
    if (!quote.ok) expect(quote.problem).toBe("CHECKIN_CLOSED");
  });
});

describe("veri bütünlüğü", () => {
  it("bitiş saati başlangıçtan önce olan randevuyu veritabanı reddeder", async () => {
    const db = await getDb();
    await expect(
      db.insert(appointments).values({
        code: "R-BADROW",
        clinicId: clinic.id,
        serviceName: "x",
        date: "2026-12-01",
        startMinute: 600,
        endMinute: 590,
        petName: "x",
        petSpecies: "cat",
        ownerName: "x",
        ownerPhone: "+905320000000",
      }),
    ).rejects.toThrow();
  });
});

describe("eski demo verinin güncellenmesi", () => {
  // Son test: demo otel ve sitterları silip eski (yalnızca veteriner) demo veriyi taklit eder.
  it("eski demo veride veteriner otelleri kapanır, demo oteller ve sitterlar eklenir", async () => {
    const { upgradeDemoDataToKinds } = await import("@/lib/db/bootstrap");
    const { getDriver } = await import("@/lib/db");
    const { inArray } = await import("drizzle-orm");
    const db = await getDb();
    await db.delete(clinics).where(inArray(clinics.kind, ["hotel", "sitter"]));
    await db.update(clinics).set({ boardingEnabled: true }).where(eq(clinics.id, clinic.id));

    expect(await upgradeDemoDataToKinds(db, await getDriver())).toBe(true);
    const all = await db.select().from(clinics);
    expect(all.filter((c) => c.kind === "hotel").length).toBeGreaterThan(0);
    expect(all.filter((c) => c.kind === "sitter").length).toBeGreaterThan(0);
    expect(all.filter((c) => c.kind === "vet").every((c) => !c.boardingEnabled)).toBe(true);

    // İkinci çağrı bir şey yapmaz.
    expect(await upgradeDemoDataToKinds(db, await getDriver())).toBe(false);
  });
});
