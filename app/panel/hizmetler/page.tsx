import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicServices } from "@/lib/data/panel";
import { PageHeader } from "@/components/panel/PageHeader";
import { ServiceManager } from "@/components/panel/ServiceManager";
import { SITTER_SERVICE_CATEGORIES, VET_SERVICE_CATEGORIES } from "@/lib/constants";

export const metadata = { title: "Hizmetler" };

export default async function ServicesPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true, kinds: ["vet", "sitter"] });
  const services = await getClinicServices(clinic.id);
  return (
    <>
      <PageHeader
        title="Hizmetler"
        description={
          clinic.kind === "sitter"
            ? "Profilinde görünen hizmetler. Süre, ziyaretin takviminde kaç dakika yer kaplayacağını belirler."
            : "Online randevuda görünen hizmetler. Süre, takvimde kaç dakika yer kaplayacağını belirler."
        }
      />
      <ServiceManager
        categories={clinic.kind === "sitter" ? SITTER_SERVICE_CATEGORIES : VET_SERVICE_CATEGORIES}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          durationMinutes: s.durationMinutes,
          price: s.price,
          description: s.description,
          isActive: s.isActive,
        }))}
      />
    </>
  );
}
