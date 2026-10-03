import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "../constants";
import { isLocalDatabase } from "../db";

const SESSION_COOKIE = "ph_session";
const SESSION_DAYS = 7;
const DEV_SECRET = "pethotel-yerel-gelistirme-anahtari-canlida-kullanma";

export type SessionData = {
  uid: string;
  role: UserRole;
  cid: string | null;
};

let warned = false;

/** Çerezleri imzalamak için kullanılan anahtar. Canlıda AUTH_SECRET zorunludur. */
export function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  const isProd = process.env.NODE_ENV === "production" && !isLocalDatabase();
  if (secret) {
    if (secret.length < 32 && isProd) {
      throw new Error("AUTH_SECRET en az 32 karakter olmalı.");
    }
    return new TextEncoder().encode(secret);
  }
  if (isProd) {
    throw new Error("AUTH_SECRET ortam değişkeni tanımlı değil. README'deki kurulum adımlarına bak.");
  }
  if (!warned) {
    console.warn("[auth] AUTH_SECRET tanımlı değil; yalnızca yerel geliştirme için varsayılan anahtar kullanılıyor.");
    warned = true;
  }
  return new TextEncoder().encode(DEV_SECRET);
}

export const secureCookies = () => process.env.NODE_ENV === "production";

export async function createSession(data: SessionData): Promise<void> {
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const token = await new SignJWT({ role: data.role, cid: data.cid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.uid)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(authSecret());

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
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
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
