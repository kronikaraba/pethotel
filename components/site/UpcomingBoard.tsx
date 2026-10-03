import Link from "next/link";
import type { ClinicListItem } from "@/lib/data/public";
import { relativeDayLabel, relativeDayWord, todayInIstanbul } from "@/lib/time";
import { DemoBadge } from "./DemoBadge";

export function slotHref(slug: string, serviceId: string, date: string, time: string) {
  const p = new URLSearchParams({ hizmet: serviceId, tarih: date, saat: time });
  return `/klinik/${slug}/randevu?${p.toString()}`;
}

/** Ana sayfadaki canlı "en yakın boş saatler" listesi. Saatler doğrudan randevu adımına götürür. */
export function UpcomingBoard({ items }: { items: ClinicListItem[] }) {
  const today = todayInIstanbul();
  return (
    <section aria-labelledby="bos-saatler" className="rounded-panel border border-line bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 pt-5 pb-4">
        <h2 id="bos-saatler" className="text-xl font-semibold">
          En yakın boş saatler
        </h2>
        <span className="flex items-center gap-1.5 text-sm text-stone">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine/50 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-pine" />
          </span>
          Canlı
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-stone">Şu an gösterilecek boş saat yok.</p>
          <Link href="/klinikler" className="mt-3 inline-block font-semibold text-pine underline-offset-4 hover:underline">
            Tüm klinikleri gör
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map(({ clinic, next }) =>
            next ? (
              <li key={clinic.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/klinik/${clinic.slug}`} className="font-semibold hover:text-pine">
                    {clinic.name}
                  </Link>
                  {clinic.isDemo && <DemoBadge />}
                </div>
                <p className="mt-0.5 text-sm text-stone">
                  {clinic.district}, {clinic.city}
                </p>
                <p className="mt-3 text-sm font-medium">
                  {next.serviceName}, {relativeDayWord(next.date, today)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {next.times.map((t) => (
                    <Link
                      key={t.start}
                      href={slotHref(clinic.slug, next.serviceId, next.date, t.label)}
                      className="slot px-3"
                      aria-label={`${clinic.name}, ${relativeDayLabel(next.date, today)} ${t.label} için randevu al`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </section>
  );
}
