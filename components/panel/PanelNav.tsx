"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BusinessKind } from "@/lib/constants";
import {
  BedDouble,
  CalendarDays,
  Images,
  KeyRound,
  LayoutDashboard,
  Settings,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";

const ALL: BusinessKind[] = ["vet", "hotel", "sitter"];

// Her hesap türünün kendi menüsü: veteriner randevu ve ekip, pet otel konaklama, pet sitter ziyaret yönetir.
const ITEMS: { href: string; label: string | Record<BusinessKind, string>; icon: typeof LayoutDashboard; admin: boolean; kinds: BusinessKind[] }[] = [
  { href: "/panel", label: "Bugün", icon: LayoutDashboard, admin: false, kinds: ALL },
  { href: "/panel/randevular", label: { vet: "Randevular", hotel: "", sitter: "Ziyaretler" }, icon: CalendarDays, admin: false, kinds: ["vet", "sitter"] },
  { href: "/panel/konaklama", label: "Konaklamalar", icon: BedDouble, admin: false, kinds: ["hotel"] },
  { href: "/panel/hizmetler", label: "Hizmetler", icon: Stethoscope, admin: true, kinds: ["vet", "sitter"] },
  { href: "/panel/ekip", label: "Ekip", icon: Users, admin: true, kinds: ["vet"] },
  { href: "/panel/fotograflar", label: "Fotoğraflar", icon: Images, admin: true, kinds: ALL },
  { href: "/panel/kullanicilar", label: "Kullanıcılar", icon: KeyRound, admin: true, kinds: ["vet", "hotel"] },
  { href: "/panel/ayarlar", label: { vet: "Klinik ayarları", hotel: "Otel ayarları", sitter: "Profil ayarları" }, icon: Settings, admin: true, kinds: ALL },
  { href: "/panel/hesap", label: "Hesabım", icon: UserRound, admin: false, kinds: ALL },
];

function isActive(pathname: string, href: string) {
  return href === "/panel" ? pathname === "/panel" : pathname === href || pathname.startsWith(`${href}/`);
}

export function PanelNav({
  isAdmin,
  kind,
  badges,
}: {
  isAdmin: boolean;
  kind: BusinessKind;
  badges: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => (isAdmin || !i.admin) && i.kinds.includes(kind)).map((i) => ({
    ...i,
    label: typeof i.label === "string" ? i.label : i.label[kind],
  }));

  return (
    <>
      {/* Masaüstü: dikey menü */}
      <nav aria-label="Panel menüsü" className="hidden lg:block">
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-[0.95rem] font-medium transition-colors ${
                    active ? "bg-pine text-white" : "text-ink/80 hover:bg-pine-soft hover:text-pine"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {badges[href] ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular ${active ? "bg-white text-pine" : "bg-lamp text-night"}`}
                      aria-label={`${badges[href]} bekleyen`}
                    >
                      {badges[href]}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobil: yatay kaydırılabilir sekmeler */}
      <nav aria-label="Panel menüsü" className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <ul className="flex gap-1.5 pb-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium ${
                    active ? "bg-pine text-white" : "border border-line-strong bg-surface text-ink/80"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  {badges[href] ? (
                    <span className={`rounded-full px-1.5 text-xs font-semibold ${active ? "bg-white text-pine" : "bg-lamp text-night"}`}>
                      {badges[href]}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
