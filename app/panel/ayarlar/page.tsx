import { requireClinicUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/panel/PageHeader";
import { SettingsForm } from "@/components/panel/SettingsForm";
import { formatPhone } from "@/lib/format";

export const metadata = { title: "Klinik ayarları" };

export default async function SettingsPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  return (
    <>
      <PageHeader title="Klinik ayarları" description="Bilgiler, çalışma saatleri, randevu kuralları ve pet otel." />
      <SettingsForm
        phoneDisplay={formatPhone(clinic.phone)}
        initial={{
          name: clinic.name,
          city: clinic.city,
          district: clinic.district,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email ?? "",
          description: clinic.description ?? "",
          workingHours: clinic.workingHours,
          closedDates: clinic.closedDates,
          slotMinutes: clinic.slotMinutes,
          minNoticeMinutes: clinic.minNoticeMinutes,
          maxDaysAhead: clinic.maxDaysAhead,
          autoConfirm: clinic.autoConfirm,
          boardingEnabled: clinic.boardingEnabled,
          boardingCatCapacity: clinic.boardingCatCapacity,
          boardingDogCapacity: clinic.boardingDogCapacity,
          boardingCatPrice: clinic.boardingCatPrice,
          boardingDogPrice: clinic.boardingDogPrice,
          boardingNotes: clinic.boardingNotes ?? "",
        }}
      />
    </>
  );
}
