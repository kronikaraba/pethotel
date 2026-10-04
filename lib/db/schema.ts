// Veritabanı şeması (Drizzle ORM, PostgreSQL).
// Şemayı değiştirdikten sonra `npm run db:generate` ile yeni migration üret.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  APPOINTMENT_STATUSES,
  BOARDING_SPECIES,
  BOARDING_STATUSES,
  BUSINESS_KINDS,
  CLINIC_STATUSES,
  PET_SPECIES,
  SERVICE_CATEGORIES,
  USER_ROLES,
  type WeekdayKey,
} from "../constants";

/** Bir günün çalışma saatleri ("HH:MM"). null = kapalı. */
export type DayHours = {
  open: string;
  close: string;
  breakStart?: string | null;
  breakEnd?: string | null;
} | null;

export type WeekHours = Record<WeekdayKey, DayHours>;

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Hesap türü: veteriner kliniği, pet otel ya da pet sitter. Tablo adı tarihsel olarak "clinics". */
    kind: text("kind", { enum: BUSINESS_KINDS }).notNull().default("vet"),
    status: text("status", { enum: CLINIC_STATUSES }).notNull().default("pending"),
    isDemo: boolean("is_demo").notNull().default(false),
    city: text("city").notNull(),
    district: text("district").notNull(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    description: text("description"),
    // Randevu kuralları
    workingHours: jsonb("working_hours").$type<WeekHours>().notNull(),
    closedDates: jsonb("closed_dates").$type<string[]>().notNull().default([]),
    slotMinutes: integer("slot_minutes").notNull().default(15),
    minNoticeMinutes: integer("min_notice_minutes").notNull().default(60),
    maxDaysAhead: integer("max_days_ahead").notNull().default(30),
    autoConfirm: boolean("auto_confirm").notNull().default(true),
    // Pet otel
    boardingEnabled: boolean("boarding_enabled").notNull().default(false),
    boardingCatCapacity: integer("boarding_cat_capacity").notNull().default(0),
    boardingDogCapacity: integer("boarding_dog_capacity").notNull().default(0),
    boardingCatPrice: integer("boarding_cat_price"),
    boardingDogPrice: integer("boarding_dog_price"),
    boardingNotes: text("boarding_notes"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("clinics_city_idx").on(t.city, t.district),
    index("clinics_status_idx").on(t.status, t.kind),
  ],
);

/** İkili veri (fotoğraflar). pg Buffer, PGlite Uint8Array döndürür; ikisi de Uint8Array'dir. */
const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
});

/**
 * Klinik fotoğrafları. Ayrı bir dosya deposu kurmaya gerek kalmasın diye küçültülmüş hâlleri
 * veritabanında tutulur (her biri en fazla ~1,5 MB). sortOrder'ı en küçük olan kapak fotoğrafıdır.
 */
export const clinicPhotos = pgTable(
  "clinic_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    data: bytea("data").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: integer("byte_size").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("clinic_photos_clinic_idx").on(t.clinicId, t.sortOrder)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", { enum: SERVICE_CATEGORIES }).notNull().default("muayene"),
    durationMinutes: integer("duration_minutes").notNull(),
    price: integer("price"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("services_clinic_idx").on(t.clinicId),
    check("services_duration_positive", sql`${t.durationMinutes} > 0`),
  ],
);

export const vets = pgTable(
  "vets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    title: text("title").notNull().default("Veteriner Hekim"),
    bio: text("bio"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("vets_clinic_idx").on(t.clinicId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    vetId: uuid("vet_id").references(() => vets.id, { onDelete: "set null" }),
    // Hizmet/veteriner sonradan değişse de randevu kaydı bozulmasın diye anlık kopya
    serviceName: text("service_name").notNull(),
    vetName: text("vet_name"),
    price: integer("price"),
    date: date("date", { mode: "string" }).notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    status: text("status", { enum: APPOINTMENT_STATUSES }).notNull().default("confirmed"),
    source: text("source", { enum: ["online", "clinic"] }).notNull().default("online"),
    petName: text("pet_name").notNull(),
    petSpecies: text("pet_species", { enum: PET_SPECIES }).notNull(),
    petBreed: text("pet_breed"),
    petAge: text("pet_age"),
    ownerName: text("owner_name").notNull(),
    ownerPhone: text("owner_phone").notNull(),
    ownerEmail: text("owner_email"),
    notes: text("notes"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by", { enum: ["customer", "clinic"] }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("appointments_clinic_date_idx").on(t.clinicId, t.date),
    index("appointments_vet_date_idx").on(t.vetId, t.date),
    check("appointments_time_order", sql`${t.endMinute} > ${t.startMinute}`),
  ],
);

export const boardingReservations = pgTable(
  "boarding_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    species: text("species", { enum: BOARDING_SPECIES }).notNull(),
    checkIn: date("check_in", { mode: "string" }).notNull(),
    checkOut: date("check_out", { mode: "string" }).notNull(),
    nights: integer("nights").notNull(),
    nightlyPrice: integer("nightly_price"),
    totalPrice: integer("total_price"),
    status: text("status", { enum: BOARDING_STATUSES }).notNull().default("pending"),
    petName: text("pet_name").notNull(),
    petBreed: text("pet_breed"),
    petAge: text("pet_age"),
    vaccinated: boolean("vaccinated").notNull().default(false),
    ownerName: text("owner_name").notNull(),
    ownerPhone: text("owner_phone").notNull(),
    ownerEmail: text("owner_email"),
    notes: text("notes"),
    clinicNote: text("clinic_note"),
    consentAt: timestamp("consent_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by", { enum: ["customer", "clinic"] }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("boarding_clinic_dates_idx").on(t.clinicId, t.checkIn, t.checkOut),
    check("boarding_date_order", sql`${t.checkOut} > ${t.checkIn}`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull(),
    clinicId: uuid("clinic_id").references(() => clinics.id, { onDelete: "cascade" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("users_clinic_idx").on(t.clinicId)],
);

/** Uygulama ayarları (anahtar / değer). Örn. AUTH_SECRET tanımlı değilse üretilen oturum anahtarı. */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: createdAt(),
});

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
export type Service = typeof services.$inferSelect;
export type Vet = typeof vets.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type BoardingReservation = typeof boardingReservations.$inferSelect;
export type User = typeof users.$inferSelect;
export type ClinicPhoto = typeof clinicPhotos.$inferSelect;
