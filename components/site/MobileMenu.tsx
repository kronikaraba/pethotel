"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({
  links,
  panelHref,
  panelLabel,
}: {
  links: { href: string; label: string }[];
  panelHref: string;
  panelLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Sayfa değişince menüyü kapat.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobil-menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{open ? "Menüyü kapat" : "Menüyü aç"}</span>
      </button>
      {open && (
        <div
          id="mobil-menu"
          className="absolute inset-x-0 top-20 border-b border-line bg-surface px-4 pt-2 pb-5 shadow-[0_18px_30px_-20px_rgba(22,35,30,0.35)]"
        >
          <nav aria-label="Mobil menü" className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3.5 text-lg font-medium">
                {l.label}
              </Link>
            ))}
            <Link href="/kayit" onClick={() => setOpen(false)} className="border-b border-line py-3.5 text-lg font-medium text-stone">
              Kayıt ol
            </Link>
          </nav>
          <Link
            href={panelHref}
            onClick={() => setOpen(false)}
            className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-pine font-semibold text-white"
          >
            {panelLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
