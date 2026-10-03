import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicVets, getDayAppointments, getPendingAppointments } from "@/lib/data/panel";
import { addDays, formatDateLong, formatDateMedium, isValidDateString, relativeDayLabel, todayInIstanbul } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { AgendaItem } from "@/components/panel/AgendaItem";
import { DayCalendar } from "@/components/panel/DayCalendar";
import { buttonClass } from "@/components/ui/Button";
import { isOpenOn } from "@/lib/booking/availability";

export const metadata = { title: "Randevular" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { clinic } = await requireClinicUser();
  const sp = await searchParams;
  const today = todayInIstanbul();
  const date = typeof sp.tarih === "string" && isValidDateString(sp.tarih) ? sp.tarih : today;

  const [list, vetRows, pending] = await Promise.all([
    getDayAppointments(clinic.id, date),
    getClinicVets(clinic.id),
    getPendingAppointments(clinic.id, today),
  ]);
  const activeVets = vetRows.filter((v) => v.isActive || list.some((a) => a.vetId === v.id));
  const open = isOpenOn(clinic.workingHours, date, clinic.closedDates);
  const label = relativeDayLabel(date, today);
  const nav = (d: string) => `/panel/randevular?tarih=${d}`;
  const added = typeof sp.eklendi === "string" ? sp.eklendi.slice(0, 12) : null;

  return (
    <>
      <PageHeader
        title="Randevular"
        description="Gün seç, takvimi gör ve randevuların durumunu güncelle."
        actions={
          <Link href={`/panel/randevular/yeni?tarih=${date}`} className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden />
            Randevu ekle
          </Link>
        }
      />

      {added && (
        <p role="status" className="mb-6 rounded-control border border-pine/30 bg-pine-soft px-4 py-3 font-medium text-pine-dark">
          Randevu eklendi. Kodu: <span className="tabular">{added}</span>
        </p>
      )}

      {pending.length > 0 && (
        <section aria-labelledby="bekleyen" className="mb-10">
          <h2 id="bekleyen" className="mb-3 text-xl font-semibold">
            Onay bekleyenler <span className="text-stone tabular">({pending.length})</span>
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-panel border border-[#e9c46a] bg-surface">
            {pending.map((a) => (
              <AgendaItem key={a.id} a={a} showDate={relativeDayLabel(a.date, today)} />
            ))}
          </ul>
        </section>
      )}

      {/* Gün gezintisi */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={nav(addDays(date, -1))} className={buttonClass("secondary", "sm", "w-9 px-0")} aria-label="Önceki gün">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={nav(addDays(date, 1))} className={buttonClass("secondary", "sm", "w-9 px-0")} aria-label="Sonraki gün">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
        <h2 className="mx-2 text-xl font-semibold">
          {label === formatDateMedium(date) ? formatDateLong(date) : `${label}, ${formatDateMedium(date)}`}
        </h2>
        {date !== today && (
          <Link href="/panel/randevular" className={buttonClass("ghost", "sm")}>
            Bugüne dön
          </Link>
        )}
        <form action="/panel/randevular" className="ml-auto flex items-center gap-2">
          <label htmlFor="tarih" className="sr-only">
            Tarihe git
          </label>
          <input id="tarih" type="date" name="tarih" defaultValue={date} className="input min-h-9 w-auto py-1 text-sm" />
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Git
          </button>
        </form>
      </div>

      {!open && <p className="mb-4 rounded-control bg-paper px-4 py-3 text-sm text-stone">Klinik bu gün kapalı görünüyor. Online randevu alınmaz; klinikten randevu ekleyebilirsin.</p>}

      {activeVets.length > 0 && list.some((a) => a.status !== "cancelled") && (
        <div className="mb-8 hidden md:block">
          <DayCalendar clinic={clinic} date={date} appointments={list} vets={activeVets} />
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="Bu gün için randevu yok."
          action={
            <Link href={`/panel/randevular/yeni?tarih=${date}`} className={buttonClass("secondary", "md")}>
              Randevu ekle
            </Link>
          }
        />
      ) : (
        <section aria-label="Randevu listesi">
          <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
            {list.map((a) => (
              <AgendaItem key={a.id} a={a} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
