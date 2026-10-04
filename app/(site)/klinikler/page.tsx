import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Dog, MapPin, SlidersHorizontal, Stethoscope } from "lucide-react";
import { AutoSubmitForm } from "@/components/site/AutoSubmitForm";
import { ClinicCard } from "@/components/site/ClinicCard";
import { CategoryStrip } from "@/components/site/CategoryStrip";
import { CITIES, isCity } from "@/lib/cities";
import {
  BUSINESS_KIND_INFO,
  BUSINESS_KINDS,
  kindFromSlug,
  SERVICE_CATEGORY_LABELS,
  SITTER_SERVICE_CATEGORIES,
  VET_SERVICE_CATEGORIES,
  type BusinessKind,
  type ServiceCategory,
} from "@/lib/constants";
import { getCityStats, getDistricts, searchClinics } from "@/lib/data/public";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KIND_ICONS = { vet: Stethoscope, hotel: BedDouble, sitter: Dog } as const;
const TAB_LABELS: Record<BusinessKind, string> = { vet: "Veteriner", hotel: "Pet Otel", sitter: "Pet Sitter" };

function categoriesFor(kind: BusinessKind): ServiceCategory[] {
  return kind === "vet" ? VET_SERVICE_CATEGORIES : kind === "sitter" ? SITTER_SERVICE_CATEGORIES : [];
}

function readFilters(sp: Record<string, string | string[] | undefined>) {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const city = one("sehir");
  // tur=otel → pet oteller, tur=sitter → pet sitterlar, boş → veteriner klinikleri.
  // Eski bağlantılar (otel=1, hizmet=petsitter) da doğru listeye gider.
  const kind: BusinessKind =
    kindFromSlug(one("tur")) ?? (one("otel") === "1" ? "hotel" : one("hizmet") === "petsitter" ? "sitter" : "vet");
  const category = one("hizmet");
  return {
    kind,
    city: isCity(city) ? city : "",
    district: one("ilce").slice(0, 40),
    category: (categoriesFor(kind) as string[]).includes(category) ? (category as ServiceCategory) : undefined,
    q: one("q").slice(0, 60),
  };
}

function headline(f: ReturnType<typeof readFilters>) {
  const where = f.district ? `${f.district}, ${f.city}` : f.city;
  if (f.kind === "hotel") return where ? `${where} pet otelleri` : "Pet otelleri";
  if (f.kind === "sitter") {
    if (f.category) return `${where ? `${where}: ` : ""}${SERVICE_CATEGORY_LABELS[f.category]} için pet sitterlar`;
    return where ? `${where} pet sitterları` : "Pet sitterlar";
  }
  if (f.category) return `${where ? `${where}: ` : ""}${SERVICE_CATEGORY_LABELS[f.category]} için klinikler`;
  return where ? `${where} veteriner klinikleri` : "Veteriner klinikleri";
}

const COUNT_NOUN: Record<BusinessKind, string> = { vet: "klinik", hotel: "otel", sitter: "pet sitter" };
const SEARCH_LABEL: Record<BusinessKind, string> = { vet: "Klinik ya da semt", hotel: "Otel ya da semt", sitter: "İsim ya da semt" };

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const f = readFilters(await searchParams);
  const description =
    f.kind === "hotel"
      ? "Pet otellerini karşılaştır, gecelik fiyatları gör ve konaklama iste."
      : f.kind === "sitter"
        ? "Pet sitterları karşılaştır, boş saatleri gör ve ev ziyareti planla."
        : "Klinikleri karşılaştır, boş saatleri gör ve online randevu al.";
  return { title: headline(f), description };
}

