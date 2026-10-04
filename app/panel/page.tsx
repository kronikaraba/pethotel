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
import type { Clinic } from "@/lib/db/schema";

export const metadata = { title: "Bugün" };

export default async function PanelHome() {
  const { clinic, user, isAdmin } = await requireClinicUser();
  const today = todayInIstanbul();
  const status = openStatus(clinic);
  const firstName = user.name.split(" ")[0];
  const greeting = (
    <>
      {formatDateLong(today)}. <span className={status.open ? "font-medium text-pine" : ""}>{status.label}.</span>
    </>
  );

  if (clinic.kind === "hotel") {
    return <HotelHome clinic={clinic} firstName={firstName} greeting={greeting} isAdmin={isAdmin} today={today} />;
  }

  // Veteriner kliniği ve pet sitter: randevu (ziyaret) takvimi
  const sitter = clinic.kind === "sitter";
  const [agenda, counts, svc, vetList] = await Promise.all([
    getDayAppointments(clinic.id, today),
    getDashboardCounts(clinic.id, today),
    getClinicServices(clinic.id),
    getClinicVets(clinic.id),
  ]);
  const active = agenda.filter((a) => a.status !== "cancelled");
  const hasService = svc.some((s) => s.isActive);
  const hasVet = vetList.some((v) => v.isActive);
  const needsSetup = !hasService || (!sitter && !hasVet) || (sitter && (!clinic.description || svc.some((s) => s.isActive && s.price === null)));
  const word = sitter ? "ziyaret" : "randevu";

  const stats = [
    { label: `Bugünkü ${word}`, value: counts.today, href: "/panel/randevular" },
    { label: "Önümüzdeki 7 gün", value: counts.week, href: "/panel/randevular" },
    { label: `Onay bekleyen ${word}`, value: counts.pendingAppointments, href: "/panel/randevular", warn: counts.pendingAppointments > 0 },
  ];

  return (
    <>
      <PageHeader
        title={`Merhaba ${firstName}`}
        description={greeting}
        actions={
          <Link href="/panel/randevular/yeni" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            {sitter ? "Ziyaret ekle" : "Randevu ekle"}
          </Link>
        }
      />

      {needsSetup && (
        <section aria-labelledby="kurulum" className="mb-8 rounded-panel border border-[#e9c46a] bg-lamp-soft p-6">
          <h2 id="kurulum" className="flex items-center gap-2 text-xl font-semibold">
            <CircleAlert className="h-5 w-5" aria-hidden />
            {sitter ? "Profilini tamamla" : "Online randevuya başlamak için iki adım kaldı"}
          </h2>
          <ol className="mt-4 space-y-2">
            {sitter ? (
              <>
                <SetupStep done={hasService && svc.every((s) => !s.isActive || s.price !== null)} href="/panel/hizmetler" label="Hizmetlerine fiyat ve süre yaz" isAdmin={isAdmin} />
                <SetupStep done={Boolean(clinic.description)} href="/panel/ayarlar" label="Profiline kendini tanıtan bir yazı ekle" isAdmin={isAdmin} />
              </>
            ) : (
              <>
                <SetupStep done={hasService} href="/panel/hizmetler" label="En az bir hizmet ekle (süre ve fiyatıyla)" isAdmin={isAdmin} />
                <SetupStep done={hasVet} href="/panel/ekip" label="Randevu alacak veterinerleri ekle" isAdmin={isAdmin} />
              </>
            )}
          </ol>
        </section>
      )}

      <dl className="mb-10 grid grid-cols-1 overflow-hidden rounded-panel border border-line bg-surface sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className={`border-line p-5 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}>
            <dt className="text-sm text-stone">{s.label}</dt>
            <dd className={`font-display mt-1 text-4xl font-bold tabular ${s.warn ? "text-[#a86b00]" : ""}`}>
              <Link href={s.href} className="hover:underline">
                {s.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="ajanda">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="ajanda" className="text-2xl font-semibold">
            {sitter ? "Bugünün ziyaretleri" : "Bugünün randevuları"}
          </h2>
          <Link href="/panel/randevular" className="text-sm font-semibold text-pine hover:underline">
            Takvimi aç
          </Link>
        </div>
        {active.length === 0 ? (
          <EmptyState title={sitter ? "Bugün için ziyaret yok." : "Bugün için randevu yok."}>
            {sitter
              ? "Telefonla ya da mesajla gelen talepleri de \"Ziyaret ekle\" ile takvimine işleyebilirsin."
              : "Telefonla gelen randevuları da \"Randevu ekle\" ile takvime işleyebilirsin."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
            {agenda.map((a) => (
              <AgendaItem key={a.id} a={a} sitter={sitter} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

async function HotelHome({
  clinic,
  firstName,
  greeting,
  isAdmin,
  today,
}: {
  clinic: Clinic;
  firstName: string;
  greeting: React.ReactNode;
  isAdmin: boolean;
  today: string;
}) {
  const boarding = await getBoardingOverview(clinic.id, today);
  const needsSetup =
    clinic.boardingCatCapacity + clinic.boardingDogCapacity === 0 ||
    (clinic.boardingCatCapacity > 0 && clinic.boardingCatPrice === null) ||
    (clinic.boardingDogCapacity > 0 && clinic.boardingDogPrice === null);
  const stats = [
    { label: "Konaklayan", value: boarding.staying.length + boarding.departures.length },
    { label: "Bugün gelecek", value: boarding.arrivals.length },
    { label: "Bugün ayrılacak", value: boarding.departures.length },
    { label: "Onay bekleyen talep", value: boarding.pending.length, warn: boarding.pending.length > 0 },
  ];

  return (
    <>
      <PageHeader
        title={`Merhaba ${firstName}`}
        description={greeting}
        actions={
          <Link href="/panel/konaklama" className={buttonClass("night", "md")}>
            <BedDouble className="h-4 w-4" aria-hidden />
            Konaklamalar
          </Link>
        }
      />

      {needsSetup && (
        <section aria-labelledby="kurulum" className="mb-8 rounded-panel border border-[#e9c46a] bg-lamp-soft p-6">
          <h2 id="kurulum" className="flex items-center gap-2 text-xl font-semibold">
            <CircleAlert className="h-5 w-5" aria-hidden />
            Konaklama almaya başlamak için kapasite ve fiyatlarını gir
          </h2>
          <ol className="mt-4 space-y-2">
            <SetupStep
              done={!needsSetup}
              href="/panel/ayarlar#konaklama"
              label="Kedi ve köpek kapasitesini, gecelik fiyatlarını yaz"
              isAdmin={isAdmin}
            />
          </ol>
        </section>
      )}

      {!clinic.boardingEnabled && (
        <p className="mb-8 rounded-panel border border-line bg-surface p-5">
          Şu anda yeni konaklama talebi almıyorsun.{" "}
          {isAdmin && (
            <Link href="/panel/ayarlar#konaklama" className="font-semibold text-pine underline">
              Otel ayarlarından aç
            </Link>
          )}
        </p>
      )}

      <dl className="mb-10 grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-surface md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`border-line p-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
            <dt className="text-sm text-stone">{s.label}</dt>
            <dd className={`font-display mt-1 text-4xl font-bold tabular ${s.warn ? "text-[#a86b00]" : ""}`}>
              <Link href="/panel/konaklama" className="hover:underline">
                {s.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="otel-bugun" className="night rounded-panel bg-night p-6 text-night-ink sm:p-8">
        <h2 id="otel-bugun" className="flex items-center gap-2 text-2xl font-semibold">
          <BedDouble className="h-6 w-6 text-lamp" aria-hidden />
          Otel bugün
        </h2>
        {boarding.arrivals.length + boarding.departures.length + boarding.pending.length === 0 ? (
          <p className="mt-3 text-night-muted">Bugün giriş, çıkış ya da bekleyen talep yok.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-3">
            <BoardingMiniList title="Bugün gelecekler" icon={<LogIn className="h-4 w-4" />} items={boarding.arrivals} today={today} />
            <BoardingMiniList title="Bugün ayrılacaklar" icon={<LogOut className="h-4 w-4" />} items={boarding.departures} today={today} />
            <BoardingMiniList title="Onay bekleyen talepler" icon={<CircleAlert className="h-4 w-4" />} items={boarding.pending} today={today} />
          </div>
        )}
        <Link href="/panel/konaklama" className="mt-6 inline-block font-semibold text-lamp hover:underline">
          Tüm konaklamalar ve doluluk
        </Link>
      </section>
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
