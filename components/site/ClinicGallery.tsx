import Image from "next/image";
import type { PhotoMeta } from "@/lib/data/photos";
import { photoUrl } from "@/lib/photos";
import { ClinicCover } from "./ClinicCover";

/** Desktopta ızgara düzenindeki her fotoğrafın yeri; ilk fotoğraf (kapak) her zaman büyük. */
function cellClass(index: number, total: number) {
  if (total === 2) return "col-span-2 row-span-2";
  if (index === 0) return "col-span-2 row-span-2";
  if (total === 3) return "col-span-2";
  if (total === 4 && index === 1) return "col-span-2";
  return "";
}

/** Airbnb tarzı fotoğraf alanı: masaüstünde ızgara, telefonda kaydırılabilir şerit. */
export function ClinicGallery({
  photos,
  slug,
  name,
  boarding,
}: {
  photos: PhotoMeta[];
  slug: string;
  name: string;
  boarding: boolean;
}) {
  if (photos.length === 0) {
    return (
      <ClinicCover slug={slug} name={name} boarding={boarding} size="hero" className="mt-6 aspect-[4/3] w-full rounded-3xl sm:aspect-[2.6/1]" />
    );
  }

  if (photos.length === 1) {
    const [p] = photos;
    return (
      <a
        href={photoUrl(p!.id)}
        target="_blank"
        rel="noopener"
        className="relative mt-6 block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-paper sm:aspect-[2.6/1]"
      >
        <Image src={photoUrl(p!.id)} alt={`${name} fotoğrafı`} fill unoptimized priority sizes="(min-width: 1152px) 1104px, 100vw" className="object-cover" />
      </a>
    );
  }

  const grid = photos.slice(0, 5);
  const hidden = photos.length - grid.length;

  return (
    <section aria-label="Fotoğraflar" className="mt-6">
      {/* Telefon: kaydırılabilir şerit */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        {photos.map((p, i) => (
          <li key={p.id} className="relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl bg-paper">
            <a href={photoUrl(p.id)} target="_blank" rel="noopener">
              <Image
                src={photoUrl(p.id)}
                alt={`${name} fotoğrafı ${i + 1}`}
                fill
                unoptimized
                priority={i === 0}
                sizes="88vw"
                className="object-cover"
              />
            </a>
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular">
              {i + 1} / {photos.length}
            </span>
          </li>
        ))}
      </ul>

      {/* Masaüstü: ızgara */}
      <ul className="hidden h-[420px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:grid">
        {grid.map((p, i) => (
          <li key={p.id} className={`relative overflow-hidden bg-paper ${cellClass(i, grid.length)}`}>
            <a href={photoUrl(p.id)} target="_blank" rel="noopener" className="group block h-full w-full">
              <Image
                src={photoUrl(p.id)}
                alt={`${name} fotoğrafı ${i + 1}`}
                fill
                unoptimized
                priority={i === 0}
                sizes={i === 0 ? "550px" : "280px"}
                className="object-cover transition-[filter] duration-200 group-hover:brightness-90"
              />
              {hidden > 0 && i === grid.length - 1 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-semibold text-white">
                  +{hidden} fotoğraf
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
