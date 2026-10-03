import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  appointments,
  boardingReservations,
  clinics,
  type Appointment,
  type BoardingReservation,
  type Clinic,
} from "../db/schema";

export type BookingRecord =
  | { kind: "appointment"; record: Appointment; clinic: Clinic }
  | { kind: "boarding"; record: BoardingReservation; clinic: Clinic };

export async function findBookingByCode(code: string): Promise<BookingRecord | null> {
  const db = await getDb();
  if (code.startsWith("R-")) {
    const [row] = await db
      .select({ record: appointments, clinic: clinics })
      .from(appointments)
      .innerJoin(clinics, eq(clinics.id, appointments.clinicId))
      .where(eq(appointments.code, code))
      .limit(1);
    return row ? { kind: "appointment", ...row } : null;
  }
  if (code.startsWith("K-")) {
    const [row] = await db
      .select({ record: boardingReservations, clinic: clinics })
      .from(boardingReservations)
      .innerJoin(clinics, eq(clinics.id, boardingReservations.clinicId))
      .where(eq(boardingReservations.code, code))
      .limit(1);
    return row ? { kind: "boarding", ...row } : null;
  }
  return null;
}
