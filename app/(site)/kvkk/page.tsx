import type { Metadata } from "next";

export const metadata: Metadata = { title: "KVKK aydınlatma metni" };

export default function KvkkPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 md:pt-12">
      <h1 className="text-[2.25rem] leading-[1.05] font-bold sm:text-5xl">Kişisel verilerin korunması aydınlatma metni</h1>
      <p className="mt-6 rounded-card border border-[#e9c46a] bg-lamp-soft p-4 text-[0.95rem] text-[#5c4100]">
        Bu metin bir şablondur. Köşeli parantez içindeki alanları kendi bilgilerinle doldur ve yayına almadan önce bir hukuk
        danışmanına kontrol ettir.
      </p>

      <div className="mt-10 space-y-8 text-[1.0625rem] leading-relaxed [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        <section>
          <h2>Veri sorumlusu</h2>
          <p className="mt-3">
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla [Şirket unvanı]
            (&quot;PetHotel&quot;) tarafından aşağıda açıklanan kapsamda işlenmektedir. Adres: [Şirket adresi]. E-posta: [iletişim e-postası].
          </p>
        </section>

        <section>
          <h2>İşlenen kişisel veriler</h2>
          <ul>
            <li>Kimlik ve iletişim: ad soyad, telefon numarası, isteğe bağlı e-posta adresi.</li>
            <li>Randevu ve konaklama: seçilen klinik, hizmet, tarih ve saat, rezervasyon kodu, kliniğe ilettiğiniz notlar.</li>
            <li>Evcil hayvan bilgileri: adı, türü, cinsi, yaşı ve aşı durumu beyanı.</li>
            <li>İşlem güvenliği: IP adresi ve oturum çerezleri.</li>
          </ul>
        </section>

        <section>
          <h2>İşleme amaçları ve hukuki sebepler</h2>
          <p className="mt-3">
            Verileriniz; randevu ve konaklama talebinizin oluşturulması, seçtiğiniz kliniğe iletilmesi, rezervasyonunuzu görüntüleyip iptal
            edebilmeniz ve platform güvenliğinin sağlanması amaçlarıyla işlenir. Hukuki sebepler: bir sözleşmenin kurulması veya ifasıyla
            doğrudan ilgili olması (KVKK m. 5/2-c) ve temel hak ve özgürlüklerinize zarar vermemek kaydıyla veri sorumlusunun meşru menfaati
            (KVKK m. 5/2-f).
          </p>
        </section>

        <section>
          <h2>Aktarım</h2>
          <p className="mt-3">
            Randevu ve konaklama bilgileriniz yalnızca seçtiğiniz veteriner kliniğiyle paylaşılır. Platformun barındırma ve veritabanı
            hizmetleri [hizmet sağlayıcıları ve sunucu konumları] üzerinden sağlanır. Sunucular yurt dışında bulunuyorsa aktarım KVKK m. 9
            kapsamındaki şartlara uygun olarak yapılır.
          </p>
        </section>

        <section>
          <h2>Saklama süresi</h2>
          <p className="mt-3">
            Veriler, randevu veya konaklama tarihinden itibaren [süre] boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hale
            getirilir. Klinikler, kendi mevzuat yükümlülükleri kapsamında hasta kayıtlarını ayrıca saklayabilir.
          </p>
        </section>

        <section>
          <h2>Haklarınız</h2>
          <p className="mt-3">
            KVKK m. 11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme,
            aktarıldığı üçüncü kişileri bilme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve zararın
            giderilmesini talep etme haklarına sahipsiniz. Başvurularınızı [iletişim e-postası] adresine iletebilirsiniz.
          </p>
        </section>
      </div>
    </article>
  );
}
