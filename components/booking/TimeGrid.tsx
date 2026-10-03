"use client";

export type SlotDTO = { start: number; end: number; label: string; vetIds: string[] };

const GROUPS = [
  { title: "Sabah", test: (m: number) => m < 12 * 60 },
  { title: "Öğleden sonra", test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { title: "Akşam", test: (m: number) => m >= 17 * 60 },
];

/** Boş saatleri sabah / öğleden sonra / akşam olarak gruplar. */
export function TimeGrid({
  slots,
  value,
  onChange,
}: {
  slots: SlotDTO[];
  value: string | null;
  onChange: (label: string) => void;
}) {
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => {
        const list = slots.filter((s) => g.test(s.start));
        if (list.length === 0) return null;
        return (
          <div key={g.title} role="group" aria-label={g.title}>
            <p className="mb-2 text-sm font-medium text-stone">{g.title}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2">
              {list.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  className="slot"
                  aria-pressed={value === s.label}
                  onClick={() => onChange(s.label)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
