// Ziyaretçiye açık sayfaların veri sorguları.
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../db";
import { appointments, clinics, services, vets, type Clinic, type Service, type Vet } from "../db/schema";
import { ACTIVE_APPOINTMENT_STATUSES, type ServiceCategory } from "../constants";
import { computeSlots, type Interval } from "../booking/availability";
import { addDays, minutesToTime, nowInIstanbul } from "../time";
import { foldTr } from "../format";
import { getCoverPhotos, listClinicPhotos, type PhotoMeta } from "./photos";

export async function getActiveClinicBySlug(slug: string): Promise<Clinic | null> {
  const db = await getDb();
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(and(eq(clinics.slug, slug), eq(clinics.status, "active")))
    .limit(1);
  return clinic ?? null;
}

export async function getClinicPageData(slug: string) {
  const clinic = await getActiveClinicBySlug(slug);
  if (!clinic) return null;
  const db = await getDb();
  const [serviceRows, vetRows, photos] = await Promise.all([
    db
      .select()
      .from(services)
      .where(and(eq(services.clinicId, clinic.id), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db
      .select()
      .from(vets)
      .where(and(eq(vets.clinicId, clinic.id), eq(vets.isActive, true)))
      .orderBy(asc(vets.sortOrder), asc(vets.name)),
    listClinicPhotos(db, clinic.id),
  ]);
  return { clinic, services: serviceRows, vets: vetRows, photos };
}

export async function getCityStats(): Promise<{ city: string; clinics: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({ city: clinics.city, clinics: count() })
    .from(clinics)
    .where(eq(clinics.status, "active"))
    .groupBy(clinics.city)
    .orderBy(desc(count()), asc(clinics.city));
  return rows;
}

export async function getDistricts(city: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ district: clinics.district })
    .from(clinics)
    .where(and(eq(clinics.status, "active"), eq(clinics.city, city)));
  return rows.map((r) => r.district).sort((a, b) => a.localeCompare(b, "tr"));
}

export type NextSlot = {
  serviceId: string;
  serviceName: string;
  date: string;
  times: { start: number; label: string }[];
};

export type ClinicListItem = {
  clinic: Clinic;
  categories: ServiceCategory[];
  minPrice: number | null;
  vetCount: number;
  next: NextSlot | null;
  /** Kapak fotoğrafı; yoksa kartta renkli yer tutucu gösterilir. */
  cover: PhotoMeta | null;
};

