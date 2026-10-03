import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, MapPin, SlidersHorizontal } from "lucide-react";
import { AutoSubmitForm } from "@/components/site/AutoSubmitForm";
import { ClinicRow } from "@/components/site/ClinicRow";
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

  const filterForm = (
    <AutoSubmitForm action="/klinikler" scroll={false} className="space-y-4">
      <div>
        <label htmlFor="f-q" className="label">
          Klinik ya da semt
        </label>
        <input id="f-q" name="q" type="search" defaultValue={f.q} placeholder="Örn. Kadıköy" className="input" />
      </div>
      <div>
        <label htmlFor="f-sehir" className="label">
          Şehir
        </label>
        <select id="f-sehir" name="sehir" defaultValue={f.city} className="input">
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
        <div>
          <label htmlFor="f-ilce" className="label">
            İlçe
          </label>
          <select id="f-ilce" name="ilce" defaultValue={f.district} className="input">
            <option value="">Tüm ilçeler</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="f-hizmet" className="label">
          Hizmet
        </label>
        <select id="f-hizmet" name="hizmet" defaultValue={f.category ?? ""} className="input">
          <option value="">Tüm hizmetler</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SERVICE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-line-strong bg-surface px-3.5 has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-night-ink">
        <input type="checkbox" name="otel" value="1" defaultChecked={f.boarding} className="h-5 w-5 accent-[var(--color-lamp)]" />
        <BedDouble className="h-5 w-5" aria-hidden />
        <span className="font-semibold">Pet otel hizmeti olanlar</span>
      </label>
      <div className="flex items-center gap-3 pt-1">
        <button type="submit" className="inline-flex min-h-11 items-center rounded-control bg-pine px-5 font-semibold text-white hover:bg-pine-dark">
          Filtrele
        </button>
        {hasFilters && (
          <Link href="/klinikler" className="font-semibold text-pine underline-offset-4 hover:underline">
            Filtreleri temizle
          </Link>
        )}
      </div>
    </AutoSubmitForm>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-12">
      <h1 className="text-3xl font-bold sm:text-4xl">{headline(f)}</h1>
      <p className="mt-2 text-stone" aria-live="polite">
        {items.length > 0
          ? `${items.length} klinik listeleniyor. En erken boş saati olan en üstte.`
          : "Eşleşen klinik yok."}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        {/* Mobilde açılır filtre paneli */}
        <details className="group rounded-card border border-line bg-surface lg:hidden" open={false}>
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
              Filtreler
              {hasFilters && (
                <span className="rounded-full bg-pine px-2 py-0.5 text-xs text-white tabular" aria-label={`${activeCount} filtre seçili`}>
                  {activeCount}
                </span>
              )}
            </span>
            <span className="text-sm text-stone group-open:hidden">Göster</span>
            <span className="hidden text-sm text-stone group-open:inline">Gizle</span>
          </summary>
          <div className="border-t border-line p-4">{filterForm}</div>
        </details>

        <aside className="hidden lg:block" aria-label="Filtreler">
          <div className="sticky top-24">{filterForm}</div>
        </aside>

        <section aria-label="Klinikler">
          {items.length === 0 ? (
            <div className="rounded-panel border border-dashed border-line-strong bg-surface p-8 sm:p-10">
              <MapPin className="h-8 w-8 text-pine" aria-hidden />
              <h2 className="mt-4 text-2xl font-semibold">Bu filtrelerle eşleşen klinik bulamadık.</h2>
              <p className="mt-2 max-w-[52ch] text-stone">
                İlçe ya da hizmet filtresini kaldırmayı dene. Yakın şehirlerdeki klinikler de randevu kabul ediyor olabilir.
              </p>
              <Link href="/klinikler" className="mt-6 inline-flex min-h-11 items-center rounded-control bg-pine px-5 font-semibold text-white hover:bg-pine-dark">
                Tüm klinikleri göster
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {items.map((item) => (
                <li key={item.clinic.id}>
                  <ClinicRow item={item} focus={f.boarding ? "boarding" : "appointment"} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
