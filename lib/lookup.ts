// "Rezervasyonum" erişimi: rezervasyon kodunu + telefonu doğrulayan ziyaretçiye,
// o kodu görüntüleme izni veren imzalı bir çerez yazılır. Böylece URL'de kişisel veri taşınmaz.
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authSecret, secureCookies } from "./auth/session";

const COOKIE = "ph_bookings";
const MAX_CODES = 10;
const DAYS = 30;

async function readCodes(): Promise<string[]> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return [];
  const key = await authSecret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return Array.isArray(payload.codes) ? payload.codes.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

/** Ziyaretçinin bu cihazda görüntüleme izni olan rezervasyon kodları (en yeni önce). */
export async function rememberedBookings(): Promise<string[]> {
  return readCodes();
}

export async function rememberBooking(code: string): Promise<void> {
  const codes = [code, ...(await readCodes()).filter((c) => c !== code)].slice(0, MAX_CODES);
  const expires = new Date(Date.now() + DAYS * 86_400_000);
  const token = await new SignJWT({ codes })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(await authSecret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function canViewBooking(code: string): Promise<boolean> {
  return (await readCodes()).includes(code);
}
