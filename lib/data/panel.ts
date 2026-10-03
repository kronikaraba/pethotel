// Klinik paneli sorguları. Çağıran taraf, clinicId'yi oturumdan (requireClinicUser) almalıdır.
import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, lt, lte, ne, or } from "drizzle-orm";
import { getDb } from "../db";
import { appointments, boardingReservations, services, users, vets } from "../db/schema";
import { ACTIVE_APPOINTMENT_STATUSES, ACTIVE_BOARDING_STATUSES } from "../constants";
import { addDays } from "../time";
import { stayNights } from "../booking/availability";

export async function getDayAppointments(clinicId: string, date: string) {
  const db = await getDb();
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.clinicId, clinicId), eq(appointments.date, date)))
    .orderBy(asc(appointments.startMinute), asc(appointments.vetName));
}

export async function getUpcomingAppointments(clinicId: string, fromDate: string, limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        gte(appointments.date, fromDate),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ),
    )
    .orderBy(asc(appointments.date), asc(appointments.startMinute))
    .limit(limit);
}

export async function getPendingAppointments(clinicId: string, fromDate: string) {
  const db = await getDb();
  return db
    .select()
    .from(appointments)
    .where(and(eq(appointments.clinicId, clinicId), eq(appointments.status, "pending"), gte(appointments.date, fromDate)))
    .orderBy(asc(appointments.date), asc(appointments.startMinute));
}

export async function getBoardingOverview(clinicId: string, today: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(boardingReservations)
    .where(
      and(
        eq(boardingReservations.clinicId, clinicId),
        or(gte(boardingReservations.checkOut, addDays(today, -30)), inArray(boardingReservations.status, ["pending", "checked_in"])),
      ),
    )
    .orderBy(asc(boardingReservations.checkIn), asc(boardingReservations.createdAt));

  return {
    pending: rows.filter((r) => r.status === "pending"),
    arrivals: rows.filter((r) => r.status === "confirmed" && r.checkIn <= today),
    departures: rows.filter((r) => r.status === "checked_in" && r.checkOut <= today),
    staying: rows.filter((r) => r.status === "checked_in" && r.checkOut > today),
    upcoming: rows.filter((r) => r.status === "confirmed" && r.checkIn > today),
    past: rows
      .filter((r) => ["completed", "cancelled", "rejected"].includes(r.status))
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
      .slice(0, 20),
  };
}

/** Önümüzdeki geceler için tür bazında doluluk (bekleyen talepler dahil). */
export async function getOccupancy(clinicId: string, from: string, days: number) {
  const db = await getDb();
  const to = addDays(from, days);
  const rows = await db
    .select({
      species: boardingReservations.species,
      checkIn: boardingReservations.checkIn,
      checkOut: boardingReservations.checkOut,
      status: boardingReservations.status,
    })
    .from(boardingReservations)
    .where(
      and(
        eq(boardingReservations.clinicId, clinicId),
        inArray(boardingReservations.status, ACTIVE_BOARDING_STATUSES),
        lt(boardingReservations.checkIn, to),
        gt(boardingReservations.checkOut, from),
      ),
    );
  return stayNights(from, to).map((date) => {
    const tonight = rows.filter((r) => r.checkIn <= date && date < r.checkOut);
    return {
      date,
      cat: tonight.filter((r) => r.species === "cat").length,
      dog: tonight.filter((r) => r.species === "dog").length,
      pending: tonight.filter((r) => r.status === "pending").length,
    };
  });
}

export async function getDashboardCounts(clinicId: string, today: string) {
  const db = await getDb();
  const weekEnd = addDays(today, 6);
  const [[todayCount], [weekCount], [pendingAppt], [pendingBoarding]] = await Promise.all([
    db
      .select({ n: count() })
      .from(appointments)
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.date, today), ne(appointments.status, "cancelled"))),
    db
      .select({ n: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.clinicId, clinicId),
          gte(appointments.date, today),
          lte(appointments.date, weekEnd),
          inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
        ),
      ),
    db
      .select({ n: count() })
      .from(appointments)
      .where(and(eq(appointments.clinicId, clinicId), eq(appointments.status, "pending"), gte(appointments.date, today))),
    db
      .select({ n: count() })
      .from(boardingReservations)
      .where(and(eq(boardingReservations.clinicId, clinicId), eq(boardingReservations.status, "pending"))),
  ]);
  return { today: todayCount.n, week: weekCount.n, pendingAppointments: pendingAppt.n, pendingBoarding: pendingBoarding.n };
}

export async function getClinicServices(clinicId: string) {
  const db = await getDb();
  return db.select().from(services).where(eq(services.clinicId, clinicId)).orderBy(desc(services.isActive), asc(services.sortOrder), asc(services.name));
}

export async function getClinicVets(clinicId: string) {
  const db = await getDb();
  return db.select().from(vets).where(eq(vets.clinicId, clinicId)).orderBy(desc(vets.isActive), asc(vets.sortOrder), asc(vets.name));
}

export async function getClinicUsers(clinicId: string) {
  const db = await getDb();
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.clinicId, clinicId))
    .orderBy(asc(users.role), asc(users.name));
}
