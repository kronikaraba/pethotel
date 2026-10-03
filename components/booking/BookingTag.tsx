import type { ReactNode } from "react";

/**
 * Rezervasyon kodunu bir otel anahtarı / künye biçiminde gösterir.
 * swing: ilk oluşturulduğunda künye bir kez sallanır (hareket azaltma tercihine uyar).
 */
export function BookingTag({
  code,
  tone,
  swing,
  children,
}: {
  code: string;
  tone: "day" | "night";
  swing?: boolean;
  children?: ReactNode;
}) {
  const night = tone === "night";
  return (
    <div className="flex justify-center pt-2">
      <div
        className={`relative w-full max-w-[19rem] origin-top ${swing ? "animate-tag-swing" : ""}`}
        style={{ transformOrigin: "50% 1.75rem" }}
      >
        {/* halka */}
        <div
          aria-hidden
          className={`absolute top-0 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] ${night ? "border-lamp" : "border-pine"}`}
        />
        <div
          className={`relative mt-2 overflow-hidden rounded-t-[9rem] rounded-b-[2rem] px-7 pt-16 pb-8 text-center shadow-[0_30px_60px_-30px_rgba(22,35,30,0.55)] ${
            night ? "night bg-night text-night-ink" : "bg-pine text-white"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-6 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full ${night ? "bg-paper" : "bg-paper"}`}
          />
          <p className={`text-sm font-medium ${night ? "text-night-muted" : "text-white/75"}`}>Rezervasyon kodu</p>
          <p className={`font-display mt-1 text-[2.6rem] leading-none font-bold tracking-[0.04em] ${night ? "text-lamp" : "text-white"}`}>
            {code}
          </p>
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>
    </div>
  );
}
