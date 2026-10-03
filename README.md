# PetHotel

Veteriner klinikleri için online randevu ve pet otel (konaklama) rezervasyon platformu.

- **Evcil hayvan sahipleri** şehre ve hizmete göre klinik bulur, boş saatleri görür ve **üye olmadan** randevu alır. Tatile çıkarken pet otel rezervasyonu ister. Rezervasyonlarını kod + telefonla görüntüler, takvimine ekler, iptal eder.
- **Klinikler** kendi panelinden günlük takvimi (veteriner sütunlarıyla), randevu durumlarını, pet otel doluluğunu, hizmetleri, ekibi, çalışma saatlerini ve kullanıcılarını yönetir. Telefonla gelen randevuları da aynı takvime işler.
- **Platform yöneticisi** klinik başvurularını onaylar, klinikleri askıya alır ya da yeniden yayına alır.

Teknoloji: Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4, PostgreSQL + Drizzle ORM, Zod, jose (imzalı oturum çerezleri), bcrypt.

---

## Bilgisayarında çalıştırma

Gereken tek şey **Node.js 20.9 veya üstü** (22 LTS önerilir). Veritabanı kurmana gerek yok.

```bash
npm install
npm run dev
```

Tarayıcıda <http://localhost:3000> adresini aç.

`DATABASE_URL` tanımlı değilse proje, klasördeki `.data/` dizininde **gömülü bir Postgres (PGlite)** çalıştırır ve ilk açılışta demo klinikleri yükler. Veritabanını sıfırlamak için sunucuyu durdurup `.data` klasörünü silmen yeterli.

### Demo hesaplar (yalnızca yerel veritabanında)

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Klinik yöneticisi (Moda Pati) | `moda@pethotel.local` | `pethotel123` |
| Klinik personeli (Moda Pati) | `resepsiyon@pethotel.local` | `pethotel123` |
| Platform yöneticisi | `admin@pethotel.local` | `pethotel123` |

Giriş sayfası: <http://localhost:3000/giris>. Demo kliniklerin hepsi sitede **Demo** etiketiyle görünür ve gerçek değildir.

Canlı veritabanında (`SEED_DEMO_DATA=true`) demo klinikler sitede görünür ama **bu şifrelerle giriş yapılamaz**; demo hesaplara rastgele şifre atanır. Canlıda klinik panelini denemek için `/klinik-basvuru` sayfasından bir test kliniği ekleyip yönetim panelinden onaylayabilirsin.

### Sorun giderme

- **`npm install` sonrası "vulnerabilities" uyarısı:** Aşağıdaki Güvenlik bölümündeki nota bak; yayındaki siteyi etkilemez.
- **Yerel veritabanı açılmıyor / bozuldu:** Sunucuyu durdur, `.data` klasörünü sil ve `npm run dev` ile yeniden başlat. Sorun sürerse proje klasörüne `.env.local` dosyası oluşturup `PGLITE_DATA_DIR=memory://` satırını ekle (veriler her yeniden başlatmada sıfırlanır) ya da ücretsiz bir Neon veritabanı adresini `DATABASE_URL` olarak yaz.
- **Port dolu:** `npm run dev -- -p 3001` ile başka bir portta başlat.

---

## Vercel'e yayınlama (Neon Postgres ile)

1. **GitHub'a yükle.** Proje klasöründe:
   ```bash
   git init
   git add .
   git commit -m "PetHotel ilk sürüm"
   ```
   GitHub'da boş bir depo oluştur ve verdiği `git remote add origin …` ile `git push -u origin main` komutlarını çalıştır.
2. **Vercel'de projeyi oluştur.** Vercel → *Add New → Project* → GitHub deposunu seç → *Deploy* demeden önce 3. ve 4. adımları yap (ya da ilk deploy başarısız olursa yaptıktan sonra *Redeploy* et).
3. **Veritabanını bağla.** Vercel projesinde *Storage → Create Database → Neon (Serverless Postgres)* → projeye bağla. `DATABASE_URL` otomatik eklenir. Bölge olarak Frankfurt'u seç ve *Settings → Functions* altında fonksiyon bölgesini de Frankfurt (`fra1`) yap; sunucu ile veritabanı aynı yerde olunca sayfalar daha hızlı açılır.
4. **Ortam değişkenlerini ekle** (*Settings → Environment Variables*):

   | Değişken | Açıklama |
   | --- | --- |
   | `ADMIN_EMAIL` | Platform yöneticisi e-postası (ilk açılışta hesap oluşturulur) |
   | `ADMIN_PASSWORD` | Platform yöneticisinin ilk şifresi. İlk girişten sonra `/admin/hesap` sayfasından değiştir; sonra bu değişkeni silebilirsin. |
   | `AUTH_SECRET` | İsteğe bağlı. Oturum çerezlerini imzalayan en az 32 karakterlik anahtar. Tanımlamazsan ilk açılışta rastgele bir anahtar üretilip veritabanında saklanır. Kendin vermek istersen: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXT_PUBLIC_SITE_URL` | İsteğe bağlı. Sitenin adresi, örn. `https://pethotel.com`. Tanımlamazsan Vercel'deki üretim adresi kullanılır. |
   | `SEED_DEMO_DATA` | Canlıda demo klinikleri görmek istersen `true`. Demo hesaplarla canlıda giriş yapılamaz. Gerçek kullanıma geçmeden kaldır. |

