import "server-only";
import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "../constants";
import { getDb, isLocalDatabase } from "../db";
import { getOrCreateSetting } from "../db/settings";

const SESSION_COOKIE = "ph_session";
const SESSION_DAYS = 7;
const DEV_SECRET = "pethotel-yerel-gelistirme-anahtari-canlida-kullanma";
const SECRET_SETTING_KEY = "auth_secret";

export type SessionData = {
  uid: string;
  role: UserRole;
  cid: string | null;
};

let secretPromise: Promise<Uint8Array> | undefined;

/**
 * Çerezleri imzalamak için kullanılan anahtar.
 * - AUTH_SECRET tanımlıysa o kullanılır.
 * - Tanımlı değilse ve gerçek bir Postgres kullanılıyorsa (Vercel + Neon) ilk açılışta rastgele
 *   256 bitlik bir anahtar üretilir ve veritabanında saklanır; tüm sunucular aynı anahtarı kullanır.
 * - Yerel gömülü veritabanında (PGlite) sabit bir geliştirme anahtarı kullanılır.
 */
export function authSecret(): Promise<Uint8Array> {
  if (!secretPromise) {
    secretPromise = resolveSecret().catch((error) => {
      secretPromise = undefined; // bir sonraki istekte yeniden denensin
      throw error;
    });
  }
  return secretPromise;
}

async function resolveSecret(): Promise<Uint8Array> {
  const encode = (value: string) => new TextEncoder().encode(value);
  const secret = process.env.AUTH_SECRET;
  if (secret) {
    if (secret.length < 32 && process.env.NODE_ENV === "production" && !isLocalDatabase()) {
      throw new Error("AUTH_SECRET en az 32 karakter olmalı.");
    }
    return encode(secret);
  }
  if (!isLocalDatabase()) {
    const stored = await getOrCreateSetting(await getDb(), SECRET_SETTING_KEY, () => randomBytes(32).toString("base64url"));
    return encode(stored);
  }
  console.warn("[auth] AUTH_SECRET tanımlı değil; yerel geliştirme anahtarı kullanılıyor.");
  return encode(DEV_SECRET);
}

export const secureCookies = () => process.env.NODE_ENV === "production";

export async function createSession(data: SessionData): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const token = await new SignJWT({ role: data.role, cid: data.cid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.uid)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(await authSecret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function readSession(): Promise<SessionData | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const key = await authSecret();
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return {
      uid: payload.sub,
      role: payload.role as UserRole,
      cid: typeof payload.cid === "string" ? payload.cid : null,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
