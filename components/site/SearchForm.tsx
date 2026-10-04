import { Search } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { BUSINESS_KIND_INFO, SERVICE_CATEGORY_LABELS, VET_SERVICE_CATEGORIES, type BusinessKind } from "@/lib/constants";

const segment =
  "relative flex min-w-0 flex-col justify-center rounded-full px-6 py-3 transition-colors hover:bg-paper focus-within:bg-surface focus-within:shadow-[0_6px_20px_rgba(0,0,0,0.16)]";
const segmentLabel = "block text-xs font-bold tracking-normal text-ink";
const TABS = [
  { value: "", label: "Veteriner" },
  { value: "otel", label: "Pet Otel" },
  { value: "sitter", label: "Pet Sitter" },
] as const;

const segmentSelect =
  "w-full cursor-pointer appearance-none truncate bg-transparent pr-2 text-[0.95rem] text-stone outline-none after:absolute after:inset-0";

/**
 * Veteriner, pet otel ve pet sitter arama formu (JS gerektirmez). Airbnb tarzı hap biçimli arama çubuğu.
 * "Pet Otel" ya da "Pet Sitter" seçilince hizmet alanı CSS :has() ile gizlenir.
 */
export function SearchForm({
  defaults = {},
  popularCities = [],
}: {
  defaults?: { city?: string; category?: string; kind?: BusinessKind };
  popularCities?: string[];
}) {
  const otherCities = CITIES.filter((c) => !popularCities.includes(c));
  const active = BUSINESS_KIND_INFO[defaults.kind ?? "vet"].searchTur;
  return (
    <form action="/klinikler" method="get" className="group/search">
      <fieldset>
        <legend className="sr-only">Ne arıyorsun?</legend>
        <div className="flex justify-center gap-1 sm:gap-6">
          {TABS.map((t) => (
            <label key={t.value} className="relative cursor-pointer">
              <input type="radio" name="tur" value={t.value} defaultChecked={t.value === active} className="peer sr-only" />
              <span className="flex min-h-11 items-center px-3 text-[1rem] font-medium text-stone transition-colors peer-checked:font-semibold peer-checked:text-ink peer-checked:after:absolute peer-checked:after:inset-x-3 peer-checked:after:bottom-0 peer-checked:after:h-0.5 peer-checked:after:rounded-full peer-checked:after:bg-ink hover:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-pine">{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 rounded-[28px] border border-line bg-surface p-2 shadow-[0_3px_12px_rgba(0,0,0,0.1)] sm:grid sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)_auto] sm:items-center sm:rounded-full">
        <div className={segment}>
          <label htmlFor="ara-sehir" className={segmentLabel}>
            Nerede
          </label>
          <select id="ara-sehir" name="sehir" defaultValue={defaults.city ?? ""} className={segmentSelect}>
            <option value="">Tüm şehirler</option>
            {popularCities.length > 0 && (
              <optgroup label="Kayıtlı işletme olan şehirler">
                {popularCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Diğer şehirler">
              {otherCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <span aria-hidden className="mx-6 block h-px bg-line sm:mx-0 sm:h-8 sm:w-px" />

        <div
          className={`${segment} group-has-[input[value='otel']:checked]/search:hidden group-has-[input[value='sitter']:checked]/search:hidden`}
        >
          <label htmlFor="ara-hizmet" className={segmentLabel}>
            Hizmet
          </label>
          <select id="ara-hizmet" name="hizmet" defaultValue={defaults.category ?? ""} className={segmentSelect}>
            <option value="">Tüm hizmetler</option>
            {VET_SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SERVICE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden min-w-0 flex-col justify-center px-6 py-3 group-has-[input[value='otel']:checked]/search:flex">
          <p className={segmentLabel}>Konaklama</p>
          <p className="truncate text-[0.95rem] text-stone">Kedi ve köpekler için gecelik</p>
        </div>
        <div className="hidden min-w-0 flex-col justify-center px-6 py-3 group-has-[input[value='sitter']:checked]/search:flex">
          <p className={segmentLabel}>Evde bakım</p>
          <p className="truncate text-[0.95rem] text-stone">Ev ziyareti ve köpek gezdirme</p>
        </div>

        <button
          type="submit"
          className={`mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-pine px-5 text-base font-semibold text-white transition-colors hover:bg-pine-dark sm:mt-0 sm:ml-2 sm:w-auto group-has-[input[value='otel']:checked]/search:bg-night group-has-[input[value='otel']:checked]/search:text-lamp group-has-[input[value='otel']:checked]/search:hover:bg-night-2`}
        >
          <Search className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          <span>Ara</span>
        </button>
      </div>
    </form>
  );
}
