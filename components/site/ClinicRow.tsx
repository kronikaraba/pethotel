import Link from "next/link";
import { BedDouble, Clock, MapPin } from "lucide-react";
import type { ClinicListItem } from "@/lib/data/public";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { openStatus } from "@/lib/clinic-hours";
import { boardingPrice, boardingSpeciesOf } from "@/lib/booking/boarding";
import { relativeDayLabel, todayInIstanbul } from "@/lib/time";
import { DemoBadge } from "./DemoBadge";
import { slotHref } from "./UpcomingBoard";
import { buttonClass } from "@/components/ui/Button";

export function ClinicRow({ item, focus }: { item: ClinicListItem; focus: "appointment" | "boarding" }) {
  const { clinic, categories, minPrice, next } = item;
  const status = openStatus(clinic);
  const today = todayInIstanbul();
  const species = boardingSpeciesOf(clinic);
  const nightly = species.map((s) => boardingPrice(clinic, s)).filter((p): p is number => p !== null);
  const boardingFrom = nightly.length ? Math.min(...nightly) : null;

  return (
    <article className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="text-xl font-semibold">
            <Link href={`/klinik/${clinic.slug}`} className="hover:text-pine">
              {clinic.name}
            </Link>
          </h2>
          {clinic.isDemo && <DemoBadge />}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden />
            {clinic.district}, {clinic.city}
          </span>
          <span className={`inline-flex items-center gap-1.5 ${status.open ? "text-pine" : ""}`}>
            <Clock className="h-4 w-4" aria-hidden />
            {status.label}
          </span>
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Hizmetler">
          {categories.slice(0, 5).map((c) => (
            <li key={c} className="rounded-full bg-paper px-2.5 py-1 text-sm">
              {SERVICE_CATEGORY_LABELS[c]}
            </li>
          ))}
          {categories.length > 5 && <li className="px-1 py-1 text-sm text-stone">+{categories.length - 5}</li>}
        </ul>

        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone">
          {minPrice !== null && <span>Hizmet fiyatları {formatPrice(minPrice)} ve üzeri</span>}
          {species.length > 0 && (
            <span className="inline-flex items-center gap-1.5 font-medium text-night">
              <BedDouble className="h-4 w-4" aria-hidden />
              Pet otel: {species.map((s) => (s === "cat" ? "kedi" : "köpek")).join(" ve ")}
              {boardingFrom !== null && `, gecelik ${formatPrice(boardingFrom)} ve üzeri`}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:w-64 md:items-stretch">
        {focus === "boarding" && species.length > 0 ? (
          <>
            <Link href={`/klinik/${clinic.slug}/konaklama`} className={buttonClass("night", "md")}>
              Konaklama iste
            </Link>
            <Link href={`/klinik/${clinic.slug}`} className={buttonClass("secondary", "md")}>
              Kliniği incele
            </Link>
          </>
        ) : next ? (
          <>
            <div>
              <p className="text-sm text-stone">En erken boş saat</p>
              <p className="font-display text-2xl leading-tight font-semibold tabular">
                {relativeDayLabel(next.date, today)} {next.times[0].label}
              </p>
              <p className="text-sm text-stone">{next.serviceName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={slotHref(clinic.slug, next.serviceId, next.date, next.times[0].label)}
                className={buttonClass("primary", "md", "flex-1")}
              >
                Randevu al
              </Link>
              {species.length > 0 && (
                <Link href={`/klinik/${clinic.slug}/konaklama`} className={buttonClass("secondary", "md", "flex-1")}>
                  Pet otel
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-stone">Önümüzdeki 7 günde online boş saat yok.</p>
            <Link href={`/klinik/${clinic.slug}`} className={buttonClass("secondary", "md")}>
              Kliniği incele
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
