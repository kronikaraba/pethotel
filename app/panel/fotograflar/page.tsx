import Link from "next/link";
import { requireClinicUser } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";
import { listClinicPhotos } from "@/lib/data/photos";
import { PageHeader } from "@/components/panel/PageHeader";
import { PhotoManager } from "@/components/panel/PhotoManager";

export const metadata = { title: "Fotoğraflar" };

const PHOTO_TIPS = {
  vet: "Bekleme salonu ve muayene odasının fotoğrafları en çok ilgi görür.",
  hotel: "Odaların, bahçenin ve oyun alanının fotoğrafları en çok ilgi görür.",
  sitter: "Baktığın hayvanlarla çekilmiş, yüzünün göründüğü fotoğraflar güven verir.",
} as const;

export default async function PhotosPage() {
  const { clinic } = await requireClinicUser({ adminOnly: true });
  const photos = await listClinicPhotos(await getDb(), clinic.id);
  return (
    <>
      <PageHeader
        title="Fotoğraflar"
        description={
          <>
            İlk fotoğraf kapak olur ve arama listesinde görünür. Hepsi{" "}
            {clinic.status === "active" ? (
              <Link href={`/klinik/${clinic.slug}`} className="font-semibold text-pine underline-offset-4 hover:underline">
                sitedeki sayfanda
              </Link>
            ) : (
              "sitedeki sayfanda"
            )}{" "}
            sergilenir. {PHOTO_TIPS[clinic.kind]}
          </>
        }
      />
      <PhotoManager photos={photos} clinicName={clinic.name} />
    </>
  );
}
