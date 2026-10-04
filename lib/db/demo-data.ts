// Demo veriler: sitenin ilk açılışta boş görünmemesi için örnek klinikler.
// Hepsi "Demo" etiketiyle gösterilir ve gerçek klinikleri temsil etmez.
// Canlı ortamda yalnızca SEED_DEMO_DATA=true ise yüklenir.
import { randomBytes } from "node:crypto";
import type { Tx } from "./index";
import {
  appointments,
  boardingReservations,
  clinics,
  services,
  users,
  vets,
  type WeekHours,
} from "./schema";
import type { BusinessKind, ServiceCategory } from "../constants";
import { hashPassword } from "../auth/password";
import { addDays, nowInIstanbul, timeToMinutes, weekdayOf } from "../time";

export const DEMO_PASSWORD = "pethotel123";

type DemoService = { name: string; category: ServiceCategory; duration: number; price: number; description?: string };

const BASE_SERVICES: DemoService[] = [
  { name: "Genel muayene", category: "muayene", duration: 30, price: 900, description: "Fiziksel muayene, kilo ve ateş kontrolü, genel değerlendirme." },
  { name: "Karma aşı", category: "asi", duration: 15, price: 850, description: "Yaşa ve türe uygun karma aşı; aşı karnesine işlenir." },
  { name: "Kuduz aşısı", category: "asi", duration: 15, price: 700 },
  { name: "İç ve dış parazit uygulaması", category: "asi", duration: 15, price: 550 },
  { name: "Check-up ve kan tahlili", category: "checkup", duration: 45, price: 2800, description: "Hemogram ve biyokimya paneli, sonuçların yorumlanması." },
  { name: "Diş taşı temizliği", category: "dis", duration: 60, price: 4200, description: "Ultrasonik temizlik ve parlatma. Öncesinde ön muayene gerekir." },
  { name: "Kısırlaştırma ön görüşmesi", category: "cerrahi", duration: 30, price: 900 },
  { name: "Ultrason", category: "goruntuleme", duration: 30, price: 1800 },
  { name: "Mikroçip uygulaması", category: "diger", duration: 15, price: 600 },
  { name: "Tıraş ve bakım", category: "bakim", duration: 60, price: 1500, description: "Banyo, tüy kesimi, tırnak ve kulak bakımı." },
];

const SITTER_SERVICES: DemoService[] = [
  { name: "Ev ziyareti (45 dk)", category: "ziyaret", duration: 45, price: 550, description: "Mama ve su, kum kabı temizliği, ilaç, oyun. Ziyaret sonunda fotoğraflı bilgi." },
  { name: "Uzun ev ziyareti (2 saat)", category: "ziyaret", duration: 120, price: 1100, description: "Yalnız kalmayı sevmeyen dostlar için uzun ziyaret: oyun, bakım ve dinlenme." },
  { name: "Köpek gezdirme (1 saat)", category: "gezdirme", duration: 60, price: 450, description: "Mahallede tasmalı yürüyüş; dönüşte pati temizliği ve su." },
];

const weekdays = (open: string, close: string, extra?: Partial<WeekHours>, breakStart?: string, breakEnd?: string): WeekHours => {
  const day = { open, close, breakStart: breakStart ?? null, breakEnd: breakEnd ?? null };
  return { "1": day, "2": day, "3": day, "4": day, "5": day, "6": null, "0": null, ...extra };
};

type DemoClinic = {
  kind: BusinessKind;
  slug: string;
  name: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  status?: "pending" | "active";
  hours: WeekHours;
  slotMinutes?: number;
  boarding?: { cat: number; dog: number; catPrice?: number; dogPrice?: number; notes: string };
  /** Veterinerler; pet sitter için kendisi (randevu takvimi bu kayıt üzerinden işler). */
  vets: { name: string; title: string; bio?: string }[];
  services?: DemoService[];
  serviceNames?: string[];
  priceFactor?: number;
  admin: { email: string; name: string };
  staff?: { email: string; name: string };
};

