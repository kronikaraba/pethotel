import Link from "next/link";
import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicServices, getClinicVets } from "@/lib/data/panel";
import { isValidDateString, todayInIstanbul } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { ManualAppointmentForm } from "@/components/panel/ManualAppointmentForm";
import { buttonClass } from "@/components/ui/Button";

export const metadata = { title: "Randevu ekle" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NewAppointmentPage({ searchParams }: { searchParams: SearchParams }) {
  const { clinic, isAdmin } = await requireClinicUser({ kinds: ["vet", "sitter"] });
  const sitter = clinic.kind === "sitter";
  const sp = await searchParams;
  const today = todayInIstanbul();
  const date = typeof sp.tarih === "string" && isValidDateString(sp.tarih) && sp.tarih >= today ? sp.tarih : today;
  const [svc, vetRows] = await Promise.all([getClinicServices(clinic.id), getClinicVets(clinic.id)]);
  const services = svc.filter((s) => s.isActive);
  const vets = vetRows.filter((v) => v.isActive);

  return (
    <>
      <PageHeader
        title={sitter ? "Ziyaret ekle" : "Randevu ekle"}
        description={
          sitter
            ? "Telefonla ya da mesajla gelen ziyaret taleplerini takvimine işle. Çakışan saatler gösterilmez."
            : "Telefonla ya da kapıdan gelen randevuları takvime işle. Çakışan saatler gösterilmez."
        }
      />
      {services.length === 0 || vets.length === 0 ? (
        <EmptyState
          title={sitter ? "Önce bir hizmet eklemelisin." : "Önce hizmet ve veteriner eklemelisin."}
          action={
            isAdmin ? (
              <Link href={services.length === 0 ? "/panel/hizmetler" : "/panel/ekip"} className={buttonClass("primary", "md")}>
                {services.length === 0 ? "Hizmet ekle" : "Veteriner ekle"}
              </Link>
            ) : undefined
          }
        >
          {sitter ? "Ziyaret takvimi aktif hizmetlerin üzerinden oluşur." : "Randevu takvimi aktif hizmetler ve veterinerler üzerinden oluşur."}
        </EmptyState>
      ) : (
        <ManualAppointmentForm
          clinicSlug={clinic.slug}
          services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes }))}
          vets={vets.map((v) => ({ id: v.id, name: v.name, title: v.title }))}
          defaultDate={date}
        />
      )}
    </>
  );
}
