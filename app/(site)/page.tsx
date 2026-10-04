import Link from "next/link";
import { BedDouble, CalendarCheck, Dog, House, Moon, ShieldCheck, Stethoscope, Syringe, Scissors, Microscope, HeartPulse } from "lucide-react";
import { SearchForm } from "@/components/site/SearchForm";
import { ClinicCard } from "@/components/site/ClinicCard";
import { CategoryStrip } from "@/components/site/CategoryStrip";
import { ButtonLink } from "@/components/ui/Button";
import { getCityStats, getUpcomingSlots } from "@/lib/data/public";
import { VET_SERVICE_CATEGORIES } from "@/lib/constants";

const FAQ = [
  {
    q: "Randevu almak ücretli mi?",
    a: "Hayır. PetHotel üzerinden randevu almak ücretsizdir. Ücreti kliniğe, otele ya da pet sittera doğrudan ödersin; sitede gördüğün fiyatlar onların paylaştığı başlangıç fiyatlarıdır.",
  },
  {
    q: "Üye olmam gerekiyor mu?",
    a: "Hayır. Randevunu aldığında sana bir kod verilir. Bu kod ve telefon numaranla randevunu dilediğin an görüntüleyip iptal edebilirsin.",
  },
  {
    q: "Randevumu nasıl iptal ederim?",
    a: "Rezervasyonum sayfasına kodunu ve telefon numaranı yaz. Randevu saatinden en geç 1 saat öncesine kadar çevrim içi iptal edebilirsin; daha sonrası için kliniği ara.",
  },
  {
    q: "Pet otel rezervasyonu nasıl kesinleşir?",
    a: "Konaklama talebin otele iletilir ve otel onayladığında kesinleşir. Durumunu Rezervasyonum sayfasından takip edebilirsin. Konaklama için aşıların güncel olması gerekir.",
  },
  {
    q: "Pet sitter evime nasıl gelir?",
    a: "Pet sitter profilinden hizmeti (ev ziyareti ya da köpek gezdirme) ve saati seç, adresini ve bakım notlarını yaz. Ücreti ziyaret sırasında bakıcıya ödersin.",
  },
  {
    q: "Acil bir durumum var, ne yapmalıyım?",
    a: "Acil durumlarda online randevu beklemeden en yakın veteriner kliniğini telefonla ara. Klinik sayfalarında telefon numarası her zaman görünür.",
  },
];

const DAY_SERVICES = [
  { icon: Stethoscope, label: "Genel muayene" },
  { icon: Syringe, label: "Aşı ve parazit" },
  { icon: Microscope, label: "Check-up ve tahlil" },
  { icon: HeartPulse, label: "Kısırlaştırma ve cerrahi" },
  { icon: Scissors, label: "Tıraş ve bakım" },
];