/** Her klinik için önümüzdeki günlerdeki ilk boş saat(ler). 3 sorguda toplu hesaplanır. */
async function enrich(
  rows: Clinic[],
  opts: { category?: ServiceCategory; days?: number; perClinic?: number } = {},
): Promise<ClinicListItem[]> {
  if (rows.length === 0) return [];
  const db = await getDb();
  const ids = rows.map((c) => c.id);
  const now = nowInIstanbul();
  const days = opts.days ?? 7;
  const until = addDays(now.date, days);

  const [svcRows, vetRows, busyRows, covers] = await Promise.all([
    db
      .select()
      .from(services)
      .where(and(inArray(services.clinicId, ids), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db
      .select()
      .from(vets)
      .where(and(inArray(vets.clinicId, ids), eq(vets.isActive, true)))
      .orderBy(asc(vets.sortOrder)),
    db
      .select({
        clinicId: appointments.clinicId,
        vetId: appointments.vetId,
        date: appointments.date,
        startMinute: appointments.startMinute,
        endMinute: appointments.endMinute,
      })
      .from(appointments)
      .where(
        and(
          inArray(appointments.clinicId, ids),
          gte(appointments.date, now.date),
          lte(appointments.date, until),
          inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
        ),
      ),
    getCoverPhotos(db, ids),
  ]);

  return rows.map((clinic) => {
    const clinicServices = svcRows.filter((s) => s.clinicId === clinic.id);
    const clinicVets = vetRows.filter((v) => v.clinicId === clinic.id);
    const categories = [...new Set(clinicServices.map((s) => s.category))];
    const prices = clinicServices.map((s) => s.price).filter((p): p is number => p !== null);

    const service = pickDisplayService(clinicServices, opts.category);
    let next: NextSlot | null = null;
    if (service && clinicVets.length > 0) {
      for (let i = 0; i <= Math.min(days, clinic.maxDaysAhead); i++) {
        const date = addDays(now.date, i);
        const busy = new Map<string, Interval[]>();
        for (const r of busyRows) {
          if (r.clinicId !== clinic.id || r.date !== date || !r.vetId) continue;
          busy.set(r.vetId, [...(busy.get(r.vetId) ?? []), { start: r.startMinute, end: r.endMinute }]);
        }
        const slots = computeSlots({
          date,
          now,
          hours: clinic.workingHours,
          closedDates: clinic.closedDates,
          slotMinutes: clinic.slotMinutes,
          minNoticeMinutes: clinic.minNoticeMinutes,
          maxDaysAhead: clinic.maxDaysAhead,
          durationMinutes: service.durationMinutes,
          vets: clinicVets.map((v) => ({ id: v.id, busy: busy.get(v.id) ?? [] })),
        });
        if (slots.length > 0) {
          next = {
            serviceId: service.id,
            serviceName: service.name,
            date,
            times: slots.slice(0, opts.perClinic ?? 1).map((s) => ({ start: s.start, label: minutesToTime(s.start) })),
          };
          break;
        }
      }
    }

    return {
      clinic,
      categories,
      minPrice: prices.length ? Math.min(...prices) : null,
      vetCount: clinicVets.length,
      next,
      cover: covers.get(clinic.id) ?? null,
    };
  });
}

function pickDisplayService(list: Service[], category?: ServiceCategory): Service | undefined {
  if (category) {
    const match = list.find((s) => s.category === category);
    if (match) return match;
  }
  return list.find((s) => s.category === "muayene") ?? list[0];
}

export type ClinicFilters = {
  city?: string;
  district?: string;
  category?: ServiceCategory;
  boarding?: boolean;
  q?: string;
};

export async function searchClinics(filters: ClinicFilters): Promise<ClinicListItem[]> {
  const db = await getDb();
  const conds = [eq(clinics.status, "active")];
  if (filters.city) conds.push(eq(clinics.city, filters.city));
  if (filters.district) conds.push(eq(clinics.district, filters.district));
  if (filters.boarding) conds.push(eq(clinics.boardingEnabled, true));
  if (filters.category) {
    conds.push(
      inArray(
        clinics.id,
        db
          .select({ id: services.clinicId })
          .from(services)
          .where(and(eq(services.category, filters.category), eq(services.isActive, true))),
      ),
    );
  }
  let rows = await db.select().from(clinics).where(and(...conds)).orderBy(asc(clinics.name)).limit(500);

  // Arama Türkçe karakterlere duyarsız yapılır: "kadikoy" ile "Kadıköy" eşleşir.
  if (filters.q) {
    const needle = foldTr(filters.q.trim());
    rows = rows.filter((c) => foldTr(`${c.name} ${c.district} ${c.city}`).includes(needle));
  }

  const items = await enrich(rows, { category: filters.category });
  return items.sort((a, b) => {
    if (a.next && b.next) {
      if (a.next.date !== b.next.date) return a.next.date < b.next.date ? -1 : 1;
      return a.next.times[0].start - b.next.times[0].start;
    }
    if (a.next) return -1;
    if (b.next) return 1;
    return a.clinic.name.localeCompare(b.clinic.name, "tr");
  });
}

/** Ana sayfadaki "boş saatler" listesi: en erken boşluğu olan klinikler. */
export async function getUpcomingSlots(opts: { city?: string; limit?: number } = {}): Promise<ClinicListItem[]> {
  const db = await getDb();
  const conds = [eq(clinics.status, "active")];
  if (opts.city) conds.push(eq(clinics.city, opts.city));
  const rows = await db.select().from(clinics).where(and(...conds)).limit(60);
  const items = await enrich(rows, { perClinic: 4, days: 3 });
  return items
    .filter((i) => i.next)
    .sort((a, b) =>
      a.next!.date === b.next!.date ? a.next!.times[0].start - b.next!.times[0].start : a.next!.date < b.next!.date ? -1 : 1,
    )
    .slice(0, opts.limit ?? 4);
}

export async function getPlatformCounts() {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(clinics).where(eq(clinics.status, "active"));
  const [boarding] = await db
    .select({ n: count() })
    .from(clinics)
    .where(and(eq(clinics.status, "active"), eq(clinics.boardingEnabled, true)));
  return { clinics: row.n, boardingClinics: boarding.n };
}

export type { Clinic, Service, Vet };
