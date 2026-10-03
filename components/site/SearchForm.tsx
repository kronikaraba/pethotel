import { Search } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS } from "@/lib/constants";

/**
 * Klinik arama formu (JS gerektirmez). "Pet otel" seçilince hizmet alanı CSS :has() ile gizlenir.
 */
export function SearchForm({
  defaults = {},
  popularCities = [],
}: {
  defaults?: { city?: string; category?: string; boarding?: boolean };
  popularCities?: string[];
}) {
  const otherCities = CITIES.filter((c) => !popularCities.includes(c));
  return (
    <form
      action="/klinikler"
      method="get"
      className="group/search rounded-[24px] border border-line bg-surface p-4 shadow-[0_24px_48px_-32px_rgba(15,92,74,0.45)] sm:p-5"
    >
      <fieldset>
        <legend className="sr-only">Ne arıyorsun?</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-paper p-1">
          <label className="relative cursor-pointer">
            <input type="radio" name="otel" value="" defaultChecked={!defaults.boarding} className="peer sr-only" />
            <span className="flex min-h-11 items-center justify-center rounded-[10px] px-3 text-center text-[0.95rem] font-semibold text-stone transition-colors peer-checked:bg-surface peer-checked:text-pine peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-pine">
              <span className="sm:hidden">Randevu</span>
              <span className="hidden sm:inline">Veteriner randevusu</span>
            </span>
          </label>
          <label className="relative cursor-pointer">
            <input type="radio" name="otel" value="1" defaultChecked={defaults.boarding} className="peer sr-only" />
            <span className="flex min-h-11 items-center justify-center rounded-[10px] px-3 text-center text-[0.95rem] font-semibold text-stone transition-colors peer-checked:bg-night peer-checked:text-lamp peer-focus-visible:outline-2 peer-focus-visible:outline-pine">
              Pet otel
            </span>
          </label>
        </div>
      </fieldset>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ara-sehir" className="label">
            Şehir
          </label>
          <select id="ara-sehir" name="sehir" defaultValue={defaults.city ?? ""} className="input">
            <option value="">Tüm şehirler</option>
            {popularCities.length > 0 && (
              <optgroup label="Klinik olan şehirler">
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
        <div className="group-has-[input[value='1']:checked]/search:hidden">
          <label htmlFor="ara-hizmet" className="label">
            Hizmet
          </label>
          <select id="ara-hizmet" name="hizmet" defaultValue={defaults.category ?? ""} className="input">
            <option value="">Tüm hizmetler</option>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SERVICE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden group-has-[input[value='1']:checked]/search:block">
          <p className="label">Konaklama</p>
          <p className="flex min-h-12 items-center rounded-control bg-night/5 px-3.5 text-sm text-stone">
            Kedi ve köpekler için gecelik konaklama
          </p>
        </div>
      </div>

      <button
        type="submit"
        className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-pine px-6 text-base font-semibold text-white transition-colors hover:bg-pine-dark group-has-[input[value='1']:checked]/search:bg-night group-has-[input[value='1']:checked]/search:text-lamp"
      >
        <Search className="h-5 w-5" aria-hidden />
        Klinik bul
      </button>
    </form>
  );
}
