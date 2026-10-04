import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/constants";
import { CATEGORY_ICONS } from "./CategoryIcon";

/** Airbnb'deki kategori şeridi gibi: ikonlu hizmet kısayolları, yatay kaydırılabilir. */
export function CategoryStrip({
  active,
  hrefFor,
  showAll = false,
  label = "Hizmetler",
  categories = SERVICE_CATEGORIES,
}: {
  categories?: readonly ServiceCategory[];
  active?: ServiceCategory;
  hrefFor: (c: ServiceCategory | undefined) => string;
  showAll?: boolean;
  label?: string;
}) {
  const items: { key: ServiceCategory | undefined; text: string; Icon: typeof LayoutGrid }[] = [
    ...(showAll ? [{ key: undefined, text: "Tümü", Icon: LayoutGrid }] : []),
    ...categories.map((c) => ({ key: c, text: SERVICE_CATEGORY_LABELS[c], Icon: CATEGORY_ICONS[c] })),
  ];
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-8">
        {items.map(({ key, text, Icon }) => {
          const isActive = key === active;
          return (
            <li key={text}>
              <Link
                href={hrefFor(key)}
                aria-current={isActive ? "page" : undefined}
                className={`group flex flex-col items-center gap-2 border-b-2 pt-1 pb-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? "border-ink text-ink" : "border-transparent text-stone hover:border-line-strong hover:text-ink"
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} strokeWidth={1.6} aria-hidden />
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
