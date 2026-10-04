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
import { ClinicCover } from "@/components/site/ClinicCover";

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
  const prices = services.map((s) => s.price).filter((p): p is number => p !== null);
  const minPrice = prices.length ? Math.min(...prices) : null;

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
      <header className="mt-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.875rem] leading-[1.1] font-bold sm:text-4xl">{clinic.name}</h1>
            {clinic.isDemo && <DemoBadge />}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-stone">
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
      </header>

      <ClinicCover
        slug={clinic.slug}
        name={clinic.name}
        boarding={species.length > 0}
        size="hero"
        className="mt-6 aspect-[4/3] w-full rounded-3xl sm:aspect-[2.6/1]"
      />

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-16">
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
            <section aria-labelledby="pet-otel" className="night rounded-3xl bg-night p-7 text-night-ink sm:p-9">
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
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          {(canBook || species.length > 0) && (
            <section
              aria-label="Randevu ve konaklama"
              className="hidden rounded-2xl border border-line bg-surface p-6 shadow-[0_6px_16px_rgba(0,0,0,0.12)] md:block"
            >
              <p className="text-lg">
                {minPrice !== null ? (
                  <>
                    <span className="text-2xl font-semibold tabular">{formatPrice(minPrice)}</span>
                    <span className="text-stone">&apos;den başlayan hizmetler</span>
                  </>
                ) : (
                  <span className="font-semibold">Fiyatlar klinikte</span>
                )}
              </p>
              <p className={`mt-1 inline-flex items-center gap-2 text-sm ${status.open ? "font-medium text-pine" : "text-stone"}`}>
                <Clock className="h-4 w-4" aria-hidden />
                {status.label}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {canBook && (
                  <Link href={bookHref} className={buttonClass("primary", "lg", "w-full rounded-xl")}>
                    Randevu al
                  </Link>
                )}
                {species.length > 0 && (
                  <Link href={boardHref} className={buttonClass("night", "lg", "w-full rounded-xl")}>
                    Konaklama iste
                  </Link>
                )}
              </div>
              <p className="mt-4 text-center text-sm text-stone">Randevu ücretsizdir, ödemeyi klinikte yaparsın.</p>
            </section>
          )}

          <section aria-labelledby="saatler" className="rounded-2xl border border-line bg-surface p-6">
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

          <section aria-labelledby="iletisim" className="rounded-2xl border border-line bg-surface p-6">
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
        <div className="sticky bottom-0 z-30 -mx-4 mt-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:hidden">
          {minPrice !== null && (
            <p className="mb-2 text-sm">
              <span className="font-semibold tabular">{formatPrice(minPrice)}</span>
              <span className="text-stone">&apos;den başlayan hizmetler</span>
            </p>
          )}
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
