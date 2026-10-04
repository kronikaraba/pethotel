import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/panel/LoginForm";
import { getCurrentUser } from "@/lib/auth/dal";
import { isLocalDatabase } from "@/lib/db";
import { DEV_ADMIN } from "@/lib/db/bootstrap";
import { DEMO_PASSWORD } from "@/lib/db/demo-data";

export const metadata: Metadata = { title: "Giriş", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "superadmin" ? "/admin" : "/panel");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  const showDemo = isLocalDatabase();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="w-full max-w-md">
          <h1 className="text-[2.25rem] leading-[1.05] font-bold">Giriş yap</h1>
          <p className="mt-2 text-stone">Veteriner kliniği, pet otel ve pet sitter hesapları buradan paneline girer.</p>
          <div className="mt-8 rounded-panel border border-line bg-surface p-5 sm:p-7">
            <LoginForm next={next} />
          </div>
          <p className="mt-6 text-[0.95rem] text-stone">
            Henüz hesabın yok mu?{" "}
            <Link href="/kayit" className="font-semibold text-pine underline-offset-4 hover:underline">
              Kayıt ol
            </Link>
          </p>

          {showDemo && (
            <aside className="mt-8 rounded-card border border-dashed border-line-strong p-5 text-sm">
              <h2 className="font-sans text-sm font-semibold tracking-normal">Yerel demo hesapları</h2>
              <p className="mt-1 text-stone">Bu kutu yalnızca yerel geliştirme veritabanında görünür.</p>
              <dl className="mt-3 space-y-2">
                <div>
                  <dt className="text-stone">Veteriner kliniği</dt>
                  <dd className="font-medium">moda@pethotel.local / {DEMO_PASSWORD}</dd>
                </div>
                <div>
                  <dt className="text-stone">Pet otel</dt>
                  <dd className="font-medium">otel@pethotel.local / {DEMO_PASSWORD}</dd>
                </div>
                <div>
                  <dt className="text-stone">Pet sitter</dt>
                  <dd className="font-medium">sitter@pethotel.local / {DEMO_PASSWORD}</dd>
                </div>
                <div>
                  <dt className="text-stone">Platform yöneticisi</dt>
                  <dd className="font-medium">
                    {process.env.ADMIN_EMAIL || DEV_ADMIN.email} / {process.env.ADMIN_EMAIL ? "(.env dosyandaki şifre)" : DEV_ADMIN.password}
                  </dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
