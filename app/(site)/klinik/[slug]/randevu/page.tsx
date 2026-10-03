import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone } from "lucide-react";
import { getClinicPageData } from "@/lib/data/public";
import { AppointmentWizard } from "@/components/booking/AppointmentWizard";
import { DemoBadge } from "@/components/site/DemoBadge";
import { formatPhone, phoneHref } from "@/lib/format";
import { diffDays, isValidDateString, isValidTime, todayInIstanbul } from "@/lib/time";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await getClinicPageData((await params).slug);
  return { title: data ? `Randevu al: ${data.clinic.name}` : "Randevu al", robots: { index: false } };
}

export default async function BookingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getClinicPageData(slug);
  if (!data) notFound();
  const { clinic, services, vets } = data;
  const today = todayInIstanbul();

  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const serviceId = services.some((s) => s.id === str("hizmet")) ? str("hizmet") : undefined;
  const rawDate = str("tarih");
  const date =
    rawDate && isValidDateString(rawDate) && diffDays(today, rawDate) >= 0 && diffDays(today, rawDate) <= clinic.maxDaysAhead
      ? rawDate
      : undefined;
  const rawTime = str("saat");
  const time = serviceId && date && rawTime && isValidTime(rawTime) ? rawTime : undefined;
  const vetId = vets.some((v) => v.id === str("veteriner")) ? str("veteriner") : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <Link href={`/klinik/${clinic.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-stone hover:text-pine">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {clinic.name}
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">Randevu al</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-stone">
            {clinic.name}, {clinic.district} {clinic.isDemo && <DemoBadge />}
          </p>
        </div>
      </div>

      {services.length === 0 || vets.length === 0 ? (
        <div className="rounded-panel border border-line bg-surface p-8">
          <h2 className="text-2xl font-semibold">Bu klinik henüz online randevu almıyor.</h2>
          <p className="mt-2 text-stone">Randevu için kliniği telefonla arayabilirsin.</p>
          <a href={phoneHref(clinic.phone)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white">
            <Phone className="h-4 w-4" aria-hidden />
            {formatPhone(clinic.phone)}
          </a>
        </div>
      ) : (
        <AppointmentWizard
          clinic={{
            slug: clinic.slug,
            name: clinic.name,
            district: clinic.district,
            city: clinic.city,
            workingHours: clinic.workingHours,
            closedDates: clinic.closedDates,
            maxDaysAhead: clinic.maxDaysAhead,
            autoConfirm: clinic.autoConfirm,
          }}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            durationMinutes: s.durationMinutes,
            price: s.price,
            description: s.description,
          }))}
          vets={vets.map((v) => ({ id: v.id, name: v.name, title: v.title }))}
          today={today}
          initial={{ serviceId, date, time, vetId }}
        />
      )}
    </div>
  );
}
