import Link from "next/link";
import { CircleUserRound, Menu } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "./MobileMenu";
import { getCurrentUser } from "@/lib/auth/dal";

export const NAV_LINKS = [
  { href: "/klinikler", label: "Klinikler" },
  { href: "/klinikler?otel=1", label: "Pet otel" },
  { href: "/rezervasyonum", label: "Rezervasyonum" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const panelHref = user ? (user.role === "superadmin" ? "/admin" : "/panel") : "/giris";
  const panelLabel = user ? "Panele git" : "Klinik girişi";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Ana menü" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2.5 text-[0.95rem] font-medium text-ink/80 transition-colors hover:bg-paper hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/klinik-basvuru"
            className="rounded-full px-4 py-2.5 text-[0.95rem] font-semibold text-ink transition-colors hover:bg-paper"
          >
            Kliniğini ekle
          </Link>
          <Link
            href={panelHref}
            className="ml-1 inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong bg-surface py-1.5 pr-1.5 pl-3.5 text-[0.95rem] font-semibold transition-shadow hover:shadow-[0_2px_6px_rgba(0,0,0,0.14)]"
          >
            <Menu className="h-4 w-4" aria-hidden />
            <span>{panelLabel}</span>
            <CircleUserRound className="h-8 w-8 text-stone" strokeWidth={1.4} aria-hidden />
          </Link>
        </div>
        <MobileMenu links={NAV_LINKS} panelHref={panelHref} panelLabel={panelLabel} />
      </div>
    </header>
  );
}
