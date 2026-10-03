// Uygulama genelinde kullanılan sabitler ve Türkçe etiketler.

export const SITE_NAME = "PetHotel";

// ---------- Randevular ----------
export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Takvimde yer kaplayan (saat bloklayan) randevu durumları. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
  no_show: "Gelmedi",
};

// ---------- Pet otel ----------
export const BOARDING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "rejected",
] as const;
export type BoardingStatus = (typeof BOARDING_STATUSES)[number];

/** Kapasiteden düşülen konaklama durumları. */
export const ACTIVE_BOARDING_STATUSES: BoardingStatus[] = ["pending", "confirmed", "checked_in"];

export const BOARDING_STATUS_LABELS: Record<BoardingStatus, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylandı",
  checked_in: "Konaklıyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
  rejected: "Reddedildi",
};

// ---------- Evcil hayvanlar ----------
export const PET_SPECIES = ["cat", "dog", "bird", "rabbit", "other"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];
export const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  cat: "Kedi",
  dog: "Köpek",
  bird: "Kuş",
  rabbit: "Tavşan",
  other: "Diğer",
};

export const BOARDING_SPECIES = ["cat", "dog"] as const;
export type BoardingSpecies = (typeof BOARDING_SPECIES)[number];

// ---------- Hizmetler ----------
export const SERVICE_CATEGORIES = [
  "muayene",
  "asi",
  "checkup",
  "dis",
  "cerrahi",
  "goruntuleme",
  "bakim",
  "diger",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  muayene: "Muayene",
  asi: "Aşı ve parazit",
  checkup: "Check-up ve tahlil",
  dis: "Diş bakımı",
  cerrahi: "Cerrahi",
  goruntuleme: "Görüntüleme",
  bakim: "Tıraş ve bakım",
  diger: "Diğer",
};

// ---------- Klinikler ve kullanıcılar ----------
export const CLINIC_STATUSES = ["pending", "active", "suspended"] as const;
export type ClinicStatus = (typeof CLINIC_STATUSES)[number];
export const CLINIC_STATUS_LABELS: Record<ClinicStatus, string> = {
  pending: "Onay bekliyor",
  active: "Yayında",
  suspended: "Askıya alındı",
};

export const USER_ROLES = ["superadmin", "clinic_admin", "clinic_staff"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Platform yöneticisi",
  clinic_admin: "Klinik yöneticisi",
  clinic_staff: "Klinik personeli",
};

// ---------- Takvim ----------
export type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6"; // 0 = Pazar (JS getDay)

/** Pazartesiden başlayan hafta sırası. */
export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: "1", label: "Pazartesi", short: "Pzt" },
  { key: "2", label: "Salı", short: "Sal" },
  { key: "3", label: "Çarşamba", short: "Çar" },
  { key: "4", label: "Perşembe", short: "Per" },
  { key: "5", label: "Cuma", short: "Cum" },
  { key: "6", label: "Cumartesi", short: "Cmt" },
  { key: "0", label: "Pazar", short: "Paz" },
];

/** Müşteri, randevusunu başlangıçtan en geç bu kadar dakika önce iptal edebilir. */
export const CANCEL_CUTOFF_MINUTES = 60;

/** Tek seferde en fazla kaç gece konaklama istenebilir. */
export const MAX_BOARDING_NIGHTS = 30;

/** Konaklama en fazla kaç gün sonrası için istenebilir. */
export const MAX_BOARDING_DAYS_AHEAD = 180;

export const SLOT_STEP_OPTIONS = [10, 15, 20, 30, 60] as const;
