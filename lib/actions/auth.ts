"use server";
// Giriş, çıkış ve şifre değiştirme.
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../db/schema";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../auth/password";
import { createSession, destroySession } from "../auth/session";
import { getCurrentUser } from "../auth/dal";
import { clientIp, isRateLimited, rateLimit, recordAttempt, RATE_LIMIT_MESSAGE } from "../rate-limit";
import { fieldErrors, loginInput, passwordField } from "../validation";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

/** Yalnızca site içi göreli yollara yönlendir (açık yönlendirme açığını önler). */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  // Yalnızca başarısız denemeler sayılır. Aynı IP + e-posta için 10 dakikada 10 hatalı denemeden sonra,
  // aynı IP'den toplam 50 hatalı denemeden sonra geçici olarak engellenir.
  const subject = `${await clientIp()}:${values.email.trim().toLowerCase()}`;
  if ((await isRateLimited("login-fail", 10, subject)) || (await isRateLimited("login-fail-ip", 50))) {
    return { error: RATE_LIMIT_MESSAGE, values };
  }

  const parsed = loginInput.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  // Kullanıcı yoksa da hash karşılaştırması yapılır: yanıt süresinden e-posta tahmini yapılamasın.
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    await recordAttempt("login-fail", 10 * 60_000, subject);
    await recordAttempt("login-fail-ip", 10 * 60_000);
    return { error: "E-posta ya da şifre hatalı.", values };
  }

  await createSession({ uid: user.id, role: user.role, cid: user.clinicId });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const next = safeNext(formData.get("next"));
  if (user.role === "superadmin") redirect(next?.startsWith("/admin") ? next : "/admin");
  redirect(next?.startsWith("/panel") ? next : "/panel");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/giris");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (!(await rateLimit("password", 10, 10 * 60_000))) return { error: RATE_LIMIT_MESSAGE };

  const current = String(formData.get("current") ?? "");
  const next = passwordField.safeParse(formData.get("next"));
  if (!next.success) return { fieldErrors: { next: next.error.issues[0].message } };
  if (formData.get("next") !== formData.get("repeat")) return { fieldErrors: { repeat: "Yeni şifreler aynı değil." } };

  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { fieldErrors: { current: "Mevcut şifren hatalı." } };
  }
  await db.update(users).set({ passwordHash: await hashPassword(next.data) }).where(eq(users.id, user.id));
  return { ok: true, message: "Şifren güncellendi." };
}
