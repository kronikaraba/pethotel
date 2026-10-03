// GET /api/takvim/:code → .ics takvim dosyası (yalnızca bu cihazda görüntüleme izni olan rezervasyonlar)
import { NextResponse } from "next/server";
import { canViewBooking } from "@/lib/lookup";
import { findBookingByCode } from "@/lib/data/lookup";
import { normalizeBookingCode } from "@/lib/booking/codes";
import { formatPhone } from "@/lib/format";
import { minutesToTime, parseDate, addDays } from "@/lib/time";

// Türkiye 2016'dan beri yıl boyu UTC+3 kullanır.
const ISTANBUL_OFFSET_MINUTES = 180;

function utcStamp(date: string, minute: number): string {
  const d = parseDate(date);
  d.setUTCMinutes(minute - ISTANBUL_OFFSET_MINUTES);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const dateValue = (date: string) => date.replace(/-/g, "");

/** RFC 5545 metin kaçışları */
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeBookingCode((await ctx.params).code);
  if (!code || !(await canViewBooking(code))) {
    return NextResponse.json({ error: "Bu rezervasyona erişim iznin yok." }, { status: 403 });
  }
  const booking = await findBookingByCode(code);
  if (!booking) return NextResponse.json({ error: "Rezervasyon bulunamadı." }, { status: 404 });

  const { clinic } = booking;
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PetHotel//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT"];
  lines.push(`UID:${code}@pethotel`, `DTSTAMP:${now}`);

  if (booking.kind === "appointment") {
    const a = booking.record;
    lines.push(
      `DTSTART:${utcStamp(a.date, a.startMinute)}`,
      `DTEND:${utcStamp(a.date, a.endMinute)}`,
      `SUMMARY:${esc(`${a.petName}: ${a.serviceName} (${clinic.name})`)}`,
      `DESCRIPTION:${esc(
        `Randevu kodu: ${code}\nSaat: ${minutesToTime(a.startMinute)}–${minutesToTime(a.endMinute)}\nVeteriner: ${a.vetName ?? "-"}\nKlinik telefonu: ${formatPhone(clinic.phone)}`,
      )}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Veteriner randevusu",
      "TRIGGER:-PT2H",
      "END:VALARM",
    );
  } else {
    const r = booking.record;
    lines.push(
      `DTSTART;VALUE=DATE:${dateValue(r.checkIn)}`,
      `DTEND;VALUE=DATE:${dateValue(addDays(r.checkOut, 1))}`,
      `SUMMARY:${esc(`${r.petName}: pet otel (${clinic.name})`)}`,
      `DESCRIPTION:${esc(`Konaklama kodu: ${code}\nGiriş: ${r.checkIn}\nÇıkış: ${r.checkOut}\nKlinik telefonu: ${formatPhone(clinic.phone)}`)}`,
    );
  }
  lines.push(`LOCATION:${esc(clinic.address)}`, "END:VEVENT", "END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pethotel-${code}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
