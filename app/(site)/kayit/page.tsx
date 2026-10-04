import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, ChevronLeft, ChevronRight, Dog, Stethoscope } from "lucide-react";
import { RegisterForm } from "@/components/site/RegisterForm";
import { BUSINESS_KIND_INFO, BUSINESS_KINDS, kindFromSlug, type BusinessKind } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Kayıt ol",
  description: "Veteriner kliniği, pet otel ya da pet sitter olarak PetHotel'e kayıt ol. Her hesap türünün kendi paneli var.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ROLES: Record<
  BusinessKind,
  { title: string; heading: string; pitch: string; panel: string[]; steps: [string, string][]; Icon: typeof Stethoscope; tone: string }
> = {
  vet: {
    title: "Veteriner kliniği",
    heading: "Kliniğini PetHotel'e ekle",
    pitch: "Hasta sahipleri boş saatlerini görüp online randevu alsın.",
    panel: ["Randevu takvimi", "Hizmetler ve fiyatlar", "Veteriner ekibi"],
    steps: [
      ["Kliniğini kaydet", "Klinik bilgilerini ve panel hesabını oluştur. Paneline hemen giriş yaparsın."],
      ["Takvimini hazırla", "Hizmetlerini, veterinerlerini ve çalışma saatlerini gir."],
      ["Onaydan sonra yayındasın", "Platform ekibi kaydını kontrol eder; onaylanınca kliniğin sitede listelenir."],
    ],
    Icon: Stethoscope,
    tone: "bg-pine-soft text-pine",
  },
  hotel: {
    title: "Pet otel",
    heading: "Otelini PetHotel'e ekle",
    pitch: "Kedi ve köpek sahipleri tarih seçip konaklama istesin.",
    panel: ["Konaklama takvimi ve doluluk", "Oda kapasitesi ve gecelik fiyat", "Giriş ve çıkış takibi"],
    steps: [
      ["Otelini kaydet", "Otel bilgilerini ve panel hesabını oluştur. Paneline hemen giriş yaparsın."],
      ["Kapasiteni gir", "Kedi ve köpek kapasiteni, gecelik fiyatlarını ve konaklama kurallarını yaz."],
      ["Onaydan sonra yayındasın", "Platform ekibi kaydını kontrol eder; onaylanınca otelin sitede listelenir."],
    ],
    Icon: BedDouble,
    tone: "bg-night text-lamp",
  },
  sitter: {
    title: "Pet sitter",
    heading: "Pet sitter olarak katıl",
    pitch: "Evcil hayvan sahipleri ev ziyareti ve gezdirme için saat ayırsın.",
    panel: ["Ziyaret takvimi", "Hizmetlerin ve fiyatların", "Hizmet verdiğin semtler"],
    steps: [
      ["Profilini oluştur", "Kendini tanıt, hizmet verdiğin semtleri yaz. Paneline hemen giriş yaparsın."],
      ["Uygun saatlerini gir", "Hangi gün ve saatlerde ziyarete gidebildiğini, hizmet fiyatlarını belirle."],
      ["Onaydan sonra yayındasın", "Platform ekibi profilini kontrol eder; onaylanınca sitede listelenirsin."],
    ],
    Icon: Dog,
    tone: "bg-lamp-soft text-[#5c4100]",
  },
};

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kind = kindFromSlug(typeof sp.rol === "string" ? sp.rol : null);

  if (!kind) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-12">
        <h1 className="max-w-[18ch] text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">PetHotel&apos;e kayıt ol</h1>
        <p className="mt-4 max-w-[52ch] text-lg text-stone">Hangi hesap türüyle katılıyorsun? Her türün kendi paneli ve kendi sayfa düzeni var.</p>
        <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {BUSINESS_KINDS.map((k) => {
            const role = ROLES[k];
            return (
              <li key={k}>
                <Link
                  href={`/kayit?rol=${BUSINESS_KIND_INFO[k].slug}`}
                  className="group flex h-full flex-col rounded-3xl border border-line-strong bg-surface p-6 transition-shadow hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] focus-visible:outline-2 focus-visible:outline-pine sm:p-7"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${role.tone}`}>
                    <role.Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{role.title}</h2>
                  <p className="mt-2 text-stone">{role.pitch}</p>
                  <ul className="mt-5 space-y-1.5 text-[0.95rem]">
                    {role.panel.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pine" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-auto inline-flex items-center gap-1 pt-7 font-semibold text-pine">
                    {role.title} olarak devam et
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-[0.95rem] text-stone">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-pine underline-offset-4 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    );
  }

  const role = ROLES[kind];
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-12">
      <Link href="/kayit" className="inline-flex items-center gap-1 text-sm font-medium text-stone hover:text-pine">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Hesap türünü değiştir
      </Link>
      <div className="mt-4 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-16">
        <div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${role.tone}`}>
            <role.Icon className="h-4 w-4" aria-hidden />
            {role.title} hesabı
          </span>
          <h1 className="mt-4 max-w-[16ch] text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">
            {role.heading}
          </h1>
          <p className="mt-4 max-w-[48ch] text-lg text-stone">{role.pitch}</p>
          <ol className="mt-10 space-y-7">
            {role.steps.map(([title, body], i) => (
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
          <RegisterForm key={kind} kind={kind} />
        </div>
      </div>
    </div>
  );
}