export default async function ClinicsPage({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(await searchParams);
  const [items, districts, cityStats] = await Promise.all([
    searchClinics({ kind: f.kind, city: f.city || undefined, district: f.district || undefined, category: f.category, q: f.q || undefined }),
    f.city ? getDistricts(f.city, f.kind) : Promise.resolve([]),
    getCityStats(f.kind),
  ]);
  const popular = cityStats.map((c) => c.city);
  const activeCount = [f.city, f.district, f.category, f.q].filter(Boolean).length;
  const hasFilters = activeCount > 0;
  const tur = BUSINESS_KIND_INFO[f.kind].searchTur;
  const listHref = (kind: BusinessKind) => {
    const t = BUSINESS_KIND_INFO[kind].searchTur;
    return t ? `/klinikler?tur=${t}` : "/klinikler";
  };

  const hrefFor = (category: ServiceCategory | undefined) => {
    const p = new URLSearchParams();
    if (tur) p.set("tur", tur);
    if (f.q) p.set("q", f.q);
    if (f.city) p.set("sehir", f.city);
    if (f.district) p.set("ilce", f.district);
    if (category) p.set("hizmet", category);
    const qs = p.toString();
    return qs ? `/klinikler?${qs}` : "/klinikler";
  };
  const noun = COUNT_NOUN[f.kind];

  const pill =
    "min-h-12 rounded-full border border-line-strong bg-surface pl-4 text-[0.95rem] transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] focus:border-ink focus:outline-none";

  const filterForm = (
    <AutoSubmitForm action="/klinikler" scroll={false} className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      {tur && <input type="hidden" name="tur" value={tur} />}
      {f.category && <input type="hidden" name="hizmet" value={f.category} />}
      <div className="lg:w-60">
        <label htmlFor="f-q" className="label">
          {SEARCH_LABEL[f.kind]}
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
            <optgroup label={`${noun.charAt(0).toLocaleUpperCase("tr-TR")}${noun.slice(1)} olan şehirler`}>
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
      <div className="flex items-center gap-4">
        <button type="submit" className="inline-flex min-h-12 items-center rounded-full bg-pine px-6 font-semibold text-white hover:bg-pine-dark">
          Filtrele
        </button>
        {hasFilters && (
          <Link href={listHref(f.kind)} className="font-semibold underline underline-offset-4 hover:text-pine">
            Filtreleri temizle
          </Link>
        )}
      </div>
    </AutoSubmitForm>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-10">
      {/* Hesap türü sekmeleri: Veteriner / Pet Otel / Pet Sitter */}
      <nav aria-label="Ne arıyorsun?" className="flex flex-wrap gap-2">
        {BUSINESS_KINDS.map((k) => {
          const Icon = KIND_ICONS[k];
          const active = k === f.kind;
          return (
            <Link
              key={k}
              href={listHref(k)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold transition-colors ${
                active
                  ? k === "hotel"
                    ? "bg-night text-night-ink"
                    : "bg-ink text-white"
                  : "border border-line-strong bg-surface text-ink hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
              }`}
            >
              <Icon className={`h-5 w-5 ${active && k === "hotel" ? "text-lamp" : ""}`} aria-hidden />
              {TAB_LABELS[k]}
            </Link>
          );
        })}
      </nav>

      {f.kind !== "hotel" && (
        <div className="mt-6">
          <CategoryStrip categories={categoriesFor(f.kind)} active={f.category} hrefFor={hrefFor} showAll label="Hizmete göre filtrele" />
        </div>
      )}

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
          ? `${items.length} ${noun} listeleniyor. ${f.kind === "hotel" ? "Gecelik fiyatı en uygun olan en başta." : "En erken boş saati olan en başta."}`
          : `Eşleşen ${noun} yok.`}
      </p>

      <section aria-label={BUSINESS_KIND_INFO[f.kind].listTitle} className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-8 sm:p-10">
            <MapPin className="h-8 w-8 text-pine" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold">Bu filtrelerle eşleşen {noun} bulamadık.</h2>
            <p className="mt-2 max-w-[52ch] text-stone">İlçe ya da hizmet filtresini kaldırmayı dene. Yakın şehirlere de bakabilirsin.</p>
            <Link href={listHref(f.kind)} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-pine px-5 font-semibold text-white hover:bg-pine-dark">
              Tümünü göster
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <li key={item.clinic.id}>
                <ClinicCard item={item} showServicePrice={Boolean(f.category)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
