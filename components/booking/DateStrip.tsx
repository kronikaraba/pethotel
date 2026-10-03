"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { diffDays, formatDateMedium, formatWeekdayShort, parseDate } from "@/lib/time";

export type DayOption = { date: string; open: boolean };

const monthShort = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", month: "short" });

/** Yatay kaydırılabilir gün seçici. Kapalı günler pasif görünür. */
export function DateStrip({
  days,
  value,
  today,
  onChange,
}: {
  days: DayOption[];
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Seçili gün görünür alanda kalsın.
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-date="${value}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [value]);

  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-3 [scrollbar-width:thin]"
        role="group"
        aria-label="Gün seç"
      >
        {days.map((d) => {
          const selected = d.date === value;
          const diff = diffDays(today, d.date);
          const top = diff === 0 ? "Bugün" : diff === 1 ? "Yarın" : formatWeekdayShort(d.date);
          return (
            <button
              key={d.date}
              type="button"
              data-date={d.date}
              disabled={!d.open}
              aria-pressed={selected}
              aria-label={`${top}, ${formatDateMedium(d.date)}${d.open ? "" : ", kapalı"}`}
              onClick={() => onChange(d.date)}
              className={`flex w-[4.25rem] shrink-0 snap-start flex-col items-center rounded-[14px] border px-1 py-2.5 transition-colors ${
                selected
                  ? "border-pine bg-pine text-white"
                  : d.open
                    ? "border-line-strong bg-surface hover:border-pine"
                    : "cursor-not-allowed border-dashed border-line bg-transparent text-stone/60"
              }`}
            >
              <span className={`text-xs font-medium ${selected ? "text-white/85" : "text-stone"}`}>{top}</span>
              <span className="font-display text-2xl leading-tight font-semibold tabular">{parseDate(d.date).getUTCDate()}</span>
              <span className={`text-xs ${selected ? "text-white/85" : "text-stone"}`}>
                {d.open ? monthShort.format(parseDate(d.date)) : "kapalı"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute -top-12 right-0 hidden gap-1 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface hover:border-pine"
          aria-label="Önceki günler"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-surface hover:border-pine"
          aria-label="Sonraki günler"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
