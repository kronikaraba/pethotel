// Pet otel (konaklama) fiyat/müsaitlik hesabı, rezervasyon oluşturma ve iptal.
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { getDb, type Queryable } from "../db";
import { boardingReservations, clinics, type BoardingReservation, type Clinic } from "../db/schema";
import {
  ACTIVE_BOARDING_STATUSES,
  MAX_BOARDING_DAYS_AHEAD,
  MAX_BOARDING_NIGHTS,
  type BoardingSpecies,
} from "../constants";
import {
  boardingOccupancy,
  STAY_PROBLEM_MESSAGES,
  validateStay,
  type NightOccupancy,
  type StayProblem,
} from "./availability";
import { BookingError } from "./errors";
import { generateBookingCode } from "./codes";
import { diffDays, todayInIstanbul } from "../time";

export function boardingCapacity(clinic: Clinic, species: BoardingSpecies): number {
  // Konaklama yalnızca pet otel hesabında vardır.
  if (clinic.kind !== "hotel" || !clinic.boardingEnabled) return 0;
  return species === "cat" ? clinic.boardingCatCapacity : clinic.boardingDogCapacity;
}

export function boardingPrice(clinic: Clinic, species: BoardingSpecies): number | null {
  return species === "cat" ? clinic.boardingCatPrice : clinic.boardingDogPrice;
}

/** Klinikte konaklama kabul edilen türler. */
export function boardingSpeciesOf(clinic: Clinic): BoardingSpecies[] {
  if (!clinic.boardingEnabled) return [];
  return (["cat", "dog"] as const).filter((s) => boardingCapacity(clinic, s) > 0);
}

async function overlapping(
  q: Queryable,
  clinicId: string,
  species: BoardingSpecies,
  checkIn: string,
  checkOut: string,
  excludeId?: string,
) {
  return q
    .select({ checkIn: boardingReservations.checkIn, checkOut: boardingReservations.checkOut })
    .from(boardingReservations)
    .where(
      and(
        eq(boardingReservations.clinicId, clinicId),
        eq(boardingReservations.species, species),
        inArray(boardingReservations.status, ACTIVE_BOARDING_STATUSES),
        lt(boardingReservations.checkIn, checkOut),
        gt(boardingReservations.checkOut, checkIn),
        excludeId ? ne(boardingReservations.id, excludeId) : undefined,
      ),
    );
}

export type BoardingQuote =
  | { ok: false; problem: StayProblem | "NO_CAPACITY"; message: string }
  | {
      ok: true;
      nights: number;
      nightlyPrice: number | null;
      total: number | null;
      available: boolean;
      minFree: number;
      occupancy: NightOccupancy[];
    };

export async function getBoardingQuote(params: {
  clinic: Clinic;
  species: BoardingSpecies;
  checkIn: string;
  checkOut: string;
  q?: Queryable;
  excludeId?: string;
}): Promise<BoardingQuote> {
  const { clinic, species, checkIn, checkOut } = params;
  const capacity = boardingCapacity(clinic, species);
  if (capacity <= 0) {
    return { ok: false, problem: "NO_CAPACITY", message: "Bu klinik bu tür için konaklama kabul etmiyor." };
  }
  const problem = validateStay({
    checkIn,
    checkOut,
    today: todayInIstanbul(),
    hours: clinic.workingHours,
    closedDates: clinic.closedDates,
    maxNights: MAX_BOARDING_NIGHTS,
    maxDaysAhead: MAX_BOARDING_DAYS_AHEAD,
  });
  if (problem) return { ok: false, problem, message: STAY_PROBLEM_MESSAGES[problem] };

  const q = params.q ?? (await getDb());
  const existing = await overlapping(q, clinic.id, species, checkIn, checkOut, params.excludeId);
  const occ = boardingOccupancy({ checkIn, checkOut, capacity, existing });
  const nights = diffDays(checkIn, checkOut);
  const nightlyPrice = boardingPrice(clinic, species);
  return {
    ok: true,
    nights,
    nightlyPrice,
    total: nightlyPrice ? nightlyPrice * nights : null,
    available: occ.available,
    minFree: occ.minFree,
    occupancy: occ.nights,
  };
}

export type NewBoardingInput = {
  clinicId: string;
  species: BoardingSpecies;
  checkIn: string;
  checkOut: string;
  petName: string;
  petBreed?: string | null;
  petAge?: string | null;
  vaccinated: boolean;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  notes?: string | null;
};

/** Konaklama talebi oluşturur (klinik onayına düşer). Kapasite kontrolü kilit altında tekrar yapılır. */
export async function createBoardingReservation(input: NewBoardingInput): Promise<BoardingReservation> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [clinic] = await tx.select().from(clinics).where(eq(clinics.id, input.clinicId)).for("update");
    if (!clinic || clinic.status !== "active") throw new BookingError("CLINIC_NOT_FOUND");
    if (clinic.kind !== "hotel" || !clinic.boardingEnabled) throw new BookingError("BOARDING_DISABLED");

    const quote = await getBoardingQuote({
      clinic,
      species: input.species,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      q: tx,
    });
    if (!quote.ok) {
      throw quote.problem === "NO_CAPACITY"
        ? new BookingError("BOARDING_DISABLED", quote.message)
        : new BookingError("STAY_INVALID", quote.message);
    }
    if (!quote.available) throw new BookingError("BOARDING_FULL");

    const code = await uniqueBoardingCode(tx);
    const [row] = await tx
      .insert(boardingReservations)
      .values({
        code,
        clinicId: clinic.id,
        species: input.species,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights: quote.nights,
        nightlyPrice: quote.nightlyPrice,
        totalPrice: quote.total,
        status: "pending",
        petName: input.petName,
        petBreed: input.petBreed || null,
        petAge: input.petAge || null,
        vaccinated: input.vaccinated,
        ownerName: input.ownerName,
        ownerPhone: input.ownerPhone,
        ownerEmail: input.ownerEmail || null,
        notes: input.notes || null,
        consentAt: new Date(),
      })
      .returning();
    return row;
  });
}

async function uniqueBoardingCode(q: Queryable): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateBookingCode("K");
    const exists = await q
      .select({ id: boardingReservations.id })
      .from(boardingReservations)
      .where(eq(boardingReservations.code, code))
      .limit(1);
    if (exists.length === 0) return code;
  }
  throw new Error("Konaklama kodu üretilemedi");
}

/** Müşteri, giriş gününden önceki güne kadar çevrim içi iptal edebilir. */
export function canCustomerCancelBoarding(
  r: Pick<BoardingReservation, "status" | "checkIn">,
  today = todayInIstanbul(),
): boolean {
  if (r.status !== "pending" && r.status !== "confirmed") return false;
  return diffDays(today, r.checkIn) >= 1;
}

export async function cancelBoardingByCustomer(code: string): Promise<BoardingReservation> {
  const db = await getDb();
  const [r] = await db.select().from(boardingReservations).where(eq(boardingReservations.code, code)).limit(1);
  if (!r) throw new BookingError("NOT_FOUND");
  if (!canCustomerCancelBoarding(r)) throw new BookingError("NOT_CANCELLABLE");
  const [updated] = await db
    .update(boardingReservations)
    .set({ status: "cancelled", cancelledBy: "customer", updatedAt: new Date() })
    .where(and(eq(boardingReservations.id, r.id), inArray(boardingReservations.status, ["pending", "confirmed"])))
    .returning();
  if (!updated) throw new BookingError("NOT_CANCELLABLE");
  return updated;
}
