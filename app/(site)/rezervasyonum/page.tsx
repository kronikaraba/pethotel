import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, CalendarDays } from "lucide-react";
import { LookupForm } from "@/components/booking/LookupForm";
import { StatusPill } from "@/components/ui/StatusPill";
import { rememberedBookings } from "@/lib/lookup";
import { findBookingByCode, type BookingRecord } from "@/lib/data/lookup";
import { normalizeBookingCode } from "@/lib/booking/codes";
import { formatDateMedium, minutesToTime } from "@/lib/time";

export const metadata: Metadata = { title: "Rezervasyonum", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LookupPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const prefill = typeof sp.kod === "string" ? (normalizeBookingCode(sp.kod) ?? "") : "";
  const codes = await rememberedBookings();
  const bookings = (await Promise.all(codes.map((c) => findBookingByCode(c)))).filter((b): b is BookingRecord => b !== null);

  return (
    <div className="mx-auto grid grid-cols-1 max-w-6xl gap-12 px-4 pt-8 sm:px-6 md:pt-12 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
      <div className="max-w-md">
        <h1 className="text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">Rezervasyonum</h1>
        <p className="mt-3 text-lg text-stone">
          Randevunu ya da konaklamanı görmek, takvimine eklemek veya iptal etmek için kodunu ve telefon numaranı yaz.
        </p>
        <div className="mt-8 rounded-panel border border-line bg-surface p-5 sm:p-6">
          <LookupForm defaultCode={prefill} />
        </div>
      </div>

      <section aria-labelledby="bu-cihaz" className="lg:pt-24">
        <h2 id="bu-cihaz" className="text-2xl font-semibold">
          Bu cihazdaki rezervasyonların
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-3 max-w-[48ch] text-stone">
            Bu cihazdan yaptığın rezervasyonlar burada listelenir. Henüz bir rezervasyon yok;{" "}
            <Link href="/klinikler" className="font-medium text-pine underline underline-offset-2">
              klinikleri inceleyerek
            </Link>{" "}
            başlayabilirsin.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
            {bookings.map((b) => (
              <li key={b.record.code}>
                <Link href={`/rezervasyonum/${b.record.code}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      b.kind === "boarding" ? "bg-night text-lamp" : "bg-pine-soft text-pine"
                    }`}
                  >
                    {b.kind === "boarding" ? <BedDouble className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{b.clinic.name}</span>
                    <span className="block text-sm text-stone">
                      {b.kind === "appointment"
                        ? `${formatDateMedium(b.record.date)}, ${minutesToTime(b.record.startMinute)}, ${b.record.petName}`
                        : `${formatDateMedium(b.record.checkIn)}, ${b.record.nights} gece, ${b.record.petName}`}
                    </span>
                  </span>
                  <StatusPill status={b.record.status} kind={b.kind === "boarding" ? "boarding" : "appointment"} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