const DEMO_CLINICS: DemoClinic[] = [
  {
    kind: "vet",
    slug: "moda-pati-veteriner",
    name: "Moda Pati Veteriner Kliniği",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Caferağa Mah. Demo Sok. No: 12, Kadıköy/İstanbul",
    phone: "+902160000001",
    email: "moda@pethotel.local",
    description:
      "Kedi ve köpekler için koruyucu hekimlik ve aşı takibi. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "19:00", { "6": { open: "10:00", close: "17:00", breakStart: null, breakEnd: null } }, "13:00", "14:00"),
    vets: [
      { name: "Elif Arslan", title: "Veteriner Hekim", bio: "Kedi hastalıkları ve koruyucu hekimlik." },
      { name: "Kerem Yıldız", title: "Uzm. Veteriner Hekim", bio: "İç hastalıkları ve ultrason." },
    ],
    admin: { email: "moda@pethotel.local", name: "Moda Pati Yönetici" },
    staff: { email: "resepsiyon@pethotel.local", name: "Moda Pati Resepsiyon" },
  },
  {
    kind: "vet",
    slug: "levent-dostlar-hayvan-hastanesi",
    name: "Levent Dostlar Hayvan Hastanesi",
    city: "İstanbul",
    district: "Beşiktaş",
    address: "Levent Mah. Demo Cad. No: 48, Beşiktaş/İstanbul",
    phone: "+902120000002",
    email: "levent@pethotel.local",
    description:
      "Haftanın her günü açık; cerrahi, görüntüleme ve laboratuvar hizmetleri. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: {
      "0": { open: "10:00", close: "20:00" },
      "1": { open: "08:00", close: "22:00" },
      "2": { open: "08:00", close: "22:00" },
      "3": { open: "08:00", close: "22:00" },
      "4": { open: "08:00", close: "22:00" },
      "5": { open: "08:00", close: "22:00" },
      "6": { open: "09:00", close: "21:00" },
    },
    slotMinutes: 15,
    vets: [
      { name: "Zeynep Aydın", title: "Doç. Dr. Veteriner Hekim", bio: "Cerrahi ve ortopedi." },
      { name: "Burak Demir", title: "Veteriner Hekim", bio: "Acil ve yoğun bakım." },
      { name: "Selin Koç", title: "Veteriner Hekim", bio: "Dermatoloji ve alerji." },
    ],
    priceFactor: 1.25,
    admin: { email: "levent@pethotel.local", name: "Levent Dostlar Yönetici" },
  },
  {
    kind: "vet",
    slug: "atasehir-mirmir-veteriner",
    name: "Ataşehir Mırmır Veteriner",
    city: "İstanbul",
    district: "Ataşehir",
    address: "Atatürk Mah. Demo Blv. No: 7, Ataşehir/İstanbul",
    phone: "+902160000003",
    email: "atasehir@pethotel.local",
    description: "Kedi dostu klinik: ayrı bekleme alanı ve sakin muayene odası. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("10:00", "20:00", { "6": { open: "10:00", close: "20:00" } }),
    slotMinutes: 30,
    vets: [{ name: "Emre Şahin", title: "Veteriner Hekim", bio: "Kedi davranışı ve beslenme." }],
    serviceNames: ["Genel muayene", "Karma aşı", "Kuduz aşısı", "İç ve dış parazit uygulaması", "Check-up ve kan tahlili", "Mikroçip uygulaması"],
    admin: { email: "atasehir@pethotel.local", name: "Ataşehir Mırmır Yönetici" },
  },
  {
    kind: "vet",
    slug: "cankaya-can-dost-veteriner",
    name: "Çankaya Can Dost Veteriner Kliniği",
    city: "Ankara",
    district: "Çankaya",
    address: "Kavaklıdere Mah. Demo Sok. No: 21, Çankaya/Ankara",
    phone: "+903120000004",
    email: "cankaya@pethotel.local",
    description: "Aile kliniği; aşı takvimi hatırlatma ve yaşlı hayvan bakımı. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "18:30", { "6": { open: "09:00", close: "14:00" } }, "12:30", "13:30"),
    vets: [
      { name: "Deniz Kaya", title: "Veteriner Hekim" },
      { name: "Ece Çelik", title: "Veteriner Hekim", bio: "Diş sağlığı." },
    ],
    priceFactor: 0.9,
    admin: { email: "cankaya@pethotel.local", name: "Can Dost Yönetici" },
  },
  {
    kind: "vet",
    slug: "karsiyaka-sahil-veteriner",
    name: "Karşıyaka Sahil Veteriner",
    city: "İzmir",
    district: "Karşıyaka",
    address: "Bostanlı Mah. Demo Sok. No: 3, Karşıyaka/İzmir",
    phone: "+902320000005",
    email: "karsiyaka@pethotel.local",
    description: "Pazartesi kapalı, hafta sonu açık. Tıraş ve bakım için ayrı salon. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: {
      "0": { open: "10:00", close: "18:00" },
      "1": null,
      "2": { open: "10:00", close: "19:00" },
      "3": { open: "10:00", close: "19:00" },
      "4": { open: "10:00", close: "19:00" },
      "5": { open: "10:00", close: "19:00" },
      "6": { open: "10:00", close: "19:00" },
    },
    vets: [{ name: "Mert Öztürk", title: "Veteriner Hekim" }],
    priceFactor: 0.95,
    admin: { email: "karsiyaka@pethotel.local", name: "Sahil Veteriner Yönetici" },
  },
  {
    kind: "vet",
    slug: "nilufer-patiler-veteriner",
    name: "Nilüfer Patiler Veteriner Polikliniği",
    city: "Bursa",
    district: "Nilüfer",
    address: "Görükle Mah. Demo Cad. No: 15, Nilüfer/Bursa",
    phone: "+902240000006",
    email: "nilufer@pethotel.local",
    description: "Aşı takibi, davranış danışmanlığı ve yavru bakımı. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:30", "18:30", { "6": { open: "09:30", close: "18:30" } }),
    vets: [
      { name: "Naz Erdem", title: "Veteriner Hekim" },
      { name: "Can Aksoy", title: "Veteriner Hekim", bio: "Davranış ve eğitim." },
    ],
    priceFactor: 0.85,
    admin: { email: "nilufer@pethotel.local", name: "Patiler Yönetici" },
  },
  {
    kind: "vet",
    slug: "bornova-minik-pati",
    name: "Bornova Minik Pati Kliniği",
    city: "İzmir",
    district: "Bornova",
    address: "Kazımdirik Mah. Demo Sok. No: 9, Bornova/İzmir",
    phone: "+902320000007",
    email: "bornova@pethotel.local",
    description: "Yeni başvuru örneği: platform yöneticisi onaylayana kadar sitede listelenmez.",
    status: "pending",
    hours: weekdays("09:00", "18:00"),
    vets: [{ name: "Ayla Tunç", title: "Veteriner Hekim" }],
    admin: { email: "bornova@pethotel.local", name: "Minik Pati Yönetici" },
  },
  // ---------- Pet oteller ----------
  {
    kind: "hotel",
    slug: "kadikoy-patili-pet-otel",
    name: "Kadıköy Patili Pet Otel",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Fenerbahçe Mah. Demo Sok. No: 5, Kadıköy/İstanbul",
    phone: "+902160000011",
    email: "otel@pethotel.local",
    description: "Kediler için sessiz odalar, köpekler için bahçeli bölüm. Günlük fotoğraflı bilgi. Bu bir demo oteldir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "19:00", { "6": { open: "10:00", close: "17:00" }, "0": { open: "10:00", close: "17:00" } }),
    boarding: {
      cat: 8,
      dog: 4,
      catPrice: 650,
      dogPrice: 950,
      notes: "Giriş 10:00–18:00, çıkış 12:00'ye kadar. Karma ve kuduz aşıları güncel olmalı. Kendi mamanızı getirebilirsiniz.",
    },
    vets: [],
    admin: { email: "otel@pethotel.local", name: "Patili Otel Yönetici" },
    staff: { email: "otel-resepsiyon@pethotel.local", name: "Patili Otel Resepsiyon" },
  },
  {
    kind: "hotel",
    slug: "sariyer-bahceli-pet-otel",
    name: "Sarıyer Bahçeli Pet Otel",
    city: "İstanbul",
    district: "Sarıyer",
    address: "Zekeriyaköy Mah. Demo Cad. No: 30, Sarıyer/İstanbul",
    phone: "+902120000012",
    email: "sariyer-otel@pethotel.local",
    description: "Geniş bahçe, köpekler için günde üç oyun saati ve kedi süitleri. Bu bir demo oteldir; bilgiler örnek amaçlıdır.",
    hours: weekdays("08:00", "20:00", { "6": { open: "09:00", close: "18:00" }, "0": { open: "09:00", close: "18:00" } }),
    boarding: {
      cat: 6,
      dog: 10,
      catPrice: 750,
      dogPrice: 1100,
      notes: "Bahçeli köpek odaları, kediler için ayrı ve sessiz bölüm. Girişte aşı karnesi kontrol edilir.",
    },
    vets: [],
    admin: { email: "sariyer-otel@pethotel.local", name: "Bahçeli Otel Yönetici" },
  },
  {
    kind: "hotel",
    slug: "cankaya-mirmir-kedi-oteli",
    name: "Çankaya Mırmır Kedi Oteli",
    city: "Ankara",
    district: "Çankaya",
    address: "Ayrancı Mah. Demo Sok. No: 14, Çankaya/Ankara",
    phone: "+903120000013",
    email: "ankara-otel@pethotel.local",
    description: "Yalnızca kedilere hizmet veren sakin otel; her misafire ayrı oda. Bu bir demo oteldir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "18:30", { "6": { open: "10:00", close: "16:00" } }),
    boarding: {
      cat: 12,
      dog: 0,
      catPrice: 550,
      notes: "Günde iki kez oyun ve fotoğraflı durum bildirimi. Giriş ve çıkış çalışma saatleri içinde yapılır.",
    },
    vets: [],
    admin: { email: "ankara-otel@pethotel.local", name: "Mırmır Otel Yönetici" },
  },
  {
    kind: "hotel",
    slug: "nilufer-patiler-kopek-oteli",
    name: "Nilüfer Patiler Köpek Oteli",
    city: "Bursa",
    district: "Nilüfer",
    address: "Görükle Mah. Demo Cad. No: 22, Nilüfer/Bursa",
    phone: "+902240000014",
    email: "bursa-otel@pethotel.local",
    description: "Köpek oteli ve eğitim desteği; geniş bahçe. Bu bir demo oteldir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:30", "18:30", { "6": { open: "09:30", close: "18:30" } }),
    boarding: {
      cat: 0,
      dog: 10,
      dogPrice: 700,
      notes: "Yalnızca köpek konaklaması. Günde üç yürüyüş, bahçede serbest oyun saatleri.",
    },
    vets: [],
    admin: { email: "bursa-otel@pethotel.local", name: "Patiler Otel Yönetici" },
  },
  // ---------- Pet sitterlar ----------
  {
    kind: "sitter",
    slug: "deniz-yalcin-pet-sitter",
    name: "Deniz Yalçın",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Kadıköy, Ataşehir ve Üsküdar",
    phone: "+905000000031",
    email: "sitter@pethotel.local",
    description:
      "6 yıldır kedi ve köpek bakıyorum. İlaç verebilirim, yaşlı ve özel bakım gerektiren dostlara alışkınım. Bu bir demo profildir; bilgiler örnek amaçlıdır.",
    hours: weekdays("08:00", "21:00", { "6": { open: "09:00", close: "20:00" }, "0": { open: "09:00", close: "20:00" } }),
    slotMinutes: 30,
    vets: [{ name: "Deniz Yalçın", title: "Pet sitter" }],
    services: SITTER_SERVICES,
    admin: { email: "sitter@pethotel.local", name: "Deniz Yalçın" },
  },
  {
    kind: "sitter",
    slug: "ece-bulut-pet-sitter",
    name: "Ece Bulut",
    city: "Ankara",
    district: "Çankaya",
    address: "Çankaya ve Yenimahalle",
    phone: "+905000000032",
    email: "ece-sitter@pethotel.local",
    description: "Veteriner teknikeri öğrencisiyim; kedi bakımı ve köpek gezdirme. Bu bir demo profildir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "20:00", { "6": { open: "10:00", close: "18:00" } }),
    slotMinutes: 30,
    vets: [{ name: "Ece Bulut", title: "Pet sitter" }],
    services: SITTER_SERVICES,
    priceFactor: 0.9,
    admin: { email: "ece-sitter@pethotel.local", name: "Ece Bulut" },
  },
  {
    kind: "sitter",
    slug: "mert-kaya-pet-sitter",
    name: "Mert Kaya",
    city: "İzmir",
    district: "Karşıyaka",
    address: "Karşıyaka, Bayraklı ve Bornova",
    phone: "+905000000033",
    email: "mert-sitter@pethotel.local",
    description: "Büyük ırk köpeklerle deneyimliyim; sabah ve akşam gezdirme. Bu bir demo profildir; bilgiler örnek amaçlıdır.",
    hours: weekdays("07:00", "22:00", { "6": { open: "08:00", close: "20:00" }, "0": { open: "08:00", close: "20:00" } }),
    slotMinutes: 30,
    vets: [{ name: "Mert Kaya", title: "Pet sitter" }],
    services: SITTER_SERVICES.filter((x) => x.category === "gezdirme" || x.duration === 45),
    admin: { email: "mert-sitter@pethotel.local", name: "Mert Kaya" },
  },
];

