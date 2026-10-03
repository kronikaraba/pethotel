import type { Appointment, Clinic, Vet } from "@/lib/db/schema";
import { dayWindow } from "@/lib/booking/availability";
import { minutesToTime, nowInIstanbul } from "@/lib/time";

const PX_PER_MIN = 1.5;
/** İlk saat etiketinin kesilmemesi için üst boşluk (px). */
const TOP = 12;

const BLOCK: Record<string, string> = {
  pending: "border-l-[#d9a21b] bg-lamp-soft",
  confirmed: "border-l-pine bg-pine-soft",
  completed: "border-l-line-strong bg-paper text-stone",
  no_show: "border-l-line-strong bg-paper text-stone line-through",
};

/**
 * Günlük takvim: her veteriner bir sütun. Bloklar alttaki listedeki ayrıntıya bağlanır.
 * İptal edilen randevular takvimde gösterilmez.
 */
export function DayCalendar({
  clinic,
  date,
  appointments,
  vets,
}: {
  clinic: Pick<Clinic, "workingHours" | "closedDates">;
  date: string;
  appointments: Appointment[];
  vets: Pick<Vet, "id" | "name" | "title">[];
}) {
  const visible = appointments.filter((a) => a.status !== "cancelled");
  const win = dayWindow(clinic.workingHours, date, clinic.closedDates);
  let start = win ? win.open : 9 * 60;
  let end = win ? win.close : 18 * 60;
  for (const a of visible) {
    start = Math.min(start, a.startMinute);
    end = Math.max(end, a.endMinute);
  }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  const height = (end - start) * PX_PER_MIN + TOP * 2;
  const y = (minute: number) => TOP + (minute - start) * PX_PER_MIN;
  const hours = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);

  const columns: { id: string | null; name: string; title?: string }[] = vets.map((v) => ({ id: v.id, name: v.name, title: v.title }));
  if (visible.some((a) => !a.vetId || !vets.some((v) => v.id === a.vetId))) columns.push({ id: null, name: "Atanmamış" });

  const now = nowInIstanbul();
  const nowLine = now.date === date && now.minutes >= start && now.minutes <= end ? y(now.minutes) : null;

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-surface">
      <div className="min-w-fit" style={{ minWidth: `${4 + columns.length * 11}rem` }}>
        {/* Başlıklar */}
        <div className="sticky top-0 z-10 grid border-b border-line bg-surface" style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(11rem, 1fr))` }}>
          <div />
          {columns.map((c) => (
            <div key={c.id ?? "none"} className="border-l border-line px-3 py-3">
              <p className="truncate font-semibold">{c.name}</p>
              {c.title && <p className="truncate text-xs text-stone">{c.title}</p>}
            </div>
          ))}
        </div>

        <div className="relative grid" style={{ gridTemplateColumns: `4rem repeat(${columns.length}, minmax(11rem, 1fr))`, height }}>
          {/* Saat ekseni */}
          <div className="relative">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-xs text-stone tabular"
                style={{ top: y(h) }}
              >
                {minutesToTime(h)}
              </span>
            ))}
          </div>

          {columns.map((c) => {
            const items = visible.filter((a) => (c.id ? a.vetId === c.id : !a.vetId || !vets.some((v) => v.id === a.vetId)));
            return (
              <div
                key={c.id ?? "none"}
                className="relative border-l border-line"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${60 * PX_PER_MIN}px)`,
                  backgroundPosition: `0 ${TOP}px`,
                  backgroundSize: `100% ${height - TOP * 2 + 1}px`,
                  backgroundRepeat: "no-repeat",
                }}
              >
                {win?.breaks.map((b) => (
                  <div
                    key={b.start}
                    aria-hidden
                    className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_6px,rgba(86,98,92,0.08)_6px,rgba(86,98,92,0.08)_12px)]"
                    style={{ top: y(b.start), height: (b.end - b.start) * PX_PER_MIN }}
                  />
                ))}
                {items.map((a) => {
                  const h = Math.max((a.endMinute - a.startMinute) * PX_PER_MIN - 3, 22);
                  return (
                    <a
                      key={a.id}
                      href={`#randevu-${a.id}`}
                      className={`absolute inset-x-1.5 overflow-hidden rounded-[10px] border-l-4 px-2.5 py-1.5 text-sm leading-tight transition-shadow hover:shadow-md ${BLOCK[a.status] ?? BLOCK.confirmed}`}
                      style={{ top: y(a.startMinute) + 1, height: h }}
                      title={`${minutesToTime(a.startMinute)}–${minutesToTime(a.endMinute)} ${a.petName}, ${a.serviceName}`}
                    >
                      <span className="font-semibold tabular">{minutesToTime(a.startMinute)}</span> <span className="font-semibold">{a.petName}</span>
                      {h > 40 && <span className="block truncate text-xs text-stone">{a.serviceName}</span>}
                    </a>
                  );
                })}
              </div>
            );
          })}

          {nowLine !== null && (
            <div aria-hidden className="pointer-events-none absolute right-0 left-12 z-[5] flex items-center" style={{ top: nowLine }}>
              <span className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-coral" />
              <span className="h-0.5 flex-1 bg-coral" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
