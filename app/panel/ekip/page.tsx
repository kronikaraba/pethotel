import { requireClinicUser } from "@/lib/auth/dal";
import { getClinicVets } from "@/lib/data/panel";
import { PageHeader } from "@/components/panel/PageHeader";
import { VetManager } from "@/components/panel/VetManager";

export const metadata = { title: "Ekip" };

export default async function TeamPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const vets = await getClinicVets(clinic.id);
  return (
    <>
      <PageHeader
        title="Veteriner ekibi"
        description="Her aktif veteriner takvimde ayrı bir sütundur; aynı saate farklı veterinerlere randevu verilebilir."
      />
      <VetManager vets={vets.map((v) => ({ id: v.id, name: v.name, title: v.title, bio: v.bio, isActive: v.isActive }))} />
    </>
  );
}
