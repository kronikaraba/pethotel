import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { requireSuperadmin } from "@/lib/auth/dal";
import { logoutAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: { default: "Platform yönetimi", template: "%s | PetHotel yönetim" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperadmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="hidden rounded-full bg-night px-2.5 py-1 text-xs font-semibold text-lamp sm:inline">Platform yönetimi</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/hesap" className="hidden text-sm text-stone hover:text-pine sm:inline" title="Hesabım ve şifre">
              {user.email}
            </Link>
            <Link href="/admin/hesap" className="text-sm font-medium text-stone hover:text-pine sm:hidden">
              Hesabım
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-medium text-stone hover:bg-coral-soft hover:text-coral">
                <LogOut className="h-4 w-4" aria-hidden />
                Çıkış yap
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">{children}</main>
    </div>
  );
}
