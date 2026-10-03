import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicServices } from "@/lib/data/panel";
import { PageHeader } from "@/components/panel/PageHeader";
import { ServiceManager } from "@/components/panel/ServiceManager";

export const metadata = { title: "Hizmetler" };

export default async function ServicesPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const services = await getClinicServices(clinic.id);
  return (
    <>
      <PageHeader
        title="Hizmetler"
        description="Online randevuda görünen hizmetler. Süre, takvimde kaç dakika yer kaplayacağını belirler."
      />
      <ServiceManager
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
