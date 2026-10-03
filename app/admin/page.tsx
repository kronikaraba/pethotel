import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { requireSuperadmin } from "@/lib/auth/dal";
import { getDb } from "@/lib/db";
import { appointments, boardingReservations, clinics } from "@/lib/db/schema";
import { ACTIVE_APPOINTMENT_STATUSES, CLINIC_STATUS_LABELS, type ClinicStatus } from "@/lib/constants";
import { addDays, todayInIstanbul } from "@/lib/time";
import { formatPhone } from "@/lib/format";
import { ClinicStatusActions } from "@/components/admin/ClinicStatusActions";
import { DemoBadge } from "@/components/site/DemoBadge";

export const metadata = { title: "Klinikler" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS: { key: "" | ClinicStatus; label: string }[] = [
  { key: "", label: "Tümü" },
  { key: "pending", label: "Onay bekleyen" },
  { key: "active", label: "Yayında" },
  { key: "suspended", label: "Askıda" },
];

const STATUS_STYLE: Record<ClinicStatus, string> = {
  pending: "bg-lamp-soft text-[#6b4a00]",
  active: "bg-pine-soft text-pine-dark",
  suspended: "bg-coral-soft text-coral",
};

const dateFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", year: "numeric" });

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireSuperadmin();
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.durum)?.key ?? "") as "" | ClinicStatus;
  const db = await getDb();
  const today = todayInIstanbul();

  const [statusCounts, [weekAppointments], [pendingBoarding], rows] = await Promise.all([
    db.select({ status: clinics.status, n: count() }).from(clinics).groupBy(clinics.status),
    db
      .select({ n: count() })
      .from(appointments)
      .where(and(gte(appointments.date, today), lte(appointments.date, addDays(today, 6)), inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES))),
    db.select({ n: count() }).from(boardingReservations).where(eq(boardingReservations.status, "pending")),
    db
      .select({
        clinic: clinics,
        // Alt sorgularda dış tabloya açıkça "clinics"."id" diye başvurulur (tek tablolu sorguda Drizzle sütunu nitelemez).
        adminEmail: sql<string | null>`(select u.email from users u where u.clinic_id = "clinics"."id" and u.role = 'clinic_admin' order by u.created_at limit 1)`,
        upcoming: sql<number>`(select count(*)::int from appointments a where a.clinic_id = "clinics"."id" and a.date >= ${today} and a.status in ('pending', 'confirmed'))`,
      })
      .from(clinics)
      .where(tab ? eq(clinics.status, tab) : undefined)
      .orderBy(sql`case ${clinics.status} when 'pending' then 0 when 'active' then 1 else 2 end`, desc(clinics.createdAt)),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((r) => [r.status, r.n])) as Partial<Record<ClinicStatus, number>>;
  const stats = [
    { label: "Yayındaki klinik", value: byStatus.active ?? 0 },
    { label: "Onay bekleyen başvuru", value: byStatus.pending ?? 0, warn: (byStatus.pending ?? 0) > 0 },
    { label: "7 günlük aktif randevu", value: weekAppointments.n },
    { label: "Bekleyen konaklama talebi", value: pendingBoarding.n },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold sm:text-4xl">Klinikler</h1>
      <p className="mt-1.5 text-stone">Başvuruları onayla, klinikleri yayından kaldır ya da yeniden yayına al.</p>

      <dl className="mt-8 grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-surface md:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`border-line p-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "border-t md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
            <dt className="text-sm text-stone">{s.label}</dt>
            <dd className={`font-display mt-1 text-4xl font-bold tabular ${s.warn ? "text-[#a86b00]" : ""}`}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Duruma göre filtrele" className="mt-10 mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key || "all"}
            href={t.key ? `/admin?durum=${t.key}` : "/admin"}
            aria-current={tab === t.key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${
              tab === t.key ? "bg-ink text-white" : "border border-line-strong bg-surface hover:border-pine"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line-strong bg-surface px-6 py-8 text-stone">Bu filtrede klinik yok.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
          {rows.map(({ clinic: c, adminEmail, upcoming }) => (
            <li key={c.id} className="grid grid-cols-1 gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[c.status]}`}>{CLINIC_STATUS_LABELS[c.status]}</span>
                  {c.isDemo && <DemoBadge />}
                  {c.status === "active" && (
                    <Link href={`/klinik/${c.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-pine hover:underline">
                      Sayfası
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-stone">
                  {c.district}, {c.city}. {formatPhone(c.phone)}
                  {adminEmail ? `. Yönetici: ${adminEmail}` : ""}
                </p>
                <p className="mt-0.5 text-sm text-stone">
                  Başvuru {dateFmt.format(c.createdAt)}
                  {c.approvedAt ? `, onay ${dateFmt.format(c.approvedAt)}` : ""}. Yaklaşan randevu: {upcoming}
                </p>
              </div>
              <ClinicStatusActions id={c.id} status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
