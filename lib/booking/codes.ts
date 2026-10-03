import { randomInt } from "node:crypto";

// Karışabilecek karakterler (0/O, 1/I) çıkarıldı.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "R-7K3M9Q" (randevu) ya da "K-4TQ8ZP" (konaklama) biçiminde kod üretir. */
export function generateBookingCode(prefix: "R" | "K"): string {
  let body = "";
  for (let i = 0; i < 6; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${body}`;
}

/** Kullanıcının yazdığı kodu standart hale getirir: "r 7k3m9q" → "R-7K3M9Q" */
export function normalizeBookingCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 7 || cleaned.length > 8) return null;
  const prefix = cleaned[0];
  if (prefix !== "R" && prefix !== "K") return null;
  return `${prefix}-${cleaned.slice(1)}`;
}
