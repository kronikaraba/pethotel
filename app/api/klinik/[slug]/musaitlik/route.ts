// GET /api/klinik/:slug/musaitlik?hizmet=<id>&tarih=YYYY-MM-DD&veteriner=<id>&mod=klinik
// Seçilen gün için boş saatleri döndürür. Gün doluysa bir sonraki boş günü de önerir.
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { clinics } from "@/lib/db/schema";
import { findNextAvailableDate, getAvailableSlots, type BookingMode } from "@/lib/booking/appointments";
import { BookingError } from "@/lib/booking/errors";
import { getCurrentUser } from "@/lib/auth/dal";
import { isValidDateString } from "@/lib/time";

const query = z.object({
  hizmet: z.uuid(),
  tarih: z.string().refine(isValidDateString),
  veteriner: z.union([z.literal(""), z.uuid()]).optional(),
  mod: z.enum(["online", "klinik"]).optional(),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const { hizmet, tarih, veteriner, mod } = parsed.data;

  const db = await getDb();
  const [clinic] = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  let mode: BookingMode = "online";
  if (mod === "klinik") {
    // Klinik paneli kendi takvimini (henüz onaylanmamış olsa da) kural sınırı olmadan görebilir.
    const user = await getCurrentUser();
    if (!clinic || !user || user.clinicId !== clinic.id) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }
    mode = "clinic";
  } else if (!clinic || clinic.status !== "active") {
    return NextResponse.json({ error: "Klinik bulunamadı." }, { status: 404 });
  }

  try {
    const slots = await getAvailableSlots({ clinic, serviceId: hizmet, date: tarih, vetId: veteriner || null, mode });
    const nextAvailableDate =
      slots.length === 0
        ? await findNextAvailableDate({ clinic, serviceId: hizmet, after: tarih, vetId: veteriner || null, mode })
        : null;
    return NextResponse.json(
      { date: tarih, slots: slots.map((s) => ({ start: s.start, end: s.end, label: s.label, vetIds: s.vetIds })), nextAvailableDate },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("[müsaitlik]", error);
    return NextResponse.json({ error: "Boş saatler alınamadı." }, { status: 500 });
  }
}
