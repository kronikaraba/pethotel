"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Cat, Dog, Loader2, Moon } from "lucide-react";
import type { BoardingSpecies } from "@/lib/constants";
import type { WeekHours } from "@/lib/db/schema";
import { isOpenOn } from "@/lib/booking/availability";
import { requestBoardingAction } from "@/lib/actions/booking";
import { addDays, diffDays, formatDateMedium } from "@/lib/time";
import { formatPrice } from "@/lib/format";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";

type SpeciesOption = { value: BoardingSpecies; price: number | null };
type Quote =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; nights: number; nightlyPrice: number | null; total: number | null; available: boolean }
  | { state: "problem"; message: string };

const emptyForm = {
  petName: "",
  petBreed: "",
  petAge: "",
  vaccinated: false,
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  notes: "",
  consent: false,
  website: "",
};

export function BoardingForm({
  clinicSlug,
  species,
  today,
  notes,
  workingHours,
  closedDates,
}: {
  clinicSlug: string;
  species: SpeciesOption[];
  today: string;
  notes: string | null;
  workingHours: WeekHours;
  closedDates: string[];
}) {
  const router = useRouter();
  // Varsayılan: yarından sonraki ilk açık gün giriş, 3 gece sonrasındaki ilk açık gün çıkış.
  const openFrom = (from: string) => {
    for (let i = 0; i < 21; i++) {
      const d = addDays(from, i);
      if (isOpenOn(workingHours, d, closedDates)) return d;
    }
    return from;
  };
  const [kind, setKind] = useState<BoardingSpecies>(species[0].value);
  const [checkIn, setCheckIn] = useState(() => openFrom(addDays(today, 1)));
  const [checkOut, setCheckOut] = useState(() => openFrom(addDays(openFrom(addDays(today, 1)), 3)));
  const [quote, setQuote] = useState<Quote>({ state: "idle" });
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [errorRound, setErrorRound] = useState(0);
  useFocusFirstError(errorRound);

  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setQuote({ state: "loading" });
      const params = new URLSearchParams({ tur: kind, giris: checkIn, cikis: checkOut });
      fetch(`/api/klinik/${clinicSlug}/konaklama?${params}`, { signal: controller.signal, cache: "no-store" })
        .then((r) => r.json())
        .then((body) => {
          if (body.ok) setQuote({ state: "ok", nights: body.nights, nightlyPrice: body.nightlyPrice, total: body.total, available: body.available });
          else setQuote({ state: "problem", message: body.message ?? body.error ?? "Tarihler kontrol edilemedi." });
        })
        .catch((err: unknown) => {
          if ((err as Error).name !== "AbortError") setQuote({ state: "problem", message: "Uygunluk kontrol edilemedi. Tekrar dene." });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clinicSlug, kind, checkIn, checkOut]);

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function onCheckIn(value: string) {
    setCheckIn(value);
    if (value && checkOut && diffDays(value, checkOut) < 1) setCheckOut(addDays(value, 1));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const res = await requestBoardingAction({
        clinicSlug,
        species: kind,
        checkIn,
        checkOut,
        petName: form.petName,
        petBreed: form.petBreed,
        petAge: form.petAge,
        vaccinated: form.vaccinated as true,
        ownerName: form.ownerName,
        ownerPhone: form.ownerPhone,
        ownerEmail: form.ownerEmail,
        notes: form.notes,
        consent: form.consent as true,
        website: form.website,
      });
      if (res.ok) {
        router.push(`/rezervasyonum/${res.data.code}?yeni=1`);
        return;
      }
      setFormError(res.error);
      setErrors(res.fieldErrors ?? {});
      setErrorRound((n) => n + 1);
    });
  }

  const blocked = quote.state === "problem" || (quote.state === "ok" && !quote.available);

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      <div className="night relative min-w-0 space-y-8 rounded-panel bg-night p-5 text-night-ink sm:p-8">
        <fieldset>
          <legend className="font-display text-xl font-semibold">Kim konaklayacak?</legend>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {species.map((s) => {
              const Icon = s.value === "cat" ? Cat : Dog;
              const selected = kind === s.value;
              return (
                <label
                  key={s.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-card border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lamp ${
                    selected ? "border-lamp bg-night-2" : "border-night-3 hover:border-night-muted"
                  }`}
                >
                  <input type="radio" name="species" value={s.value} checked={selected} onChange={() => setKind(s.value)} className="sr-only" />
                  <Icon className={`h-6 w-6 ${selected ? "text-lamp" : "text-night-muted"}`} aria-hidden />
                  <span className="mt-1 text-lg font-semibold">{s.value === "cat" ? "Kedi" : "Köpek"}</span>
                  <span className="text-sm text-night-muted">{s.price !== null ? `${formatPrice(s.price)} / gece` : "Fiyat klinikte"}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display text-xl font-semibold">Tarihler</legend>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="checkIn" label="Giriş" error={errors.checkIn}>
              <input
                {...fieldAria("checkIn", errors.checkIn)}
                type="date"
                className="input"
                value={checkIn}
                min={today}
                max={addDays(today, 180)}
                onChange={(e) => onCheckIn(e.target.value)}
                required
              />
            </Field>
            <Field id="checkOut" label="Çıkış" error={errors.checkOut}>
              <input
                {...fieldAria("checkOut", errors.checkOut)}
                type="date"
                className="input"
                value={checkOut}
                min={checkIn ? addDays(checkIn, 1) : today}
                max={addDays(today, 210)}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="mt-4 min-h-12" aria-live="polite">
            {quote.state === "loading" && (
              <p className="flex items-center gap-2 text-night-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Uygunluk kontrol ediliyor…
              </p>
            )}
            {quote.state === "problem" && <p className="rounded-control bg-coral/15 px-4 py-3 font-medium text-[#ffb4a8]">{quote.message}</p>}
            {quote.state === "ok" &&
              (quote.available ? (
                <p className="rounded-control bg-lamp/10 px-4 py-3 font-medium text-lamp">
                  Bu tarihlerde yer var: {quote.nights} gece, {formatDateMedium(checkIn)} giriş.
                </p>
              ) : (
                <p className="rounded-control bg-coral/15 px-4 py-3 font-medium text-[#ffb4a8]">
                  Bu tarihlerde boş yer kalmadı. Farklı tarihler dene.
                </p>
              ))}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display text-xl font-semibold">Misafirimiz</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="petName" label="Adı" error={errors.petName}>
              <input {...fieldAria("petName", errors.petName)} className="input" value={form.petName} onChange={(e) => update("petName", e.target.value)} maxLength={40} />
            </Field>
            <Field id="petBreed" label="Cinsi" optional error={errors.petBreed}>
              <input {...fieldAria("petBreed", errors.petBreed)} className="input" value={form.petBreed} onChange={(e) => update("petBreed", e.target.value)} maxLength={60} />
            </Field>
            <Field id="petAge" label="Yaşı" optional error={errors.petAge}>
              <input {...fieldAria("petAge", errors.petAge)} className="input" value={form.petAge} onChange={(e) => update("petAge", e.target.value)} maxLength={30} />
            </Field>
          </div>
          <Field id="notes" label="Beslenme, ilaç ve alışkanlıklar" optional error={errors.notes}>
            <textarea
              {...fieldAria("notes", errors.notes)}
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Örn. Günde iki öğün kuru mama, sabah ilacı var, diğer kedilerle oynamayı sever."
              maxLength={800}
            />
          </Field>
          <div>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.vaccinated}
                onChange={(e) => update("vaccinated", e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-lamp)]"
              />
              <span>Karma ve kuduz aşıları güncel; giriş günü aşı karnesini getireceğim.</span>
            </label>
            {errors.vaccinated && (
              <p className="mt-1.5 text-sm font-medium text-[#ffb4a8]" role="alert">
                {errors.vaccinated}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-display text-xl font-semibold">Sen</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="ownerName" label="Ad soyad" error={errors.ownerName}>
              <input {...fieldAria("ownerName", errors.ownerName)} className="input" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} autoComplete="name" maxLength={80} />
            </Field>
            <Field id="ownerPhone" label="Cep telefonu" error={errors.ownerPhone}>
              <input
                {...fieldAria("ownerPhone", errors.ownerPhone)}
                className="input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
                value={form.ownerPhone}
                onChange={(e) => update("ownerPhone", e.target.value)}
                maxLength={20}
              />
            </Field>
            <Field id="ownerEmail" label="E-posta" optional error={errors.ownerEmail} className="sm:col-span-2">
              <input {...fieldAria("ownerEmail", errors.ownerEmail)} className="input" type="email" autoComplete="email" value={form.ownerEmail} onChange={(e) => update("ownerEmail", e.target.value)} maxLength={120} />
            </Field>
          </div>
        </fieldset>

        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="website">Web sitesi</label>
          <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => update("consent", e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-lamp)]"
            />
            <span>
              Kişisel verilerimin konaklama talebi için kliniğe iletilmesine ilişkin{" "}
              <Link href="/kvkk" target="_blank" className="font-semibold text-lamp underline underline-offset-2">
                aydınlatma metnini
              </Link>{" "}
              okudum.
            </span>
          </label>
          {errors.consent && (
            <p className="mt-1.5 text-sm font-medium text-[#ffb4a8]" role="alert">
              {errors.consent}
            </p>
          )}
        </div>
      </div>

      <aside>
        <div className="space-y-5 rounded-panel border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Moon className="h-5 w-5 text-night" aria-hidden />
            Konaklama özeti
          </h2>
          <dl className="space-y-3 text-[0.95rem]">
            <div className="flex justify-between gap-4">
              <dt className="text-stone">Giriş</dt>
              <dd className="text-right font-medium">{checkIn ? formatDateMedium(checkIn) : "-"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone">Çıkış</dt>
              <dd className="text-right font-medium">{checkOut ? formatDateMedium(checkOut) : "-"}</dd>
            </div>
            {quote.state === "ok" && quote.nightlyPrice !== null && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone">
                  {quote.nights} gece × {formatPrice(quote.nightlyPrice)}
                </dt>
                <dd className="font-medium tabular">{formatPrice(quote.total)}</dd>
              </div>
            )}
          </dl>
          {quote.state === "ok" && quote.total !== null && (
            <div className="border-t border-line pt-4">
              <p className="text-sm text-stone">Tahmini toplam</p>
              <p className="font-display text-3xl font-bold tabular">{formatPrice(quote.total)}</p>
              <p className="mt-1 text-sm text-stone">Ödeme klinikte yapılır. Ek hizmetler ücrete eklenebilir.</p>
            </div>
          )}
          <FormError message={formError ?? undefined} />
          <button
            type="submit"
            disabled={pending || blocked || quote.state === "loading"}
            className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-night px-6 text-base font-semibold text-lamp hover:bg-night-2 disabled:opacity-55"
          >
            {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            {pending ? "Talep gönderiliyor" : "Konaklama talebi gönder"}
          </button>
          <p className="text-sm text-stone">Talebin kliniğe iletilir; klinik onayladığında rezervasyonun kesinleşir.</p>
          {notes && <p className="border-t border-line pt-4 text-sm text-stone">{notes}</p>}
        </div>
      </aside>
    </form>
  );
}
