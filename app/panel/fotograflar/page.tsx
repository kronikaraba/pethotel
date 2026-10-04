import Link from "next/link";
import { requireClinicUser } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";
import { listClinicPhotos } from "@/lib/data/photos";
import { PageHeader } from "@/components/panel/PageHeader";
import { PhotoManager } from "@/components/panel/PhotoManager";

export const metadata = { title: "Fotoğraflar" };

export default async function PhotosPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const photos = await listClinicPhotos(await getDb(), clinic.id);
  return (
    <>
      <PageHeader
        title="Fotoğraflar"
        description={
          <>
            İlk fotoğraf kapak olur ve klinik listesinde görünür. Hepsi{" "}
            {clinic.status === "active" ? (
              <Link href={`/klinik/${clinic.slug}`} className="font-semibold text-pine underline-offset-4 hover:underline">
                klinik sayfanda
              </Link>
            ) : (
              "klinik sayfanda"
            )}{" "}
            sergilenir. Bekleme salonu, muayene odası ve pet otel odalarının fotoğrafları en çok ilgi görür.
          </>
        }
      />
      <PhotoManager photos={photos} clinicName={clinic.name} />
    </>
  );
}
