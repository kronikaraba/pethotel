import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, MapPin, Phone } from "lucide-react";
import { findBookingByCode } from "@/lib/data/lookup";
import { canViewBooking } from "@/lib/lookup";
import { normalizeBookingCode } from "@/lib/booking/codes";
import { canCustomerCancelAppointment } from "@/lib/booking/appointments";
import { canCustomerCancelBoarding } from "@/lib/booking/boarding";
import { BookingTag } from "@/components/booking/BookingTag";
import { CancelBooking } from "@/components/booking/CancelBooking";
import { StatusPill } from "@/components/ui/StatusPill";
import { buttonClass } from "@/components/ui/Button";
import { PET_SPECIES_LABELS, CANCEL_CUTOFF_MINUTES } from "@/lib/constants";
import { durationLabel, formatPhone, formatPrice, phoneHref } from "@/lib/format";
import { formatDateLong, minutesToTime, relativeDayLabel, todayInIstanbul } from "@/lib/time";

export const metadata: Metadata = { title: "Rezervasyonum", robots: { index: false } };

type Params = Promise<{ code: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function mapsUrl(name: string, address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;
}

export default async function BookingDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ code: raw }, sp] = await Promise.all([params, searchParams]);
  const code = normalizeBookingCode(decodeURIComponent(raw));
  if (!code) redirect("/rezervasyonum");
  if (!(await canViewBooking(code))) redirect(`/rezervasyonum?kod=${encodeURIComponent(code)}`);

  const booking = await findBookingByCode(code);
  if (!booking) redirect("/rezervasyonum");
  const isNew = sp.yeni === "1";
  const { clinic } = booking;
  const today = todayInIstanbul();

  if (booking.kind === "appointment") {
    const a = booking.record;
    const when = `${minutesToTime(a.startMinute)}–${minutesToTime(a.endMinute)}`;
    const cancellable = canCustomerCancelAppointment(a);
    const active = a.status === "pending" || a.status === "confirmed";
    const heading = isNew
      ? a.status === "pending"
        ? "Randevu talebin alındı"
        : "Randevun alındı"
      : "Randevun";
    const message: Record<string, string> = {
      confirmed: "Randevun onaylı. Randevu saatinden birkaç dakika önce klinikte olman yeterli.",
      pending: "Klinik onayı bekleniyor. Durumu bu sayfadan takip edebilirsin.",
      completed: "Bu randevu tamamlandı.",
      cancelled: a.cancelledBy === "clinic" ? "Bu randevu klinik tarafından iptal edildi." : "Bu randevuyu iptal ettin.",
      no_show: "Bu randevuya gelinmedi olarak işaretlendi.",
    };

    return (
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 md:pt-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-14">
          <BookingTag code={a.code} tone="day" swing={isNew}>
            <p className="font-display text-xl font-semibold">{relativeDayLabel(a.date, today)}</p>
            <p className="font-display text-4xl font-bold tabular">{minutesToTime(a.startMinute)}</p>
            <p className="mt-2 text-white/80">{a.petName}</p>
          </BookingTag>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
              <StatusPill status={a.status} />
            </div>
            <p className="mt-3 max-w-[56ch] text-lg text-stone">{message[a.status]}</p>

            <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
              <Detail label="Tarih ve saat">
                {formatDateLong(a.date)}
                <span className="block text-stone tabular">{when}</span>
              </Detail>
              <Detail label="Hizmet">
                {a.serviceName}
                <span className="block text-stone">{durationLabel(a.endMinute - a.startMinute)}</span>
              </Detail>
              <Detail label="Veteriner">{a.vetName ?? "Klinik atayacak"}</Detail>
              <Detail label="Evcil hayvan">
                {a.petName}
                <span className="block text-stone">{PET_SPECIES_LABELS[a.petSpecies]}</span>
              </Detail>
              <Detail label="Klinik">
                <Link href={`/klinik/${clinic.slug}`} className="text-pine hover:underline">
                  {clinic.name}
                </Link>
                <span className="block text-stone">{clinic.address}</span>
              </Detail>
              {a.price !== null && <Detail label="Ücret (klinikte ödenir)">{formatPrice(a.price)}</Detail>}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              {active && (
                <a href={`/api/takvim/${a.code}`} className={buttonClass("primary", "md")}>
                  <CalendarPlus className="h-4 w-4" aria-hidden />
                  Takvime ekle
                </a>
              )}
              <a href={mapsUrl(clinic.name, clinic.address)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <MapPin className="h-4 w-4" aria-hidden />
                Yol tarifi
              </a>
              <a href={phoneHref(clinic.phone)} className={buttonClass("secondary", "md")}>
                <Phone className="h-4 w-4" aria-hidden />
                {formatPhone(clinic.phone)}
              </a>
            </div>

            {active && (
              <div className="mt-8 border-t border-line pt-6">
                {cancellable ? (
                  <CancelBooking code={a.code} label="Randevuyu iptal et" />
                ) : (
                  <p className="text-sm text-stone">
                    Randevuya {CANCEL_CUTOFF_MINUTES} dakikadan az kaldığı için çevrim içi iptal kapandı. Değişiklik için kliniği ara.
                  </p>
                )}
              </div>
            )}

            <Footnote />
          </div>
        </div>
      </div>
    );
  }

  // Konaklama
  const r = booking.record;
  const cancellable = canCustomerCancelBoarding(r);
  const heading = isNew ? "Konaklama talebin alındı" : "Konaklama rezervasyonun";
  const message: Record<string, string> = {
    pending: "Talebin kliniğe iletildi. Klinik onayladığında rezervasyonun kesinleşecek; durumu bu sayfadan takip edebilirsin.",
    confirmed: "Rezervasyonun onaylandı. Giriş gününde aşı karnesini yanında getir.",
    checked_in: "Dostun şu anda klinikte konaklıyor.",
    completed: "Konaklama tamamlandı.",
    cancelled: r.cancelledBy === "clinic" ? "Bu konaklama klinik tarafından iptal edildi." : "Bu konaklamayı iptal ettin.",
    rejected: "Klinik bu tarihler için talebini kabul edemedi.",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 md:pt-12">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-14">
        <BookingTag code={r.code} tone="night" swing={isNew}>
          <p className="text-night-muted">Giriş</p>
          <p className="font-display text-2xl font-semibold">{relativeDayLabel(r.checkIn, today)}</p>
          <p className="mt-3 font-display text-4xl font-bold text-lamp tabular">{r.nights} gece</p>
          <p className="mt-2 text-night-muted">{r.petName}</p>
        </BookingTag>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
            <StatusPill status={r.status} kind="boarding" />
          </div>
          <p className="mt-3 max-w-[56ch] text-lg text-stone">{message[r.status]}</p>
          {r.clinicNote && (
            <p className="mt-4 rounded-card bg-surface p-4 text-[0.95rem]">
              <span className="font-semibold">Kliniğin notu: </span>
              {r.clinicNote}
            </p>
          )}

          <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
            <Detail label="Giriş">{formatDateLong(r.checkIn)}</Detail>
            <Detail label="Çıkış">{formatDateLong(r.checkOut)}</Detail>
            <Detail label="Misafir">
              {r.petName}
              <span className="block text-stone">
                {r.species === "cat" ? "Kedi" : "Köpek"}
                {r.petBreed ? `, ${r.petBreed}` : ""}
              </span>
            </Detail>
            <Detail label="Klinik">
              <Link href={`/klinik/${clinic.slug}`} className="text-pine hover:underline">
                {clinic.name}
              </Link>
              <span className="block text-stone">{clinic.address}</span>
            </Detail>
            {r.totalPrice !== null && (
              <Detail label="Tahmini ücret">
                {formatPrice(r.totalPrice)}
                {r.nightlyPrice !== null && (
                  <span className="block text-stone">
                    {r.nights} gece × {formatPrice(r.nightlyPrice)}
                  </span>
                )}
              </Detail>
            )}
          </dl>
          {clinic.boardingNotes && <p className="mt-6 max-w-[60ch] text-[0.95rem] text-stone">{clinic.boardingNotes}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            {(r.status === "pending" || r.status === "confirmed") && (
              <a href={`/api/takvim/${r.code}`} className={buttonClass("night", "md")}>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Takvime ekle
              </a>
            )}
            <a href={mapsUrl(clinic.name, clinic.address)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
              <MapPin className="h-4 w-4" aria-hidden />
              Yol tarifi
            </a>
            <a href={phoneHref(clinic.phone)} className={buttonClass("secondary", "md")}>
              <Phone className="h-4 w-4" aria-hidden />
              {formatPhone(clinic.phone)}
            </a>
          </div>

          {(r.status === "pending" || r.status === "confirmed") && (
            <div className="mt-8 border-t border-line pt-6">
              {cancellable ? (
                <CancelBooking code={r.code} label="Konaklamayı iptal et" />
              ) : (
                <p className="text-sm text-stone">Giriş günü geldiği için çevrim içi iptal kapandı. Değişiklik için kliniği ara.</p>
              )}
            </div>
          )}

          <Footnote />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-stone">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function Footnote() {
  return (
    <p className="mt-10 max-w-[60ch] text-sm text-stone">
      Bu sayfa bu cihazda 30 gün boyunca açılır. Başka bir cihazdan{" "}
      <Link href="/rezervasyonum" className="font-medium text-pine underline underline-offset-2">
        Rezervasyonum
      </Link>{" "}
      sayfasına kodunu ve telefonunu yazarak ulaşabilirsin.
    </p>
  );
}
