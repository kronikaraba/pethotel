// Form doğrulama şemaları (Zod). Tüm sunucu işlemleri girdiyi burada doğrular.
import { z } from "zod";
import {
  BOARDING_SPECIES,
  PET_SPECIES,
  SERVICE_CATEGORIES,
  SLOT_STEP_OPTIONS,
} from "./constants";
import { CITIES } from "./cities";
import { normalizePhone } from "./format";
import { isValidDateString, isValidTime } from "./time";

z.config(z.locales.tr());

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} gerekli.` })
    .trim()
    .min(min, min <= 1 ? `${label} gerekli.` : `${label} en az ${min} karakter olmalı.`)
    .max(max, `${label} en fazla ${max} karakter olabilir.`);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} en fazla ${max} karakter olabilir.`)
    .optional()
    .transform((v) => (v ? v : null));

export const phoneField = z
  .string({ error: "Telefon numarası gerekli." })
  .trim()
  .min(1, "Telefon numarası gerekli.")
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir telefon numarası yaz (örn. 0532 123 45 67)." });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || null)
  .pipe(z.union([z.null(), z.email("Geçerli bir e-posta adresi yaz.")]));

export const requiredEmail = z
  .string({ error: "E-posta adresi gerekli." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Geçerli bir e-posta adresi yaz."));

export const dateField = z
  .string({ error: "Tarih seç." })
  .refine(isValidDateString, "Geçerli bir tarih seç.");

export const timeField = z.string().refine(isValidTime, "Geçerli bir saat seç (SS:DD).");

const consent = z.literal(true, { error: "Devam etmek için aydınlatma metnini onaylaman gerekiyor." });

/** Bot tuzağı: gerçek kullanıcılar bu alanı görmez, dolu gelirse istek reddedilir. */
const honeypot = z.string().max(0).optional();

// ---------- Müşteri formları ----------

export const ownerFields = {
  ownerName: text(3, 80, "Ad soyad"),
  ownerPhone: phoneField,
  ownerEmail: optionalEmail,
};

export const appointmentInput = z.object({
  clinicSlug: z.string().min(1),
  serviceId: z.uuid("Bir hizmet seç."),
  vetId: z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null),
  date: dateField,
  time: timeField,
  petName: text(1, 40, "Evcil hayvanının adı"),
  petSpecies: z.enum(PET_SPECIES, { error: "Tür seç." }),
  petBreed: optionalText(60, "Cins"),
  petAge: optionalText(30, "Yaş"),
  ...ownerFields,
  notes: optionalText(500, "Not"),
  consent,
  website: honeypot,
});
export type AppointmentInput = z.input<typeof appointmentInput>;

export const boardingInput = z.object({
  clinicSlug: z.string().min(1),
  species: z.enum(BOARDING_SPECIES, { error: "Kedi ya da köpek seç." }),
  checkIn: dateField,
  checkOut: dateField,
  petName: text(1, 40, "Evcil hayvanının adı"),
  petBreed: optionalText(60, "Cins"),
  petAge: optionalText(30, "Yaş"),
  vaccinated: z.literal(true, { error: "Konaklama için aşıların güncel olması gerekiyor." }),
  ...ownerFields,
  notes: optionalText(800, "Not"),
  consent,
  website: honeypot,
});
export type BoardingInput = z.input<typeof boardingInput>;

export const lookupInput = z.object({
  code: z.string().trim().min(6, "Rezervasyon kodunu yaz."),
  phone: phoneField,
});

// ---------- Giriş ve başvuru ----------

export const loginInput = z.object({
  email: requiredEmail,
  password: z.string().min(1, "Şifreni yaz.").max(200),
});

export const passwordField = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(100, "Şifre en fazla 100 karakter olabilir.");

export const clinicRegistrationInput = z.object({
  clinicName: text(3, 80, "Klinik adı"),
  city: z.enum(CITIES, { error: "İl seç." }),
  district: text(2, 40, "İlçe"),
  address: text(10, 200, "Adres"),
  phone: phoneField,
  clinicEmail: optionalEmail,
  description: optionalText(600, "Tanıtım yazısı"),
  contactName: text(3, 80, "Yetkili adı"),
  email: requiredEmail,
  password: passwordField,
  consent,
  website: honeypot,
});

// ---------- Klinik paneli ----------

const intField = (label: string, min: number, max: number) =>
  z.coerce
    .number({ error: `${label} bir sayı olmalı.` })
    .int(`${label} tam sayı olmalı.`)
    .min(min, `${label} en az ${min} olmalı.`)
    .max(max, `${label} en fazla ${max} olabilir.`);

const optionalPrice = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const serviceInput = z.object({
  name: text(2, 80, "Hizmet adı"),
  category: z.enum(SERVICE_CATEGORIES),
  durationMinutes: intField("Süre", 5, 480),
  price: optionalPrice,
  description: optionalText(300, "Açıklama"),
  isActive: z.boolean(),
});

export const vetInput = z.object({
  name: text(3, 80, "Ad soyad"),
  title: text(2, 60, "Unvan"),
  bio: optionalText(200, "Kısa bilgi"),
  isActive: z.boolean(),
});

export const staffUserInput = z.object({
  name: text(3, 80, "Ad soyad"),
  email: requiredEmail,
  password: passwordField,
  role: z.enum(["clinic_admin", "clinic_staff"]),
});

const dayHoursInput = z
  .object({
    closed: z.boolean(),
    open: timeField,
    close: timeField,
    breakStart: z.union([z.literal(""), timeField]).optional(),
    breakEnd: z.union([z.literal(""), timeField]).optional(),
  })
  .refine((d) => d.closed || d.close > d.open, "Kapanış saati açılıştan sonra olmalı.")
  .refine(
    (d) => d.closed || !d.breakStart || !d.breakEnd || (d.breakEnd > d.breakStart && d.breakStart >= d.open && d.breakEnd <= d.close),
    "Öğle arası, çalışma saatleri içinde olmalı.",
  );

export const clinicSettingsInput = z.object({
  name: text(3, 80, "Klinik adı"),
  city: z.enum(CITIES, { error: "İl seç." }),
  district: text(2, 40, "İlçe"),
  address: text(10, 200, "Adres"),
  phone: phoneField,
  email: optionalEmail,
  description: optionalText(600, "Tanıtım yazısı"),
  hours: z.object({
    "0": dayHoursInput,
    "1": dayHoursInput,
    "2": dayHoursInput,
    "3": dayHoursInput,
    "4": dayHoursInput,
    "5": dayHoursInput,
    "6": dayHoursInput,
  }),
  closedDates: z.array(dateField).max(60),
  slotMinutes: z.coerce
    .number()
    .refine((v) => (SLOT_STEP_OPTIONS as readonly number[]).includes(v), "Geçerli bir aralık seç."),
  minNoticeMinutes: intField("Minimum bildirim süresi", 0, 2880),
  maxDaysAhead: intField("En ileri tarih", 1, 180),
  autoConfirm: z.boolean(),
  boardingEnabled: z.boolean(),
  boardingCatCapacity: intField("Kedi kapasitesi", 0, 200),
  boardingDogCapacity: intField("Köpek kapasitesi", 0, 200),
  boardingCatPrice: optionalPrice,
  boardingDogPrice: optionalPrice,
  boardingNotes: optionalText(600, "Konaklama notu"),
});
export type ClinicSettingsInput = z.input<typeof clinicSettingsInput>;

export const manualAppointmentInput = z.object({
  serviceId: z.uuid("Bir hizmet seç."),
  vetId: z.union([z.literal(""), z.uuid()]).optional().transform((v) => v || null),
  date: dateField,
  time: timeField,
  petName: text(1, 40, "Evcil hayvan adı"),
  petSpecies: z.enum(PET_SPECIES),
  ownerName: text(3, 80, "Sahip adı"),
  ownerPhone: phoneField,
  notes: optionalText(500, "Not"),
});

/** Zod hatasını { alan: "ilk mesaj" } biçimine çevirir. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
