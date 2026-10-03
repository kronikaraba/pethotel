export function DemoBadge({ tone = "light" }: { tone?: "light" | "night" }) {
  return (
    <span
      title="Örnek klinik: bilgiler gerçek değildir"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        tone === "night" ? "bg-night-3 text-night-ink" : "bg-lamp-soft text-[#7a5300]"
      }`}
    >
      Demo
    </span>
  );
}
