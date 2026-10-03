export const BOOKING_ERROR_MESSAGES = {
  CLINIC_NOT_FOUND: "Klinik bulunamadı ya da şu anda randevu almıyor.",
  SERVICE_NOT_FOUND: "Seçtiğin hizmet artık sunulmuyor. Lütfen başka bir hizmet seç.",
  VET_NOT_FOUND: "Seçtiğin veteriner şu anda randevu almıyor.",
  SLOT_TAKEN: "Bu saat az önce doldu. Lütfen başka bir saat seç.",
  BOARDING_DISABLED: "Bu klinik şu anda konaklama kabul etmiyor.",
  BOARDING_FULL: "Seçtiğin tarihlerde boş yer kalmadı. Başka tarihler dene.",
  STAY_INVALID: "Konaklama tarihleri geçerli değil.",
  NOT_CANCELLABLE: "Bu rezervasyon artık çevrim içi iptal edilemiyor. Lütfen kliniği ara.",
  NOT_FOUND: "Rezervasyon bulunamadı.",
} as const;

export type BookingErrorCode = keyof typeof BOOKING_ERROR_MESSAGES;

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  constructor(code: BookingErrorCode, message?: string) {
    super(message ?? BOOKING_ERROR_MESSAGES[code]);
    this.code = code;
    this.name = "BookingError";
  }
}
