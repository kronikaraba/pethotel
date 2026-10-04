import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, MapPin, SlidersHorizontal } from "lucide-react";
import { AutoSubmitForm } from "@/components/site/AutoSubmitForm";
import { ClinicCard } from "@/components/site/ClinicCard";
import { CategoryStrip } from "@/components/site/CategoryStrip";
import { CITIES, isCity } from "@/lib/cities";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/constants";
import { getCityStats, getDistricts, searchClinics } from "@/lib/data/public";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readFilters(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const city = one("sehir");
  const category = one("hizmet");
  return {
    city: isCity(city) ? city : "",
    district: one("ilce").slice(0, 40),
    category: (SERVICE_CATEGORIES as readonly string[]).includes(category) ? (category as ServiceCategory) : undefined,
    boarding: one("otel") === "1",
    q: one("q").slice(0, 60),
  };
}

function headline(f: ReturnType<typeof readFilters>) {
  const where = f.district ? `${f.district}, ${f.city}` : f.city;
  if (f.boarding) return where ? `${where} pet otelleri` : "Pet otel hizmeti veren klinikler";
  if (f.category) return `${where ? `${where}: ` : ""}${SERVICE_CATEGORY_LABELS[f.category]} için klinikler`;
  return where ? `${where} veteriner klinikleri` : "Veteriner klinikleri";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const f = readFilters(await searchParams);
  return { title: headline(f), description: "Klinikleri karşılaştır, boş saatleri gör ve online randevu al." };
}

export default async function ClinicsPage({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(await searchParams);
  const [items, districts, cityStats] = await Promise.all([
    searchClinics({ city: f.city || undefined, district: f.district || undefined, category: f.category, boarding: f.boarding, q: f.q || undefined }),
    f.city ? getDistricts(f.city) : Promise.resolve([]),
    getCityStats(),
  ]);
  const popular = cityStats.map((c) => c.city);
  const activeCount = [f.city, f.district, f.category, f.boarding, f.q].filter(Boolean).length;
  const hasFilters = activeCount > 0;

  const hrefFor = (category: ServiceCategory | undefined) => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.city) p.set("sehir", f.city);
    if (f.district) p.set("ilce", f.district);
    if (category) p.set("hizmet", category);
    if (f.boarding) p.set("otel", "1");
    const qs = p.toString();
    return qs ? `/klinikler?${qs}` : "/klinikler";
  };

  const pill =
    "min-h-12 rounded-full border border-line-strong bg-surface pl-4 text-[0.95rem] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] focus:border-ink focus:outline-none";

  const filterForm = (
    <AutoSubmitForm action="/klinikler" scroll={false} className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      {f.category && <input type="hidden" name="hizmet" value={f.category} />}
      <div className="lg:w-60">
        <label htmlFor="f-q" className="label">
          Klinik ya da semt
        </label>
        <input id="f-q" name="q" type="search" defaultValue={f.q} placeholder="Örn. Kadıköy" className={`input ${pill}`} />
      </div>
      <div className="lg:w-52">
        <label htmlFor="f-sehir" className="label">
          Şehir
        </label>
        <select id="f-sehir" name="sehir" defaultValue={f.city} className={`input ${pill}`}>
          <option value="">Tüm şehirler</option>
          {popular.length > 0 && (
            <optgroup label="Klinik olan şehirler">
              {popular.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </optgroup>
          )}
          <optgroup label="Diğer şehirler">
            {CITIES.filter((c) => !popular.includes(c)).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </optgroup>
        </select>
      </div>
      {f.city && (
        <div className="lg:w-52">
          <label htmlFor="f-ilce" className="label">
            İlçe
          </label>
          <select id="f-ilce" name="ilce" defaultValue={f.district} className={`input ${pill}`}>
            <option value="">Tüm ilçeler</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      )}
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-full border border-line-strong bg-surface px-4 transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-night-ink">
        <input type="checkbox" name="otel" value="1" defaultChecked={f.boarding} className="h-5 w-5 accent-[var(--color-lamp)]" />
        <BedDouble className="h-5 w-5" aria-hidden />
        <span className="font-semibold whitespace-nowrap">Pet otel hizmeti olanlar</span>
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" className="inline-flex min-h-12 items-center rounded-full bg-pine px-6 font-semibold text-white hover:bg-pine-dark">
          Filtrele
        </button>
        {hasFilters && (
          <Link href="/klinikler" className="font-semibold underline underline-offset-4 hover:text-pine">
            Filtreleri temizle
          </Link>
        )}
      </div>
    </AutoSubmitForm>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10">
      <CategoryStrip active={f.category} hrefFor={hrefFor} showAll label="Hizmete göre filtrele" />

      <div className="mt-6">
        {/* Mobilde açılır filtre paneli */}
        <details className="group rounded-2xl border border-line-strong bg-surface lg:hidden" open={false}>
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              Filtreler
              {hasFilters && (
                <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-white tabular" aria-label={`${activeCount} filtre seçili`}>
                  {activeCount}
                </span>
              )}
            </span>
            <span className="text-sm text-stone group-open:hidden">Göster</span>
            <span className="hidden text-sm text-stone group-open:inline">Gizle</span>
          </summary>
          <div className="border-t border-line p-4">{filterForm}</div>
        </details>

        <div className="hidden lg:block" role="search" aria-label="Filtreler">
          {filterForm}
        </div>
      </div>

      <h1 className="mt-10 text-2xl font-bold sm:text-3xl">{headline(f)}</h1>
      <p className="mt-1 text-stone" aria-live="polite">
        {items.length > 0
          ? `${items.length} klinik listeleniyor. En erken boş saati olan en başta.`
          : "Eşleşen klinik yok."}
      </p>

      <section aria-label="Klinikler" className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-8 sm:p-10">
            <MapPin className="h-8 w-8 text-pine" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold">Bu filtrelerle eşleşen klinik bulamadık.</h2>
            <p className="mt-2 max-w-[52ch] text-stone">
              İlçe ya da hizmet filtresini kaldırmayı dene. Yakın şehirlerdeki klinikler de randevu kabul ediyor olabilir.
            </p>
            <Link href="/klinikler" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-pine px-5 font-semibold text-white hover:bg-pine-dark">
              Tüm klinikleri göster
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.clinic.id}>
                <ClinicCard item={item} focus={f.boarding ? "boarding" : "appointment"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
