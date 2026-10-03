// GET /api/klinik/:slug/konaklama?tur=cat|dog&giris=YYYY-MM-DD&cikis=YYYY-MM-DD
// Konaklama fiyatı ve seçilen tarihlerde boş yer olup olmadığı.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getActiveClinicBySlug } from "@/lib/data/public";
import { getBoardingQuote } from "@/lib/booking/boarding";
import { isValidDateString } from "@/lib/time";

const query = z.object({
  tur: z.enum(["cat", "dog"]),
  giris: z.string().refine(isValidDateString),
  cikis: z.string().refine(isValidDateString),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const parsed = query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });

  const clinic = await getActiveClinicBySlug(slug);
  if (!clinic || !clinic.boardingEnabled) {
    return NextResponse.json({ error: "Bu klinik konaklama kabul etmiyor." }, { status: 404 });
  }
  const quote = await getBoardingQuote({
    clinic,
    species: parsed.data.tur,
    checkIn: parsed.data.giris,
    checkOut: parsed.data.cikis,
  });
  // Doluluk ayrıntısı (gece başına sayılar) dışarıya verilmez; yalnızca uygunluk bilgisi.
  const body = quote.ok
    ? { ok: true, nights: quote.nights, nightlyPrice: quote.nightlyPrice, total: quote.total, available: quote.available }
    : { ok: false, message: quote.message };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
