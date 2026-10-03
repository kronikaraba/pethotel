import {
  APPOINTMENT_STATUS_LABELS,
  BOARDING_STATUS_LABELS,
  type AppointmentStatus,
  type BoardingStatus,
} from "@/lib/constants";

const STYLES: Record<string, string> = {
  pending: "bg-lamp-soft text-[#6b4a00] ring-[#e9c46a]",
  confirmed: "bg-pine-soft text-pine-dark ring-pine/30",
  checked_in: "bg-night text-lamp ring-night",
  completed: "bg-paper text-stone ring-line-strong",
  cancelled: "bg-coral-soft text-coral ring-coral/30",
  rejected: "bg-coral-soft text-coral ring-coral/30",
  no_show: "bg-paper text-stone ring-line-strong",
};

export function StatusPill({
  status,
  kind = "appointment",
  className = "",
}: {
  status: AppointmentStatus | BoardingStatus;
  kind?: "appointment" | "boarding";
  className?: string;
}) {
  const label =
    kind === "boarding"
      ? BOARDING_STATUS_LABELS[status as BoardingStatus]
      : APPOINTMENT_STATUS_LABELS[status as AppointmentStatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${STYLES[status] ?? STYLES.completed} ${className}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
