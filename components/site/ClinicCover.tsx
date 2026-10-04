import { BedDouble, Dog, PawPrint, Stethoscope } from "lucide-react";
import type { BusinessKind } from "@/lib/constants";

/**
 * Klinik fotoğrafı yerine geçen kapak görseli. Renk, klinik adresinden (slug) türetilir;
 * böylece her klinik her yerde aynı kapakla görünür.
 */
const PALETTES = [
  { bg: "linear-gradient(140deg, #e3f1e9 0%, #cfe8da 55%, #a9d5bd 100%)", ink: "#0f5c4a" },
  { bg: "linear-gradient(140deg, #fff3d6 0%, #ffe2a3 60%, #ffc24b 100%)", ink: "#7a5300" },
  { bg: "linear-gradient(140deg, #e9ebff 0%, #c9cdf3 60%, #aeb3dc 100%)", ink: "#252b5c" },
  { bg: "linear-gradient(140deg, #fbe7e3 0%, #f6cdc4 60%, #eeb0a3 100%)", ink: "#8f2a1c" },
  { bg: "linear-gradient(140deg, #e6f0f5 0%, #c7dfe9 60%, #a3c9da 100%)", ink: "#1f4d61" },
  { bg: "linear-gradient(140deg, #f1ece2 0%, #e2d6bf 60%, #cdb994 100%)", ink: "#5b4520" },
];

function hash(s: string) {
  // FNV-1a: kısa ve benzer adlarda da renkleri iyi dağıtır.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function ClinicCover({
  slug,
  name,
  kind = "vet",
  className = "",
  size = "card",
}: {
  slug: string;
  name: string;
  kind?: BusinessKind;
  className?: string;
  size?: "card" | "hero";
}) {
  const p = PALETTES[hash(slug) % PALETTES.length]!;
  const Icon = kind === "hotel" ? BedDouble : kind === "sitter" ? Dog : Stethoscope;
  const big = size === "hero";
  return (
    <div aria-hidden className={`relative overflow-hidden ${className}`} style={{ background: p.bg, color: p.ink }}>
      {/* Pati izleri: hafif desen */}
      <PawPrint className={`absolute rotate-[-18deg] opacity-15 ${big ? "top-[12%] left-[6%] h-16 w-16" : "top-[10%] left-[8%] h-9 w-9"}`} />
      <PawPrint className={`absolute rotate-[14deg] opacity-10 ${big ? "right-[10%] bottom-[14%] h-24 w-24" : "right-[9%] bottom-[12%] h-12 w-12"}`} />
      <PawPrint className={`absolute rotate-[32deg] opacity-10 ${big ? "top-[18%] right-[28%] h-10 w-10" : "top-[16%] right-[24%] h-6 w-6"}`} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span
          className={`flex items-center justify-center rounded-full bg-white/70 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur ${big ? "h-28 w-28" : "h-16 w-16"}`}
        >
          <Icon className={big ? "h-12 w-12" : "h-7 w-7"} strokeWidth={1.6} />
        </span>
        <span className={`font-display font-bold tracking-[-0.02em] opacity-80 ${big ? "text-2xl" : "text-base"}`}>{initials(name)}</span>
      </div>
    </div>
  );
}
