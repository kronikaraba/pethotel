import type { Metadata } from "next";
import { RegisterForm } from "@/components/site/RegisterForm";

export const metadata: Metadata = {
  title: "Kliniğini ekle",
  description: "Veteriner kliniğini PetHotel'e ekle: online randevu, ekip takvimi ve pet otel doluluğu tek panelde.",
};

const STEPS = [
  ["Başvurunu gönder", "Klinik bilgilerini ve panel hesabını oluştur. Paneline hemen giriş yaparsın."],
  ["Takvimini hazırla", "Hizmetlerini, veterinerlerini, çalışma saatlerini ve pet otel kapasiteni gir."],
  ["Onaydan sonra yayındasın", "Platform ekibi başvurunu kontrol eder; onaylanınca kliniğin sitede listelenir."],
];

export default function RegisterPage() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 pt-8 sm:px-6 md:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-16">
      <div>
        <h1 className="max-w-[14ch] text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">Kliniğini PetHotel&apos;e ekle</h1>
        <p className="mt-4 max-w-[48ch] text-lg text-stone">
          Hasta sahipleri boş saatlerini görüp online randevu alsın; telefonla gelen randevuları da aynı takvime işle.
        </p>
        <ol className="mt-10 space-y-7">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine text-lg font-bold text-white tabular">
                {i + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-0.5 text-stone">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative rounded-panel border border-line bg-surface p-5 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
