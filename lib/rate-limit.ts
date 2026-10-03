// Basit, bellek içi istek sınırlayıcı (IP başına sabit pencere).
// Not: Sunucusuz ortamda her sunucu örneği kendi sayacını tutar; kaba kuvvet ve
// form spam'ine karşı temel bir koruma sağlar. Daha sıkı koruma için Upstash/Redis kullanılabilir.
import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { __pethotelRate?: Map<string, Bucket> };
const store = (globalStore.__pethotelRate ??= new Map<string, Bucket>());

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "yerel";
}

/**
 * İzin verilirse true döner. Varsayılan anahtar IP adresidir; `subject` verilirse (ör. telefon numarası)
 * IP yerine o kullanılır. Mobil operatörlerde çok sayıda kullanıcı aynı IP'yi paylaşabildiği için
 * IP sınırları cömert tutulur.
 */
export async function rateLimit(bucket: string, limit: number, windowMs: number, subject?: string): Promise<boolean> {
  if (process.env.DISABLE_RATE_LIMIT === "true") return true;
  const key = `${bucket}:${subject ?? (await clientIp())}`;
  const now = Date.now();
  if (store.size > 10_000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

/** Sayaca dokunmadan sınırın aşılıp aşılmadığını kontrol eder (ör. yalnızca başarısız girişleri saymak için). */
export async function isRateLimited(bucket: string, limit: number, subject?: string): Promise<boolean> {
  if (process.env.DISABLE_RATE_LIMIT === "true") return false;
  const current = store.get(`${bucket}:${subject ?? (await clientIp())}`);
  return Boolean(current && current.resetAt > Date.now() && current.count >= limit);
}

/** Bir denemeyi sayaca ekler. */
export async function recordAttempt(bucket: string, windowMs: number, subject?: string): Promise<void> {
  const key = `${bucket}:${subject ?? (await clientIp())}`;
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) store.set(key, { count: 1, resetAt: now + windowMs });
  else current.count += 1;
}

export const RATE_LIMIT_MESSAGE = "Çok fazla deneme yaptın. Lütfen birkaç dakika sonra tekrar dene.";
