import { requireClinicUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/panel/PageHeader";
import { SettingsForm } from "@/components/panel/SettingsForm";
import { formatPhone } from "@/lib/format";
import { BUSINESS_KIND_INFO } from "@/lib/constants";

const SETTINGS_DESCRIPTION = {
  vet: "Klinik bilgileri, çalışma saatleri ve randevu kuralları.",
  hotel: "Otel bilgileri, giriş ve çıkış saatleri, kapasite ve gecelik fiyatlar.",
  sitter: "Profil bilgilerin, hizmet verdiğin semtler, uygun saatlerin ve ziyaret kuralları.",
} as const;

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  return (
    <>
      <PageHeader title={BUSINESS_KIND_INFO[clinic.kind].settingsLabel} description={SETTINGS_DESCRIPTION[clinic.kind]} />
      <SettingsForm
        kind={clinic.kind}
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
