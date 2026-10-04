import Image from "next/image";
import Link from "next/link";
import { BedDouble } from "lucide-react";
import type { ClinicListItem } from "@/lib/data/public";
import { formatPrice } from "@/lib/format";
import { openStatus } from "@/lib/clinic-hours";
import { boardingPrice, boardingSpeciesOf } from "@/lib/booking/boarding";
import { relativeDayLabel, relativeDayWord, todayInIstanbul } from "@/lib/time";
import { ClinicCover } from "./ClinicCover";
import { slotHref } from "./UpcomingBoard";
import { photoUrl } from "@/lib/photos";

/** Airbnb tarzı klinik kartı: kapak görseli, kısa bilgi ve doğrudan randevuya giden boş saatler. */
export function ClinicCard({
  item,
  focus = "appointment",
  maxSlots = 3,
  showServicePrice = false,
}: {
  item: ClinicListItem;
  focus?: "appointment" | "boarding";
  maxSlots?: number;
  /** Hizmete göre filtrelenmiş listede kliniğin en düşük fiyatı yerine o hizmetin fiyatını göster. */
  showServicePrice?: boolean;
}) {
  const { clinic, minPrice, next, cover } = item;
  const status = openStatus(clinic);
  const today = todayInIstanbul();
  const species = boardingSpeciesOf(clinic);
  const nightly = species.map((s) => boardingPrice(clinic, s)).filter((p): p is number => p !== null);
  const boardingFrom = nightly.length ? Math.min(...nightly) : null;
  const href = focus === "boarding" && species.length > 0 ? `/klinik/${clinic.slug}/konaklama` : `/klinik/${clinic.slug}`;

  return (
    <article className="group relative">
      <div className="relative">
        {cover ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-paper">
            <Image
              src={photoUrl(cover.id)}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <ClinicCover
            slug={clinic.slug}
            name={clinic.name}
            boarding={species.length > 0}
            className="aspect-[4/3] w-full rounded-2xl transition-[filter] duration-200 group-hover:brightness-[0.97]"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {clinic.isDemo && (
            <span
              title="Örnek klinik: bilgiler gerçek değildir"
              className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm"
            >
              Demo
            </span>
          )}
          {species.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-night/90 px-2.5 py-1 text-xs font-semibold text-lamp shadow-sm">
              <BedDouble className="h-3.5 w-3.5" aria-hidden />
              Pet otel
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-sans text-[1rem] leading-snug font-semibold tracking-normal">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
              {clinic.name}
            </Link>
          </h3>
          <span className={`flex shrink-0 items-center gap-1.5 pt-0.5 text-sm ${status.open ? "text-pine" : "text-stone"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.open ? "bg-pine" : "bg-line-strong"}`} aria-hidden />
            {status.open ? "Açık" : "Kapalı"}
          </span>
        </div>
        <p className="text-[0.95rem] text-stone">
          {clinic.district}, {clinic.city}
        </p>
        {focus === "appointment" && next && (
          <p className="text-[0.95rem] text-stone">
            {next.serviceName}, {relativeDayWord(next.date, today)}
          </p>
        )}
        <p className="mt-1 text-[0.95rem]">
          {focus === "boarding" && boardingFrom !== null ? (
            <>
              <span className="font-semibold tabular">{formatPrice(boardingFrom)}</span> <span className="text-stone">/ gece</span>
            </>
          ) : showServicePrice && next?.servicePrice != null ? (
            <>
              <span className="font-semibold tabular">{formatPrice(next.servicePrice)}</span>
              <span className="text-stone"> başlangıç fiyatı</span>
            </>
          ) : minPrice !== null ? (
            <>
              <span className="font-semibold tabular">{formatPrice(minPrice)}</span>
              <span className="text-stone">&apos;den başlayan hizmetler</span>
            </>
          ) : (
            <span className="text-stone">Fiyat klinikte</span>
          )}
        </p>

        {focus === "appointment" &&
          (next ? (
            <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
              {next.times.slice(0, maxSlots).map((t) => (
                <Link
                  key={t.start}
                  href={slotHref(clinic.slug, next.serviceId, next.date, t.label)}
                  className="slot min-h-9 min-w-0 px-3 text-sm"
                  aria-label={`${clinic.name}, ${relativeDayLabel(next.date, today)} ${t.label} için randevu al`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone">Önümüzdeki 7 günde online boş saat yok.</p>
          ))}
      </div>
    </article>
  );
}
