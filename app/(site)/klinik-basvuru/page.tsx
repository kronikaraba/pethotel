import { redirect } from "next/navigation";

// Eski kayıt adresi: yeni kayıt sayfasına veteriner kliniği seçili olarak yönlendirir.
export default function LegacyRegisterPage() {
  redirect("/kayit?rol=veteriner");
}
