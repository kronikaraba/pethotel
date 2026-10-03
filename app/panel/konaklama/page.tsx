import Link from "next/link";
import { Phone } from "lucide-react";
import { requireClinicUser } from "@/lib/auth/dal";
import { getBoardingOverview, getOccupancy } from "@/lib/data/panel";
import type { BoardingReservation } from "@/lib/db/schema";
import { formatDateShort, formatWeekdayShort, parseDate, relativeDayLabel, relativeDayWord, todayInIstanbul } from "@/lib/time";
import { formatPhone, formatPrice, phoneHref } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { BoardingActions } from "@/components/panel/BoardingActions";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Pet otel" };

export default async function BoardingPanelPage() {
  const { clinic, isAdmin } = await requireClinicUser();
  const today = todayInIstanbul();

  if (!clinic.boardingEnabled) {
    return (
      <>
        <PageHeader title="Pet otel" />
        <EmptyState
          title="Konaklama hizmeti kapalı."
          action={
            isAdmin ? (
              <Link href="/panel/ayarlar#konaklama" className={buttonClass("night", "md")}>
                Konaklamayı aç
              </Link>
            ) : undefined
          }
        >
          Açtığında kedi ve köpek kapasitesini ve gecelik fiyatları belirleyebilirsin; müşteriler sitede tarih seçip talep gönderir.
        </EmptyState>
      </>
    );
  }

  const [overview, occupancy] = await Promise.all([getBoardingOverview(clinic.id, today), getOccupancy(clinic.id, today, 14)]);
  const caps = { cat: clinic.boardingCatCapacity, dog: clinic.boardingDogCapacity };

  return (
    <>
      <PageHeader title="Pet otel" description="Talepleri onayla, giriş ve çıkışları işaretle, önümüzdeki gecelerin doluluğunu izle." />

      {/* Doluluk */}
      <section aria-labelledby="doluluk" className="night mb-10 overflow-hidden rounded-panel bg-night p-5 text-night-ink sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="doluluk" className="text-xl font-semibold">
            Önümüzdeki 14 gece
          </h2>
          <p className="text-sm text-night-muted">Bekleyen talepler de kapasiteden düşülür.</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-separate border-spacing-x-1 text-center text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-16 text-left font-normal text-night-muted">
                  <span className="sr-only">Tür</span>
                </th>
                {occupancy.map((n) => (
                  <th key={n.date} scope="col" className="pb-2 font-normal text-night-muted">
                    <span className="block text-xs">{n.date === today ? "Bu gece" : formatWeekdayShort(n.date)}</span>
                    <span className="font-display text-base font-semibold text-night-ink tabular">{parseDate(n.date).getUTCDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["cat", "dog"] as const)
                .filter((s) => caps[s] > 0)
                .map((s) => (
                  <tr key={s}>
                    <th scope="row" className="py-1 pr-2 text-left font-medium">
                      {s === "cat" ? "Kedi" : "Köpek"}
                      <span className="block text-xs font-normal text-night-muted">{caps[s]} yer</span>
                    </th>
                    {occupancy.map((n) => {
                      const used = n[s];
                      const ratio = Math.min(1, used / caps[s]);
                      const full = used >= caps[s];
                      return (
                        <td key={n.date} className="py-1">
                          <div
                            className="mx-auto flex h-12 w-full max-w-10 items-end overflow-hidden rounded-[8px] bg-night-2"
                            title={`${formatDateShort(n.date)}: ${used}/${caps[s]}`}
                          >
                            <div className={`w-full ${full ? "bg-coral" : "bg-lamp"}`} style={{ height: `${ratio * 100}%` }} />
                          </div>
                          <span className={`mt-1 block text-xs font-semibold tabular ${full ? "text-[#ffb4a8]" : "text-night-muted"}`}>
                            {used}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-10">
        <Group title="Onay bekleyen talepler" items={overview.pending} today={today} highlight empty="Bekleyen talep yok." />
        <Group title="Bugün gelecekler" items={overview.arrivals} today={today} empty="Bugün giriş yapacak misafir yok." />
        <Group title="Bugün ayrılacaklar" items={overview.departures} today={today} empty="Bugün çıkış yapacak misafir yok." />
        <Group title="Konaklayanlar" items={overview.staying} today={today} empty="Şu an konaklayan misafir yok." />
        <Group title="Yaklaşan konaklamalar" items={overview.upcoming} today={today} empty="Onaylı yaklaşan konaklama yok." />
        {overview.past.length > 0 && <Group title="Geçmiş ve kapanan" items={overview.past} today={today} muted />}
      </div>
    </>
  );
}

function Group({
  title,
  items,
  today,
  empty,
  highlight,
  muted,
}: {
  title: string;
  items: BoardingReservation[];
  today: string;
  empty?: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-xl font-semibold">
        {title} {items.length > 0 && <span className="text-stone tabular">({items.length})</span>}
      </h2>
      {items.length === 0 ? (
        <p className="text-stone">{empty}</p>
      ) : (
        <ul className={`divide-y divide-line overflow-hidden rounded-panel border bg-surface ${highlight ? "border-[#e9c46a]" : "border-line"}`}>
          {items.map((r) => (
            <li key={r.id} className={`grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:px-5 ${muted ? "opacity-75" : ""}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {r.petName}
                    <span className="font-normal text-stone">
                      , {r.species === "cat" ? "kedi" : "köpek"}
                      {r.petBreed ? `, ${r.petBreed}` : ""}
                      {r.petAge ? `, ${r.petAge}` : ""}
                    </span>
                  </p>
                  <StatusPill status={r.status} kind="boarding" />
                  {!r.vaccinated && <span className="text-xs font-semibold text-coral">Aşı onayı yok</span>}
                </div>
                <p className="mt-0.5 text-[0.95rem]">
                  {relativeDayLabel(r.checkIn, today)} giriş, {relativeDayWord(r.checkOut, today)} çıkış
                  <span className="text-stone">
                    {" "}
                    ({r.nights} gece{r.totalPrice !== null ? `, ${formatPrice(r.totalPrice)}` : ""})
                  </span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-stone">
                  <span>{r.ownerName}</span>
                  <a href={phoneHref(r.ownerPhone)} className="inline-flex items-center gap-1 font-medium text-pine hover:underline">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    {formatPhone(r.ownerPhone)}
                  </a>
                  <span className="tabular">{r.code}</span>
                </p>
                {r.notes && <p className="mt-2 rounded-[10px] bg-paper px-3 py-2 text-sm">{r.notes}</p>}
                {r.clinicNote && <p className="mt-2 text-sm text-stone">Not: {r.clinicNote}</p>}
              </div>
              <div className="sm:pt-1">
                <BoardingActions id={r.id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
