import Link from "next/link";

/** Otel anahtarı + künye: PetHotel'in işareti. */
export function TagMark({ className = "h-8 w-8", tone = "pine" }: { className?: string; tone?: "pine" | "lamp" }) {
  const body = tone === "pine" ? "var(--color-pine)" : "var(--color-lamp)";
  const hole = tone === "pine" ? "var(--color-paper)" : "var(--color-night)";
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="6.5" r="4" fill="none" stroke={body} strokeWidth="2.2" />
      <path d="M9 13.5a7 7 0 0 1 7-7a7 7 0 0 1 7 7V25a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5Z" fill={body} />
      <circle cx="16" cy="12.6" r="2.2" fill={hole} />
      <path d="M12.6 21.2h6.8M12.6 24.6h4.4" stroke={hole} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ tone = "pine", href = "/" }: { tone?: "pine" | "lamp"; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 rounded-lg" aria-label="PetHotel ana sayfa">
      <TagMark tone={tone} className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
      <span
        className={`font-display text-[1.375rem] leading-none font-bold tracking-[-0.03em] ${
          tone === "pine" ? "text-ink" : "text-night-ink"
        }`}
      >
        PetHotel
      </span>
    </Link>
  );
}
