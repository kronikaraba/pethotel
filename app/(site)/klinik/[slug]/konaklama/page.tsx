import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getActiveClinicBySlug } from "@/lib/data/public";
import { boardingPrice, boardingSpeciesOf } from "@/lib/booking/boarding";
import { BoardingForm } from "@/components/booking/BoardingForm";
import { DemoBadge } from "@/components/site/DemoBadge";
import { buttonClass } from "@/components/ui/Button";
import { todayInIstanbul } from "@/lib/time";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const clinic = await getActiveClinicBySlug((await params).slug);
  return { title: clinic ? `Pet otel: ${clinic.name}` : "Pet otel", robots: { index: false } };
}

export default async function BoardingPage({ params }: { params: Params }) {
  const clinic = await getActiveClinicBySlug((await params).slug);
  if (!clinic) notFound();
  const species = boardingSpeciesOf(clinic);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <Link href={`/klinik/${clinic.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-stone hover:text-pine">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {clinic.name}
      </Link>
      <div className="mt-4 mb-8">
        <h1 className="text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">Pet otel rezervasyonu</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-stone">
          {clinic.name}, {clinic.district} {clinic.isDemo && <DemoBadge />}
        </p>
      </div>

      {species.length === 0 ? (
        <div className="rounded-panel border border-line bg-surface p-8">
          <h2 className="text-2xl font-semibold">Bu klinik şu anda konaklama kabul etmiyor.</h2>
          <p className="mt-2 text-stone">Pet otel hizmeti veren diğer kliniklere göz atabilirsin.</p>
          <Link href="/klinikler?otel=1" className={buttonClass("night", "md", "mt-5")}>
            Pet otelleri gör
          </Link>
        </div>
      ) : (
        <BoardingForm
          clinicSlug={clinic.slug}
          species={species.map((s) => ({ value: s, price: boardingPrice(clinic, s) }))}
          today={todayInIstanbul()}
          notes={clinic.boardingNotes}
          workingHours={clinic.workingHours}
          closedDates={clinic.closedDates}
        />
      )}
    </div>
  );
}
