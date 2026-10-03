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
import type { ServiceCategory } from "../constants";
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

const weekdays = (open: string, close: string, extra?: Partial<WeekHours>, breakStart?: string, breakEnd?: string): WeekHours => {
  const day = { open, close, breakStart: breakStart ?? null, breakEnd: breakEnd ?? null };
  return { "1": day, "2": day, "3": day, "4": day, "5": day, "6": null, "0": null, ...extra };
};

type DemoClinic = {
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
  vets: { name: string; title: string; bio?: string }[];
  serviceNames?: string[];
  priceFactor?: number;
  admin: { email: string; name: string };
  staff?: { email: string; name: string };
};

const DEMO_CLINICS: DemoClinic[] = [
  {
    slug: "moda-pati-veteriner",
    name: "Moda Pati Veteriner Kliniği",
    city: "İstanbul",
    district: "Kadıköy",
    address: "Caferağa Mah. Demo Sok. No: 12, Kadıköy/İstanbul",
    phone: "+902160000001",
    email: "moda@pethotel.local",
    description:
      "Kedi ve köpekler için koruyucu hekimlik, aşı takibi ve kısa süreli konaklama. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "19:00", { "6": { open: "10:00", close: "17:00", breakStart: null, breakEnd: null } }, "13:00", "14:00"),
    boarding: {
      cat: 8,
      dog: 4,
      catPrice: 650,
      dogPrice: 950,
      notes: "Giriş 10:00–18:00, çıkış 12:00'ye kadar. Karma ve kuduz aşıları güncel olmalı. Kendi mamanızı getirebilirsiniz.",
    },
    vets: [
      { name: "Elif Arslan", title: "Veteriner Hekim", bio: "Kedi hastalıkları ve koruyucu hekimlik." },
      { name: "Kerem Yıldız", title: "Uzm. Veteriner Hekim", bio: "İç hastalıkları ve ultrason." },
    ],
    admin: { email: "moda@pethotel.local", name: "Moda Pati Yönetici" },
    staff: { email: "resepsiyon@pethotel.local", name: "Moda Pati Resepsiyon" },
  },
  {
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
    boarding: {
      cat: 6,
      dog: 6,
      catPrice: 750,
      dogPrice: 1100,
      notes: "Bahçeli köpek odaları, kediler için ayrı ve sessiz bölüm. Giriş öncesi kısa sağlık kontrolü yapılır.",
    },
    vets: [
      { name: "Zeynep Aydın", title: "Doç. Dr. Veteriner Hekim", bio: "Cerrahi ve ortopedi." },
      { name: "Burak Demir", title: "Veteriner Hekim", bio: "Acil ve yoğun bakım." },
      { name: "Selin Koç", title: "Veteriner Hekim", bio: "Dermatoloji ve alerji." },
    ],
    priceFactor: 1.25,
    admin: { email: "levent@pethotel.local", name: "Levent Dostlar Yönetici" },
  },
  {
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
    slug: "cankaya-can-dost-veteriner",
    name: "Çankaya Can Dost Veteriner Kliniği",
    city: "Ankara",
    district: "Çankaya",
    address: "Kavaklıdere Mah. Demo Sok. No: 21, Çankaya/Ankara",
    phone: "+903120000004",
    email: "cankaya@pethotel.local",
    description: "Aile kliniği; aşı takvimi hatırlatma ve yaşlı hayvan bakımı. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:00", "18:30", { "6": { open: "09:00", close: "14:00" } }, "12:30", "13:30"),
    boarding: {
      cat: 5,
      dog: 3,
      catPrice: 550,
      dogPrice: 800,
      notes: "Günde iki kez oyun ve fotoğraflı durum bildirimi. Giriş ve çıkış mesai saatleri içinde yapılır.",
    },
    vets: [
      { name: "Deniz Kaya", title: "Veteriner Hekim" },
      { name: "Ece Çelik", title: "Veteriner Hekim", bio: "Diş sağlığı." },
    ],
    priceFactor: 0.9,
    admin: { email: "cankaya@pethotel.local", name: "Can Dost Yönetici" },
  },
  {
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
    slug: "nilufer-patiler-veteriner",
    name: "Nilüfer Patiler Veteriner Polikliniği",
    city: "Bursa",
    district: "Nilüfer",
    address: "Görükle Mah. Demo Cad. No: 15, Nilüfer/Bursa",
    phone: "+902240000006",
    email: "nilufer@pethotel.local",
    description: "Köpek oteli ve eğitim desteği; geniş bahçe. Bu bir demo kliniktir; bilgiler örnek amaçlıdır.",
    hours: weekdays("09:30", "18:30", { "6": { open: "09:30", close: "18:30" } }),
    boarding: {
      cat: 0,
      dog: 10,
      dogPrice: 700,
      notes: "Yalnızca köpek konaklaması. Günde üç yürüyüş, bahçede serbest oyun saatleri.",
    },
    vets: [
      { name: "Naz Erdem", title: "Veteriner Hekim" },
      { name: "Can Aksoy", title: "Veteriner Hekim", bio: "Davranış ve eğitim." },
    ],
    priceFactor: 0.85,
    admin: { email: "nilufer@pethotel.local", name: "Patiler Yönetici" },
  },
  {
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
export async function insertDemoData(tx: Tx, options: { loginPassword?: string } = {}): Promise<void> {
  const passwordHash = await hashPassword(options.loginPassword ?? randomBytes(24).toString("base64url"));
  const now = nowInIstanbul();

  for (const [index, c] of DEMO_CLINICS.entries()) {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        slug: c.slug,
        name: c.name,
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
    const chosen = c.serviceNames
      ? BASE_SERVICES.filter((s) => c.serviceNames!.includes(s.name))
      : BASE_SERVICES;
    const insertedServices = await tx
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

    const insertedVets = await tx
      .insert(vets)
      .values(c.vets.map((v, i) => ({ clinicId: clinic.id, name: v.name, title: v.title, bio: v.bio ?? null, sortOrder: i })))
      .returning();

    await tx.insert(users).values([
      { email: c.admin.email, passwordHash, name: c.admin.name, role: "clinic_admin" as const, clinicId: clinic.id },
      ...(c.staff
        ? [{ email: c.staff.email, passwordHash, name: c.staff.name, role: "clinic_staff" as const, clinicId: clinic.id }]
        : []),
    ]);

    // İlk demo kliniğe örnek randevu ve konaklamalar ekle (panel boş görünmesin).
    if (index === 0) {
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
