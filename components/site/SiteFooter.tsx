import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const groups = [
  {
    title: "Evcil hayvan sahipleri",
    links: [
      { href: "/klinikler", label: "Veteriner bul" },
      { href: "/klinikler?tur=otel", label: "Pet otel" },
      { href: "/klinikler?tur=sitter", label: "Pet sitter" },
      { href: "/rezervasyonum", label: "Rezervasyonumu yönet" },
    ],
  },
  {
    title: "İşletmeler ve bakıcılar",
    links: [
      { href: "/kayit?rol=veteriner", label: "Veteriner kliniği kaydı" },
      { href: "/kayit?rol=otel", label: "Pet otel kaydı" },
      { href: "/kayit?rol=sitter", label: "Pet sitter kaydı" },
      { href: "/giris", label: "Giriş yap" },
    ],
  },
  {
    title: "Yasal",
    links: [{ href: "/kvkk", label: "KVKK aydınlatma metni" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="night mt-24 bg-night text-night-ink">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:px-10 md:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo tone="lamp" />
          <p className="mt-4 text-night-muted">
            Evcil hayvan sahiplerini veteriner klinikleri, pet oteller ve pet sitterlarla buluşturan platform.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-night-muted">{g.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-night-ink/90 hover:text-lamp">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-night-3/60">
        <p className="mx-auto max-w-7xl px-4 py-5 text-sm text-night-muted sm:px-6 lg:px-10">
          © {new Date().getFullYear()} PetHotel. Acil durumlarda en yakın veteriner kliniğini doğrudan ara.
        </p>
      </div>
    </footer>
  );
}
