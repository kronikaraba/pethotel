// Para, telefon ve metin biçimlendirme yardımcıları.

const numberFormatter = new Intl.NumberFormat("tr-TR");

/** 1250 → "1.250 ₺" */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return `${numberFormatter.format(value)} ₺`;
}

/**
 * Türkiye telefon numarasını "+90XXXXXXXXXX" biçimine çevirir.
 * Geçersizse null döner. Kabul edilen örnekler: 0532 123 45 67, +90 532 1234567, 5321234567
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[2-5]/.test(digits)) return null;
  return `+90${digits}`;
}

/** "+905321234567" → "0532 123 45 67" */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").replace(/^90/, "");
  if (digits.length !== 10) return value;
  return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

/** tel: bağlantısı için */
export function phoneHref(value: string): string {
  const normalized = normalizePhone(value);
  return `tel:${normalized ?? value.replace(/\s/g, "")}`;
}

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

/** "Moda Pati Kliniği" → "moda-pati-klinigi" */
export function slugify(value: string): string {
  return value
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Türkçe büyük/küçük harf duyarsız karşılaştırma için sadeleştirme. */
export function foldTr(value: string): string {
  return value.toLocaleLowerCase("tr-TR").replace(/[çğıöşü]/g, (ch) => TR_MAP[ch] ?? ch);
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} sa ${m} dk` : `${h} saat`;
}

export function pluralNights(n: number): string {
  return `${n} gece`;
}
