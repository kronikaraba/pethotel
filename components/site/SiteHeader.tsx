import Link from "next/link";
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
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Ana menü" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-ink/80 transition-colors hover:bg-pine-soft hover:text-pine"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/klinik-basvuru" className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-stone hover:text-pine">
            Kliniğini ekle
          </Link>
          <Link
            href={panelHref}
            className="inline-flex min-h-10 items-center rounded-control border border-line-strong bg-surface px-4 text-[0.95rem] font-semibold hover:border-pine hover:text-pine"
          >
            {panelLabel}
          </Link>
        </div>
        <MobileMenu links={NAV_LINKS} panelHref={panelHref} panelLabel={panelLabel} />
      </div>
    </header>
  );
}
