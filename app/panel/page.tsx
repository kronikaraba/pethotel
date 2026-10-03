import Link from "next/link";
import { BedDouble, Check, CircleAlert, LogIn, LogOut, Plus } from "lucide-react";
import { requireClinicUser } from "@/lib/auth/dal";
import { getBoardingOverview, getClinicServices, getClinicVets, getDashboardCounts, getDayAppointments } from "@/lib/data/panel";
import { formatDateLong, relativeDayLabel, relativeDayWord, todayInIstanbul } from "@/lib/time";
import { openStatus } from "@/lib/clinic-hours";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { AgendaItem } from "@/components/panel/AgendaItem";
import { BoardingActions } from "@/components/panel/BoardingActions";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Bugün" };

export default async function PanelHome() {
  const { clinic, user, isAdmin } = await requireClinicUser();
  const today = todayInIstanbul();
  const [agenda, counts, boarding, svc, vetList] = await Promise.all([
    getDayAppointments(clinic.id, today),
    getDashboardCounts(clinic.id, today),
    getBoardingOverview(clinic.id, today),
    getClinicServices(clinic.id),
    getClinicVets(clinic.id),
  ]);
  const active = agenda.filter((a) => a.status !== "cancelled");
  const status = openStatus(clinic);
  const needsSetup = svc.filter((s) => s.isActive).length === 0 || vetList.filter((v) => v.isActive).length === 0;
  const firstName = user.name.split(" ")[0];

  const stats = [
    { label: "Bugünkü randevu", value: counts.today, href: "/panel/randevular" },
    { label: "Önümüzdeki 7 gün", value: counts.week, href: "/panel/randevular" },
    { label: "Onay bekleyen randevu", value: counts.pendingAppointments, href: "/panel/randevular", warn: counts.pendingAppointments > 0 },
    { label: "Bekleyen konaklama talebi", value: counts.pendingBoarding, href: "/panel/konaklama", warn: counts.pendingBoarding > 0 },
  ];

  return (
    <>
      <PageHeader
        title={`Merhaba ${firstName}`}
        description={
          <>
            {formatDateLong(today)}. <span className={status.open ? "font-medium text-pine" : ""}>{status.label}.</span>
          </>
        }
        actions={
          <Link href="/panel/randevular/yeni" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            Randevu ekle
          </Link>
        }
      />

      {needsSetup && (
        <section aria-labelledby="kurulum" className="mb-8 rounded-panel border border-[#e9c46a] bg-lamp-soft p-6">
          <h2 id="kurulum" className="flex items-center gap-2 text-xl font-semibold">
            <CircleAlert className="h-5 w-5" aria-hidden />
            Online randevuya başlamak için iki adım kaldı
          </h2>
          <ol className="mt-4 space-y-2">
            <SetupStep done={svc.some((s) => s.isActive)} href="/panel/hizmetler" label="En az bir hizmet ekle (süre ve fiyatıyla)" isAdmin={isAdmin} />
            <SetupStep done={vetList.some((v) => v.isActive)} href="/panel/ekip" label="Randevu alacak veterinerleri ekle" isAdmin={isAdmin} />
          </ol>
        </section>
      )}

      <dl className="mb-10 grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-surface md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`border-line p-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
            <dt className="text-sm text-stone">{s.label}</dt>
            <dd className={`font-display mt-1 text-4xl font-bold tabular ${s.warn ? "text-[#a86b00]" : ""}`}>
              <Link href={s.href} className="hover:underline">
                {s.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="ajanda">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="ajanda" className="text-2xl font-semibold">
              Bugünün randevuları
            </h2>
            <Link href="/panel/randevular" className="text-sm font-semibold text-pine hover:underline">
              Takvimi aç
            </Link>
          </div>
          {active.length === 0 ? (
            <EmptyState title="Bugün için randevu yok.">Telefonla gelen randevuları da &quot;Randevu ekle&quot; ile takvime işleyebilirsin.</EmptyState>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {agenda.map((a) => (
                <AgendaItem key={a.id} a={a} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="otel-bugun" className="night self-start rounded-panel bg-night p-6 text-night-ink">
          <h2 id="otel-bugun" className="flex items-center gap-2 text-2xl font-semibold">
            <BedDouble className="h-6 w-6 text-lamp" aria-hidden />
            Pet otel bugün
          </h2>
          {!clinic.boardingEnabled ? (
            <p className="mt-3 text-night-muted">
              Konaklama kapalı.{" "}
              {isAdmin && (
                <Link href="/panel/ayarlar#konaklama" className="font-semibold text-lamp underline">
                  Ayarlardan aç
                </Link>
              )}
            </p>
          ) : (
            <>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Konaklayan", value: boarding.staying.length + boarding.departures.length },
                  { label: "Gelecek", value: boarding.arrivals.length },
                  { label: "Ayrılacak", value: boarding.departures.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-card bg-night-2 px-2 py-3">
                    <dd className="font-display text-3xl font-bold text-lamp tabular">{s.value}</dd>
                    <dt className="text-xs text-night-muted">{s.label}</dt>
                  </div>
                ))}
              </dl>
              <BoardingMiniList title="Bugün gelecekler" icon={<LogIn className="h-4 w-4" />} items={boarding.arrivals} today={today} />
              <BoardingMiniList title="Bugün ayrılacaklar" icon={<LogOut className="h-4 w-4" />} items={boarding.departures} today={today} />
              <BoardingMiniList title="Onay bekleyen talepler" icon={<CircleAlert className="h-4 w-4" />} items={boarding.pending} today={today} />
              <Link href="/panel/konaklama" className="mt-6 inline-block font-semibold text-lamp hover:underline">
                Tüm konaklamalar
              </Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function SetupStep({ done, href, label, isAdmin }: { done: boolean; href: string; label: string; isAdmin: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={`flex h-6 w-6 items-center justify-center rounded-full ${done ? "bg-pine text-white" : "border-2 border-[#c99a2e]"}`}
      >
        {done && <Check className="h-4 w-4" />}
      </span>
      {done || !isAdmin ? (
        <span className={done ? "text-stone line-through" : ""}>{label}</span>
      ) : (
        <Link href={href} className="font-semibold underline underline-offset-2">
          {label}
        </Link>
      )}
    </li>
  );
}

function BoardingMiniList({
  title,
  icon,
  items,
  today,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; petName: string; species: "cat" | "dog"; checkIn: string; checkOut: string; status: "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "rejected"; ownerName: string }[];
  today: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 font-sans text-sm font-semibold tracking-normal text-night-muted">
        {icon}
        {title}
      </h3>
      <ul className="mt-2 space-y-3">
        {items.slice(0, 4).map((r) => (
          <li key={r.id} className="rounded-card bg-night-2 p-3">
            <p className="font-semibold">
              {r.petName} <span className="font-normal text-night-muted">({r.species === "cat" ? "kedi" : "köpek"})</span>
            </p>
            <p className="text-sm text-night-muted">
              {relativeDayLabel(r.checkIn, today)} giriş, {relativeDayWord(r.checkOut, today)} çıkış. {r.ownerName}
            </p>
            <div className="mt-2">
              <BoardingActions id={r.id} status={r.status} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
