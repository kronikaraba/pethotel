import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, ChevronRight, Clock, Mail, MapPin, Moon, Phone } from "lucide-react";
import { getClinicPageData } from "@/lib/data/public";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { durationLabel, formatPhone, formatPrice, phoneHref } from "@/lib/format";
import { openStatus, weekSummary } from "@/lib/clinic-hours";
import { boardingCapacity, boardingPrice, boardingSpeciesOf } from "@/lib/booking/boarding";
import { buttonClass } from "@/components/ui/Button";
import { DemoBadge } from "@/components/site/DemoBadge";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getClinicPageData((await params).slug);
  if (!data) return { title: "Klinik bulunamadı" };
  const { clinic } = data;
  return {
    title: `${clinic.name} (${clinic.district}, ${clinic.city})`,
    description: `${clinic.name} için online randevu al: hizmetler, fiyatlar, çalışma saatleri${clinic.boardingEnabled ? " ve pet otel" : ""}.`,
  };
}

function mapsUrl(name: string, address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export default async function ClinicPage({ params }: { params: Params }) {
  const data = await getClinicPageData((await params).slug);
  if (!data) notFound();
  const { clinic, services, vets } = data;
  const status = openStatus(clinic);
  const species = boardingSpeciesOf(clinic);
  const grouped = SERVICE_CATEGORIES.map((c) => ({ category: c, items: services.filter((s) => s.category === c) })).filter(
    (g) => g.items.length > 0,
  );
  const canBook = services.length > 0 && vets.length > 0;
  const bookHref = `/klinik/${clinic.slug}/randevu`;
  const boardHref = `/klinik/${clinic.slug}/konaklama`;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <nav aria-label="Konum" className="text-sm text-stone">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/klinikler" className="hover:text-pine">
              Klinikler
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-4 w-4" />
          </li>
          <li>
            <Link href={`/klinikler?sehir=${encodeURIComponent(clinic.city)}`} className="hover:text-pine">
              {clinic.city}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="h-4 w-4" />
          </li>
          <li aria-current="page" className="text-ink">
            {clinic.name}
          </li>
        </ol>
      </nav>

      {/* Başlık */}
      <header className="mt-6 grid grid-cols-1 gap-6 border-b border-line pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">{clinic.name}</h1>
            {clinic.isDemo && <DemoBadge />}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-stone">
            <li className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden />
              {clinic.district}, {clinic.city}
            </li>
            <li className={`inline-flex items-center gap-2 ${status.open ? "font-medium text-pine" : ""}`}>
              <Clock className="h-4 w-4" aria-hidden />
              {status.label}
            </li>
            <li>
              <a href={phoneHref(clinic.phone)} className="inline-flex items-center gap-2 hover:text-pine">
                <Phone className="h-4 w-4" aria-hidden />
                {formatPhone(clinic.phone)}
              </a>
            </li>
          </ul>
        </div>
        <div className="hidden gap-3 md:flex">
          {canBook && (
            <Link href={bookHref} className={buttonClass("primary", "lg")}>
              Randevu al
            </Link>
          )}
          {species.length > 0 && (
            <Link href={boardHref} className={buttonClass("night", "lg")}>
              Konaklama iste
            </Link>
          )}
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-14">
          {clinic.description && (
            <section aria-labelledby="hakkinda">
              <h2 id="hakkinda" className="sr-only">
                Hakkında
              </h2>
              <p className="max-w-[62ch] text-lg">{clinic.description}</p>
            </section>
          )}

          {/* Hizmetler */}
          <section aria-labelledby="hizmetler">
            <h2 id="hizmetler" className="text-2xl font-bold sm:text-3xl">
              Hizmetler ve fiyatlar
            </h2>
            {grouped.length === 0 ? (
              <p className="mt-4 text-stone">Klinik henüz online randevuya açık hizmet eklemedi.</p>
            ) : (
              <div className="mt-6 space-y-8">
                {grouped.map((g) => (
                  <div key={g.category}>
                    <h3 className="font-sans text-sm font-semibold tracking-normal text-stone">{SERVICE_CATEGORY_LABELS[g.category]}</h3>
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                      {g.items.map((s) => (
                        <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-4 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_auto]">
                          <div className="min-w-0">
                            <p className="font-semibold">{s.name}</p>
                            {s.description && <p className="mt-0.5 text-sm text-stone">{s.description}</p>}
                          </div>
                          <p className="col-start-1 row-start-2 text-sm text-stone tabular sm:col-start-auto sm:row-start-auto">
                            {durationLabel(s.durationMinutes)}
                            <span className="font-semibold text-ink sm:hidden">
                              {", "}
                              {s.price !== null ? formatPrice(s.price) : "fiyat klinikte"}
                            </span>
                          </p>
                          <p className="hidden text-right font-semibold tabular sm:block">{s.price !== null ? formatPrice(s.price) : "Klinikte"}</p>
                          {canBook && (
                            <Link
                              href={`${bookHref}?hizmet=${s.id}`}
                              className={buttonClass("secondary", "sm", "col-start-2 row-span-2 row-start-1 sm:col-start-auto sm:row-span-1 sm:row-start-auto")}
                              aria-label={`Seç: ${s.name} için randevu al`}
                            >
                              Seç
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-sm text-stone">Fiyatlar kliniğin paylaştığı başlangıç fiyatlarıdır; muayene sonrası değişebilir.</p>
              </div>
            )}
          </section>

          {/* Ekip */}
          {vets.length > 0 && (
            <section aria-labelledby="ekip">
              <h2 id="ekip" className="text-2xl font-bold sm:text-3xl">
                Veteriner ekibi
              </h2>
              <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {vets.map((v) => (
                  <li key={v.id} className="flex gap-4">
                    <span
                      aria-hidden
                      className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pine-soft text-lg font-bold text-pine"
                    >
                      {initials(v.name)}
                    </span>
                    <div>
                      <p className="font-semibold">{v.name}</p>
                      <p className="text-sm text-stone">{v.title}</p>
                      {v.bio && <p className="mt-1 text-sm">{v.bio}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Pet otel */}
          {species.length > 0 && (
            <section aria-labelledby="pet-otel" className="night rounded-panel bg-night p-7 text-night-ink sm:p-9">
              <h2 id="pet-otel" className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
                Pet otel
                <Moon className="h-6 w-6 text-lamp" aria-hidden />
              </h2>
              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {species.map((sp) => {
                  const price = boardingPrice(clinic, sp);
                  return (
                    <div key={sp} className="rounded-card bg-night-2 p-5">
                      <dt className="flex items-center gap-2 text-night-muted">
                        <BedDouble className="h-5 w-5 text-lamp" aria-hidden />
                        {sp === "cat" ? "Kedi konaklaması" : "Köpek konaklaması"}
                      </dt>
                      <dd className="mt-2">
                        <span className="font-display text-3xl font-bold text-lamp tabular">{price !== null ? formatPrice(price) : "Klinikte"}</span>
                        {price !== null && <span className="ml-1 text-night-muted">/ gece</span>}
                        <span className="mt-1 block text-sm text-night-muted">{boardingCapacity(clinic, sp)} misafir kapasitesi</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {clinic.boardingNotes && <p className="mt-6 max-w-[60ch] text-night-ink/90">{clinic.boardingNotes}</p>}
              <Link href={boardHref} className={buttonClass("lamp", "lg", "mt-7")}>
                Konaklama iste
              </Link>
            </section>
          )}
        </div>

        {/* Yan bilgi */}
        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="saatler" className="rounded-panel border border-line bg-surface p-6">
            <h2 id="saatler" className="text-xl font-semibold">
              Çalışma saatleri
            </h2>
            <dl className="mt-4 space-y-2.5">
              {weekSummary(clinic.workingHours).map((row) => (
                <div key={row.days} className="flex justify-between gap-4 text-[0.95rem]">
                  <dt className="text-stone">{row.days}</dt>
                  <dd className="text-right tabular">
                    <span className={row.closed ? "text-stone" : "font-medium"}>{row.hours}</span>
                    {row.breakText && <span className="block text-sm text-stone">{row.breakText}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 border-t border-line pt-4 text-sm text-stone">
              Online randevu en az {clinic.minNoticeMinutes >= 60 ? `${Math.round(clinic.minNoticeMinutes / 60)} saat` : `${clinic.minNoticeMinutes} dakika`} önceden
              alınabilir. Takvim {clinic.maxDaysAhead} gün ilerisine kadar açık.
            </p>
          </section>

          <section aria-labelledby="iletisim" className="rounded-panel border border-line bg-surface p-6">
            <h2 id="iletisim" className="text-xl font-semibold">
              İletişim ve adres
            </h2>
            <address className="mt-4 space-y-3 text-[0.95rem] not-italic">
              <p>{clinic.address}</p>
              <p>
                <a href={phoneHref(clinic.phone)} className="inline-flex items-center gap-2 font-medium text-pine hover:underline">
                  <Phone className="h-4 w-4" aria-hidden />
                  {formatPhone(clinic.phone)}
                </a>
              </p>
              {clinic.email && (
                <p>
                  <a href={`mailto:${clinic.email}`} className="inline-flex items-center gap-2 text-pine hover:underline">
                    <Mail className="h-4 w-4" aria-hidden />
                    {clinic.email}
                  </a>
                </p>
              )}
            </address>
            <a
              href={mapsUrl(clinic.name, clinic.address)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("secondary", "md", "mt-5 w-full")}
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Haritada aç
            </a>
          </section>
        </aside>
      </div>

      {/* Mobilde sabit randevu çubuğu */}
      {(canBook || species.length > 0) && (
        <div className="sticky bottom-0 z-30 -mx-4 mt-10 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
          <div className="flex gap-3">
            {canBook && (
              <Link href={bookHref} className={buttonClass("primary", "lg", "flex-1")}>
                Randevu al
              </Link>
            )}
            {species.length > 0 && (
              <Link href={boardHref} className={buttonClass("night", "lg", "flex-1")}>
                Pet otel
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