const roundPrice = (n: number) => Math.round(n / 50) * 50;

/** Kliniğin bugünden itibaren açık olan ilk `count` günü. */
function nextOpenDays(hours: WeekHours, from: string, count: number): string[] {
  const days: string[] = [];
  for (let i = 0; days.length < count && i < 14; i++) {
    const d = addDays(from, i);
    if (hours[String(weekdayOf(d)) as keyof WeekHours]) days.push(d);
  }
  return days;
}

/**
 * Demo klinikleri, hizmetleri, veterinerleri ve örnek kayıtları ekler.
 * Demo klinik hesapları yalnızca `loginPassword` verilirse (yerel veritabanı) bilinen şifreyle açılır.
 * Verilmezse (canlı veritabanı) rastgele, kimsenin bilmediği bir şifre atanır: demo klinikler sitede
 * görünür ama README'de yazan şifreyle panellerine girilemez.
 */
export async function insertDemoData(
  tx: Tx,
  options: { loginPassword?: string; kinds?: BusinessKind[] } = {},
): Promise<void> {
  const passwordHash = await hashPassword(options.loginPassword ?? randomBytes(24).toString("base64url"));
  const now = nowInIstanbul();

  for (const c of DEMO_CLINICS) {
    if (options.kinds && !options.kinds.includes(c.kind)) continue;
    const [clinic] = await tx
      .insert(clinics)
      .values({
        slug: c.slug,
        name: c.name,
        kind: c.kind,
        status: c.status ?? "active",
        isDemo: true,
        city: c.city,
        district: c.district,
        address: c.address,
        phone: c.phone,
        email: c.email,
        description: c.description,
        workingHours: c.hours,
        slotMinutes: c.slotMinutes ?? 15,
        boardingEnabled: Boolean(c.boarding),
        boardingCatCapacity: c.boarding?.cat ?? 0,
        boardingDogCapacity: c.boarding?.dog ?? 0,
        boardingCatPrice: c.boarding?.catPrice ?? null,
        boardingDogPrice: c.boarding?.dogPrice ?? null,
        boardingNotes: c.boarding?.notes ?? null,
        approvedAt: c.status === "pending" ? null : new Date(),
      })
      .returning();

    const factor = c.priceFactor ?? 1;
    const base = c.kind === "hotel" ? [] : (c.services ?? BASE_SERVICES);
    const chosen = c.serviceNames ? base.filter((s) => c.serviceNames!.includes(s.name)) : base;
    const insertedServices = chosen.length === 0 ? [] : await tx
      .insert(services)
      .values(
        chosen.map((s, i) => ({
          clinicId: clinic.id,
          name: s.name,
          category: s.category,
          durationMinutes: s.duration,
          price: roundPrice(s.price * factor),
          description: s.description ?? null,
          sortOrder: i,
        })),
      )
      .returning();

    const insertedVets = c.vets.length === 0 ? [] : await tx
      .insert(vets)
      .values(c.vets.map((v, i) => ({ clinicId: clinic.id, name: v.name, title: v.title, bio: v.bio ?? null, sortOrder: i })))
      .returning();

    await tx.insert(users).values([
      { email: c.admin.email, passwordHash, name: c.admin.name, role: "clinic_admin" as const, clinicId: clinic.id },
      ...(c.staff
        ? [{ email: c.staff.email, passwordHash, name: c.staff.name, role: "clinic_staff" as const, clinicId: clinic.id }]
        : []),
    ]);

    // Örnek randevu, ziyaret ve konaklamalar (paneller boş görünmesin).
    if (c.slug === "deniz-yalcin-pet-sitter") {
      const svc = (cat: string) => insertedServices.find((s) => s.category === cat)!;
      const [day1, day2] = nextOpenDays(c.hours, now.date, 2);
      const sample = [
        { date: day1, time: "09:00", service: "ziyaret", pet: "Pamuk", species: "cat" as const, owner: "Ayşe Yılmaz", notes: "Moda, Bahariye Cad. Anahtar kapıcıda. Islak mama yarım kutu." },
        { date: day1, time: "18:30", service: "gezdirme", pet: "Karamel", species: "dog" as const, owner: "Mehmet Kara", notes: "Ataşehir. Tasma kapı arkasında, diğer köpeklere çekingen." },
        { date: day2, time: "10:00", service: "ziyaret", pet: "Zeytin", species: "cat" as const, owner: "Selin Ak", notes: "Üsküdar. Sabah ilacı mamaya karıştırılacak." },
      ];
      await tx.insert(appointments).values(
        sample.map((a, i) => {
          const s = svc(a.service);
          const start = timeToMinutes(a.time);
          return {
            code: ["Z-DEMO2A", "Z-DEMO3B", "Z-DEMO4C"][i],
            clinicId: clinic.id,
            serviceId: s.id,
            vetId: insertedVets[0].id,
            serviceName: s.name,
            vetName: insertedVets[0].name,
            price: s.price,
            date: a.date,
            startMinute: start,
            endMinute: start + s.durationMinutes,
            status: i === 2 ? ("pending" as const) : ("confirmed" as const),
            source: "online" as const,
            petName: a.pet,
            petSpecies: a.species,
            ownerName: a.owner,
            ownerPhone: `+9050000000${(i + 40).toString().slice(-2)}`,
            notes: a.notes,
            consentAt: new Date(),
          };
        }),
      );
    }

    if (c.slug === "moda-pati-veteriner") {
      const svc = (name: string) => insertedServices.find((s) => s.name === name)!;
      const [day1, day2] = nextOpenDays(c.hours, now.date, 2);
      const sample = [
        { date: day1, time: "10:00", service: "Karma aşı", vet: 0, pet: "Pamuk", species: "cat" as const, owner: "Ayşe Yılmaz" },
        { date: day1, time: "11:30", service: "Genel muayene", vet: 1, pet: "Karamel", species: "dog" as const, owner: "Mehmet Kara" },
        { date: day1, time: "15:00", service: "Check-up ve kan tahlili", vet: 0, pet: "Zeytin", species: "cat" as const, owner: "Selin Ak" },
        { date: day1, time: "16:30", service: "Tıraş ve bakım", vet: 1, pet: "Boncuk", species: "dog" as const, owner: "Oğuz Er" },
        { date: day2, time: "09:30", service: "Kuduz aşısı", vet: 1, pet: "Fıstık", species: "rabbit" as const, owner: "Derya Tan" },
        { date: day2, time: "14:15", service: "Ultrason", vet: 1, pet: "Duman", species: "cat" as const, owner: "Can Uslu" },
      ];
      const codes = ["R-DEMO2A", "R-DEMO3B", "R-DEMO4C", "R-DEMO5D", "R-DEMO6E", "R-DEMO7F"];
      await tx.insert(appointments).values(
        sample.map((a, i) => {
          const s = svc(a.service);
          const start = timeToMinutes(a.time);
          return {
            code: codes[i],
            clinicId: clinic.id,
            serviceId: s.id,
            vetId: insertedVets[a.vet].id,
            serviceName: s.name,
            vetName: insertedVets[a.vet].name,
            price: s.price,
            date: a.date,
            startMinute: start,
            endMinute: start + s.durationMinutes,
            status: "confirmed" as const,
            source: "online" as const,
            petName: a.pet,
            petSpecies: a.species,
            ownerName: a.owner,
            ownerPhone: `+9050000000${(i + 10).toString().slice(-2)}`,
            consentAt: new Date(),
          };
        }),
      );

    }

    if (c.slug === "kadikoy-patili-pet-otel") {
      const openDays = nextOpenDays(c.hours, addDays(now.date, 1), 6);
      const stay = (from: string, nights: number) => {
        let out = addDays(from, nights);
        for (let i = 0; i < 7 && !c.hours[String(weekdayOf(out)) as keyof WeekHours]; i++) out = addDays(out, 1);
        return { checkIn: from, checkOut: out, nights: Math.round((Date.parse(out) - Date.parse(from)) / 86_400_000) };
      };
      const lokum = stay(openDays[0], 3);
      const mirnav = stay(openDays[3], 5);
      const catPrice = c.boarding!.catPrice!;
      const dogPrice = c.boarding!.dogPrice!;
      await tx.insert(boardingReservations).values([
        {
          code: "K-DEMO2A",
          clinicId: clinic.id,
          species: "dog",
          checkIn: addDays(now.date, -2),
          checkOut: addDays(now.date, 3),
          nights: 5,
          nightlyPrice: dogPrice,
          totalPrice: dogPrice * 5,
          status: "checked_in",
          petName: "Tarçın",
          petBreed: "Golden Retriever",
          vaccinated: true,
          ownerName: "Burcu Demirtaş",
          ownerPhone: "+905000000021",
          notes: "Sabah ve akşam kendi maması, günde iki yürüyüş.",
          consentAt: new Date(),
        },
        {
          code: "K-DEMO3B",
          clinicId: clinic.id,
          species: "cat",
          ...mirnav,
          nightlyPrice: catPrice,
          totalPrice: catPrice * mirnav.nights,
          status: "pending",
          petName: "Mırnav",
          petBreed: "British Shorthair",
          vaccinated: true,
          ownerName: "Kaan Öz",
          ownerPhone: "+905000000022",
          notes: "Islak mama sever, tüy yumağı macunu çantada.",
          consentAt: new Date(),
        },
        {
          code: "K-DEMO4C",
          clinicId: clinic.id,
          species: "cat",
          ...lokum,
          nightlyPrice: catPrice,
          totalPrice: catPrice * lokum.nights,
          status: "confirmed",
          petName: "Lokum",
          vaccinated: true,
          ownerName: "Ece Bal",
          ownerPhone: "+905000000023",
          consentAt: new Date(),
        },
      ]);
    }
  }
}
