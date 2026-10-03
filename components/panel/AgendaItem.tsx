import { Phone } from "lucide-react";
import type { Appointment } from "@/lib/db/schema";
import { PET_SPECIES_LABELS } from "@/lib/constants";
import { formatPhone, phoneHref } from "@/lib/format";
import { minutesToTime } from "@/lib/time";
import { StatusPill } from "@/components/ui/StatusPill";
import { AppointmentActions } from "./AppointmentActions";

/** Panel randevu satırı: saat, hayvan, hizmet, sahip ve hızlı işlemler. */
export function AgendaItem({ a, showDate }: { a: Appointment; showDate?: string }) {
  const muted = a.status === "cancelled" || a.status === "no_show";
  return (
    <li id={`randevu-${a.id}`} className={`grid scroll-mt-24 gap-3 px-4 py-4 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-5 ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-baseline gap-2 sm:block">
        {showDate && <p className="text-xs font-medium text-stone">{showDate}</p>}
        <p className="font-display text-xl leading-tight font-semibold tabular">{minutesToTime(a.startMinute)}</p>
        <p className="text-sm text-stone tabular">{minutesToTime(a.endMinute)}</p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {a.petName}
            <span className="font-normal text-stone">, {PET_SPECIES_LABELS[a.petSpecies].toLocaleLowerCase("tr-TR")}</span>
          </p>
          <StatusPill status={a.status} />
          {a.source === "clinic" && <span className="text-xs text-stone">Klinikten eklendi</span>}
        </div>
        <p className="mt-0.5 text-[0.95rem]">
          {a.serviceName}
          {a.vetName && <span className="text-stone">, {a.vetName}</span>}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-stone">
          <span>{a.ownerName}</span>
          <a href={phoneHref(a.ownerPhone)} className="inline-flex items-center gap-1 font-medium text-pine hover:underline">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            {formatPhone(a.ownerPhone)}
          </a>
          <span className="tabular">{a.code}</span>
        </p>
        {a.notes && <p className="mt-2 rounded-[10px] bg-paper px-3 py-2 text-sm">{a.notes}</p>}
      </div>
      <div className="sm:pt-1">
        <AppointmentActions id={a.id} status={a.status} />
      </div>
    </li>
  );
}
