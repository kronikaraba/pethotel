import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PanelNav } from "@/components/panel/PanelNav";
import { requireClinicUser } from "@/lib/auth/dal";
import { logoutAction } from "@/lib/actions/auth";
import { getDashboardCounts } from "@/lib/data/panel";
import { USER_ROLE_LABELS } from "@/lib/constants";
import { todayInIstanbul } from "@/lib/time";

export const metadata: Metadata = {
  title: { default: "Klinik paneli", template: "%s | PetHotel paneli" },
  robots: { index: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, clinic, isAdmin } = await requireClinicUser();
  const counts = await getDashboardCounts(clinic.id, todayInIstanbul());
  const badges = {
    "/panel/randevular": counts.pendingAppointments,
    "/panel/konaklama": counts.pendingBoarding,
  };

  const logout = (
    <form action={logoutAction}>
      <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-medium text-stone hover:bg-coral-soft hover:text-coral">
        <LogOut className="h-4 w-4" aria-hidden />
        Çıkış yap
      </button>
    </form>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:px-5 lg:pt-6">
          <Logo href="/panel" />
          <div className="lg:hidden">{logout}</div>
        </div>
        <div className="px-4 pt-4 lg:px-5">
          <p className="truncate font-semibold" title={clinic.name}>
            {clinic.name}
          </p>
          <Link
            href={clinic.status === "active" ? `/klinik/${clinic.slug}` : "#"}
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-stone hover:text-pine"
            target={clinic.status === "active" ? "_blank" : undefined}
          >
            {clinic.status === "active" ? "Sitedeki sayfanı gör" : "Henüz yayında değil"}
            {clinic.status === "active" && <ExternalLink className="h-3.5 w-3.5" aria-hidden />}
          </Link>
        </div>
        <div className="px-4 pt-4 pb-3 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pt-6">
          <PanelNav isAdmin={isAdmin} badges={badges} />
        </div>
        <div className="hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-stone">{USER_ROLE_LABELS[user.role]}</p>
          <div className="mt-2 -ml-3">{logout}</div>
        </div>
      </aside>

      <div className="min-w-0">
        {clinic.status === "pending" && (
          <div className="border-b border-[#e9c46a] bg-lamp-soft px-4 py-3 text-sm text-[#5c4100] sm:px-8">
            <strong className="font-semibold">Başvurun inceleniyor.</strong> Onaylanınca kliniğin sitede listelenecek. Bu sürede hizmetlerini, ekibini ve
            çalışma saatlerini hazırlayabilirsin.
          </div>
        )}
        {clinic.status === "suspended" && (
          <div className="border-b border-coral/30 bg-coral-soft px-4 py-3 text-sm text-coral sm:px-8">
            <strong className="font-semibold">Kliniğin geçici olarak yayından kaldırıldı.</strong> Yeni online randevu alınamaz. Ayrıntı için platform
            yöneticisiyle iletişime geç.
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