export default async function HomePage() {
  const [upcoming, cityStats] = await Promise.all([getUpcomingSlots({ limit: 8 }), getCityStats()]);
  const popularCities = cityStats.map((c) => c.city);

  return (
    <>
      {/* Giriş: Airbnb tarzı arama çubuğu */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-8 pb-8 sm:px-6 md:pt-12 lg:px-10">
          <h1 className="mx-auto max-w-[22ch] text-center text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">
            Veteriner, pet otel ve pet sitter, tek yerde.
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-center text-lg text-stone">
            Şehrindeki klinikleri, otelleri ve bakıcıları karşılaştır, boş saatleri gör ve üye olmadan randevunu al.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <SearchForm popularCities={popularCities} />
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-stone">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-pine" aria-hidden /> Üyelik gerekmez
            </li>
            <li className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-pine" aria-hidden /> Randevunu kodunla yönet
            </li>
          </ul>
          <div className="mt-10">
            <CategoryStrip categories={VET_SERVICE_CATEGORIES} hrefFor={(c) => (c ? `/klinikler?hizmet=${c}` : "/klinikler")} />
          </div>
        </div>
      </section>

      {/* En yakın boş saatler: klinik kartları */}
      <section aria-labelledby="bos-saatler" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="bos-saatler" className="flex items-center gap-2.5 text-2xl font-bold">
              En yakın boş saatler
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine/50 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pine" />
              </span>
            </h2>
            <p className="mt-1 text-stone">Saate dokun, doğrudan randevu adımına geç.</p>
          </div>
          <Link href="/klinikler" className="hidden shrink-0 font-semibold underline underline-offset-4 hover:text-pine sm:inline">
            Tüm klinikler
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-6 text-stone">
            Şu an gösterilecek boş saat yok.{" "}
            <Link href="/klinikler" className="font-semibold text-pine underline-offset-4 hover:underline">
              Tüm klinikleri gör
            </Link>
          </p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((item) => (
              <li key={item.clinic.id}>
                <ClinicCard item={item} maxSlots={4} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gündüz / gece: iki hizmet */}
      <section aria-label="Hizmetler" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-line shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)] md:grid-cols-2">
          <div className="bg-surface p-7 sm:p-10">
            <h2 className="text-3xl font-bold">Veteriner randevusu</h2>
            <p className="mt-3 max-w-[44ch] text-stone">
              Aşı takviminden yıllık check-up&apos;a kadar, kliniğin hizmetlerini ve süresini önceden gör. Veterinerini
              seçebilir ya da ilk boş hekime bırakabilirsin.
            </p>
            <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DAY_SERVICES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 font-medium">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-soft text-pine">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <ButtonLink href="/klinikler" className="mt-8">
              Randevu al
            </ButtonLink>
          </div>

          <div className="night relative overflow-hidden bg-night p-7 text-night-ink sm:p-10">
            <NightSky />
            <div className="relative">
              <h2 className="flex items-center gap-3 text-3xl font-bold">
                Pet otel
                <Moon className="h-6 w-6 text-lamp" aria-hidden />
              </h2>
              <p className="mt-3 max-w-[44ch] text-night-muted">
                Tatile ya da iş seyahatine giderken kedin ya da köpeğin güvendiğin bir otelde kalsın. Gecelik fiyatı ve
                boş yer durumunu tarih seçer seçmez gör.
              </p>
              <dl className="mt-7 space-y-4">
                <div className="flex gap-3">
                  <dt className="sr-only">Konaklama</dt>
                  <BedDouble className="mt-0.5 h-5 w-5 shrink-0 text-lamp" aria-hidden />
                  <dd>Kedi ve köpekler için ayrı kapasite</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="sr-only">Onay</dt>
                  <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-lamp" aria-hidden />
                  <dd>Otel onaylayınca rezervasyonun kesinleşir</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="sr-only">Sağlık</dt>
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-lamp" aria-hidden />
                  <dd>Girişte aşı karnesi kontrol edilir</dd>
                </div>
              </dl>
              <ButtonLink href="/klinikler?tur=otel" variant="lamp" className="mt-8">
                Pet otelleri gör
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Pet sitter */}
        <div className="mt-6 grid grid-cols-1 gap-6 rounded-3xl border border-line bg-pine-soft p-7 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h2 className="flex items-center gap-3 text-3xl font-bold">
              Pet sitter
              <Dog className="h-6 w-6 text-pine" aria-hidden />
            </h2>
            <p className="mt-3 max-w-[60ch] text-stone">
              Evden ayrılmak istemeyen dostun için bakıcı evine gelsin: mama, su, kum kabı, ilaç ve oyun. Köpeğin için
              günlük gezdirme de planlayabilirsin.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 font-medium">
              <li className="flex items-center gap-2">
                <House className="h-[18px] w-[18px] text-pine" aria-hidden /> Ev ziyareti
              </li>
              <li className="flex items-center gap-2">
                <Dog className="h-[18px] w-[18px] text-pine" aria-hidden /> Köpek gezdirme
              </li>
              <li className="flex items-center gap-2">
                <CalendarCheck className="h-[18px] w-[18px] text-pine" aria-hidden /> Saatini sen seç
              </li>
            </ul>
          </div>
          <ButtonLink href="/klinikler?tur=sitter" size="lg">
            Pet sitter bul
          </ButtonLink>
        </div>
      </section>

      {/* Nasıl çalışır: gerçek bir sıra olduğu için numaralı */}
      <section aria-labelledby="nasil" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
        <h2 id="nasil" className="text-3xl font-bold">
          Üç adımda randevu
        </h2>
        <ol className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {[
            ["Kliniğini seç", "Şehrine ve ihtiyacına göre klinikleri listele; hizmetleri, süreleri ve fiyatları karşılaştır."],
            ["Saatini seç", "Veterinerini ya da “fark etmez”i seç, takvimdeki boş saatlerden birine dokun."],
            ["Kodunu sakla", "Randevu kodunla randevunu dilediğin an görüntüleyebilir, takvimine ekleyebilir ya da iptal edebilirsin."],
          ].map(([title, body], i) => (
            <li key={title} className="border-t-2 border-ink pt-5">
              <span className="font-display text-5xl leading-none font-bold text-pine tabular">{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-stone">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Şehirler */}
      {cityStats.length > 0 && (
        <section aria-labelledby="sehirler" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
          <h2 id="sehirler" className="text-3xl font-bold">
            Şehirlere göre klinikler
          </h2>
          <ul className="mt-8 flex flex-wrap gap-3">
            {cityStats.map((c) => (
              <li key={c.city}>
                <Link
                  href={`/klinikler?sehir=${encodeURIComponent(c.city)}`}
                  className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-surface py-2 pr-2 pl-5 text-lg font-semibold transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.14)]"
                >
                  {c.city}
                  <span className="rounded-full bg-pine-soft px-3 py-1 text-sm text-pine tabular">{c.clinics} klinik</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Klinikler için */}
      <section aria-labelledby="klinikler-icin" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-8 rounded-3xl bg-pine p-8 text-white sm:p-12 md:grid-cols-[1.4fr_minmax(0,1fr)] md:items-end">
          <div>
            <h2 id="klinikler-icin" className="text-3xl font-bold sm:text-4xl">
              Sen de PetHotel&apos;e katıl
            </h2>
            <p className="mt-4 max-w-[52ch] text-white/80">
              Veteriner kliniği, pet otel ya da pet sitter olarak kayıt ol. Her hesap türünün kendi paneli var: randevu
              takvimi, konaklama doluluğu ya da ziyaret planı tek yerde.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <ButtonLink href="/kayit" variant="lamp" size="lg">
              Kayıt ol
            </ButtonLink>
            <ButtonLink href="/giris" size="lg" className="border border-white/30 bg-transparent hover:bg-white/10">
              Giriş yap
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* SSS */}
      <section aria-labelledby="sss" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:px-10">
        <h2 id="sss" className="text-3xl font-bold">
          Sık sorulanlar
        </h2>
        <div className="mt-8 max-w-3xl divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-xl leading-none text-stone transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[62ch] pb-5 text-stone">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

/** Gece panelindeki sade yıldızlar (dekor, ekran okuyucudan gizli). */
function NightSky() {
  const stars: [number, number, number][] = [
    [88, 12, 5],
    [74, 22, 3],
    [94, 34, 3.5],
    [63, 8, 2.5],
    [82, 44, 2.5],
    [55, 18, 2],
  ];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {stars.map(([x, y, size], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-lamp"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, opacity: 0.45 + (i % 3) * 0.18 }}
        />
      ))}
    </div>
  );
}
