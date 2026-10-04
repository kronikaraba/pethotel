// Klinik fotoğrafları için ortak kurallar (sunucu ve tarayıcı tarafı birlikte kullanır).

export const MAX_PHOTOS_PER_CLINIC = 10;
/** Tarayıcı fotoğrafı bu boyuta küçültüp gönderir; sunucu daha büyüğünü reddeder. */
export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_PHOTO_EDGE = 1600;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/webp", "image/png"] as const;
export type PhotoMimeType = (typeof PHOTO_MIME_TYPES)[number];

export function photoUrl(id: string) {
  return `/api/foto/${id}`;
}

/** Dosyanın ilk baytlarına bakarak gerçek türünü bulur; uzantıya ya da tarayıcının söylediğine güvenmez. */
export function sniffImageType(bytes: Uint8Array): PhotoMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