5. **Deploy.** `npm run build` önce veritabanı tablolarını oluşturur/günceller (migration), sonra siteyi derler. Bundan sonra `main` dalına her `git push` yaptığında Vercel siteyi **otomatik** yeniden yayınlar. Ortam değişkenlerini ya da veritabanı bağlantısını sonradan değiştirirsen *Deployments → … → Redeploy* ile yeniden yayınla.

> Başka bir sunucuda (Railway, Render, VPS…) çalıştıracaksan aynı ortam değişkenlerini tanımla; `npm run build` ve `npm start` yeterli.

---

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Migration uygular (DATABASE_URL varsa) ve üretim derlemesi yapar |
| `npm start` | Üretim sunucusu |
| `npm test` | Müsaitlik, çakışma ve kapasite testleri (bellek içi veritabanıyla) |
| `npm run lint` | ESLint |
| `npm run db:generate` | `lib/db/schema.ts` değişince yeni migration dosyası üretir |
| `npm run db:migrate` | Migration'ları elle uygular |
| `npm run db:seed` | Demo klinikleri ve platform yöneticisini yükler (klinik tablosu boşsa) |

---

## Proje yapısı

```
app/
  (site)/            Ziyaretçi sayfaları: ana sayfa, klinikler, klinik sayfası,
                     randevu sihirbazı, pet otel formu, rezervasyonum, klinik başvurusu, KVKK
  panel/             Klinik paneli (bugün, randevular, pet otel, hizmetler, ekip, kullanıcılar, ayarlar)
  admin/             Platform yönetimi (klinik onay / askıya alma)
  giris/             Giriş
  api/               Boş saatler, konaklama fiyat/uygunluk ve .ics takvim dosyası uçları
components/          Arayüz bileşenleri (site, booking, panel, admin, ui)
lib/
  booking/           Müsaitlik hesabı (saf fonksiyonlar), randevu ve konaklama işlemleri
  actions/           Server Actions (formların sunucu tarafı)
  auth/              Oturum (imzalı çerez), şifre, yetki kontrolü
  data/              Sayfa sorguları
  db/                Şema, bağlantı (Postgres / PGlite), demo veriler
drizzle/             SQL migration dosyaları
scripts/             migrate ve seed betikleri
tests/               Vitest testleri
```

### Nasıl çalışıyor?

- **Çift rezervasyon yok:** Randevu, klinik satırı kilitlenen bir veritabanı işlemi (transaction + `SELECT … FOR UPDATE`) içinde yazılır; aynı anda gelen istekler sıraya girer ve aynı veterinerin aynı saatine ikinci randevu yazılamaz. "Fark etmez" seçilirse o gün en az randevusu olan boş veteriner atanır.
- **Pet otel kapasitesi:** Kedi ve köpek için ayrı kapasite tutulur; her gece için dolu yer sayılır. Bekleyen talepler de kapasiteden düşer, klinik onaylayınca kesinleşir.
- **Saat dilimi:** Tüm hesaplar Türkiye saatine (Europe/Istanbul) göre yapılır.
- **Rezervasyonum:** Rezervasyon sonrası tarayıcıya imzalı bir çerez yazılır; sayfa bu cihazda 30 gün açılır. Başka cihazdan kod + telefonla erişilir. URL'de kişisel veri taşınmaz.

---

## Güvenlik

- Şifreler bcrypt ile saklanır; oturumlar `httpOnly`, `sameSite=lax` ve canlıda `secure` çerezlerde, HS256 ile imzalı JWT olarak tutulur. İmza anahtarı `AUTH_SECRET`'tan ya da (tanımlı değilse) ilk açılışta üretilip `app_settings` tablosunda saklanan rastgele anahtardan gelir.
- Her panel sayfası ve sunucu işlemi oturumu ve kaydın o kliniğe ait olduğunu ayrıca doğrular. Personel ayarlara ve kullanıcılara erişemez.
- Tüm form girdileri sunucuda Zod ile doğrulanır; telefonlar standart biçime çevrilir.
- Hatalı giriş, randevu, sorgulama ve başvuru istekleri hız sınırına tabidir; formlarda bot tuzağı (honeypot) alanı vardır.
- Güvenlik başlıkları (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) tüm sayfalarda gönderilir.
- Hız sınırı sunucu belleğinde tutulur (temel koruma). Yoğun trafik için Upstash Redis gibi paylaşımlı bir depo kullanmak önerilir.

> `npm install` sonrası görebileceğin `npm audit` uyarıları yalnızca geliştirme araçlarına (ESLint eklentisi, drizzle-kit) aittir; yayındaki siteye dahil olmazlar.

---

## Yayına almadan önce

- [ ] `/kvkk` sayfasındaki köşeli parantezli alanları doldur ve metni bir hukukçuya kontrol ettir.
- [ ] `SEED_DEMO_DATA` değişkenini kaldır; demo klinikler varsa yönetim panelinden askıya al.
- [ ] `ADMIN_PASSWORD` için güçlü bir şifre kullan; ilk girişten sonra `/admin/hesap` sayfasından değiştirip değişkeni Vercel'den sil.

## Sonraki adımlar için fikirler

- SMS / e-posta ile randevu onayı ve hatırlatma (ör. Netgsm, İleti Merkezi, Resend)
- Online ön ödeme / kapora (ör. iyzico)
- Hasta kartı ve aşı takvimi hatırlatmaları
- Klinik sayfasına harita ve fotoğraf galerisi
- Veterinere özel çalışma saatleri ve izin günleri
