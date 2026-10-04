"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bird, Cat, Check, Dog, Loader2, Rabbit, Sparkles } from "lucide-react";
import type { WeekHours } from "@/lib/db/schema";
import { PET_SPECIES, PET_SPECIES_LABELS, SERVICE_CATEGORY_LABELS, type PetSpecies, type ServiceCategory } from "@/lib/constants";
import { isOpenOn } from "@/lib/booking/availability";
import { addDays, formatDateMedium, minutesToTime, relativeDayLabel, timeToMinutes } from "@/lib/time";
import { durationLabel, formatPrice } from "@/lib/format";
import { bookAppointmentAction } from "@/lib/actions/booking";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { DateStrip, type DayOption } from "./DateStrip";
import { TimeGrid, type SlotDTO } from "./TimeGrid";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";

export type WizardService = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number | null;
  description: string | null;
};
export type WizardVet = { id: string; name: string; title: string };
export type WizardClinic = {
  slug: string;
  name: string;
  district: string;
  city: string;
  workingHours: WeekHours;
  closedDates: string[];
  maxDaysAhead: number;
  autoConfirm: boolean;
  /** Pet sitter randevusunda veteriner seçimi yoktur; ziyaret adresi notlara yazılır. */
  isSitter?: boolean;
};

type Step = 1 | 2 | 3;

type SlotsResult = { key: string; slots: SlotDTO[]; nextAvailableDate: string | null; error?: string };

type SlotsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; slots: SlotDTO[]; nextAvailableDate: string | null }
  | { status: "error"; message: string };

const SPECIES_ICON: Record<PetSpecies, typeof Cat> = { cat: Cat, dog: Dog, bird: Bird, rabbit: Rabbit, other: Sparkles };

const emptyForm = {
  petName: "",
  petSpecies: "" as PetSpecies | "",
  petBreed: "",
  petAge: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  notes: "",
  consent: false,
  website: "",
};

export function AppointmentWizard({
  clinic,
  services,
  vets,
  today,
  initial,
}: {
  clinic: WizardClinic;
  services: WizardService[];
  vets: WizardVet[];
  today: string;
  initial: { serviceId?: string; date?: string; time?: string; vetId?: string };
}) {
  const router = useRouter();
  const days: DayOption[] = useMemo(
    () =>
      Array.from({ length: clinic.maxDaysAhead + 1 }, (_, i) => {
        const date = addDays(today, i);
        return { date, open: isOpenOn(clinic.workingHours, date, clinic.closedDates) };
      }),
    [clinic, today],
  );
  const firstOpenDay = days.find((d) => d.open)?.date ?? today;

  const [step, setStep] = useState<Step>(initial.serviceId ? 2 : 1);
  const [serviceId, setServiceId] = useState<string | null>(initial.serviceId ?? null);
  const [vetId, setVetId] = useState<string>(initial.vetId ?? "");
  const [date, setDate] = useState<string>(initial.date ?? firstOpenDay);
  const [rawTime, setTime] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [errorRound, setErrorRound] = useState(0);
  useFocusFirstError(errorRound);

  // URL'den gelen saat ve "ilk boş güne atla" davranışı yalnızca bir kez uygulanır.
  const pendingInitialTime = useRef<string | null>(initial.time ?? null);
  const autoJumpAllowed = useRef<boolean>(!initial.date);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  // Tek kişilik takvimde (pet sitter ya da tek hekimli klinik) "fark etmez" yerine kişinin adı gösterilir.
  const vet = vets.find((v) => v.id === vetId) ?? (vets.length === 1 ? vets[0] : null);

  // Boş saatleri getir. Sonuç, isteğin anahtarıyla saklanır; anahtar değişince "yükleniyor" kendiliğinden görünür.
  const requestKey = serviceId && step >= 2 ? `${serviceId}|${vetId}|${date}|${reloadKey}` : null;
  const [result, setResult] = useState<SlotsResult | null>(null);
  const slots: SlotsState = !requestKey
    ? { status: "idle" }
    : !result || result.key !== requestKey
      ? { status: "loading" }
      : result.error !== undefined
        ? { status: "error", message: result.error }
        : { status: "ready", slots: result.slots, nextAvailableDate: result.nextAvailableDate };
  const slotList = slots.status === "ready" ? slots.slots : [];
  // Seçili saat güncel listede yoksa (ör. gün ya da veteriner değişti) seçim yok sayılır.
  const time = rawTime && (slots.status !== "ready" || slotList.some((s) => s.label === rawTime)) ? rawTime : null;

  useEffect(() => {
    if (!requestKey || !serviceId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ hizmet: serviceId, tarih: date });
    if (vetId) params.set("veteriner", vetId);
    fetch(`/api/klinik/${clinic.slug}/musaitlik?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Boş saatler alınamadı.");
        return body as { slots: SlotDTO[]; nextAvailableDate: string | null };
      })
      .then((body) => {
        if (body.slots.length === 0 && body.nextAvailableDate && autoJumpAllowed.current) {
          autoJumpAllowed.current = false;
          setNotice(`${relativeDayLabel(date, today)} için boş saat kalmadı. İlk boş gün gösteriliyor.`);
          setDate(body.nextAvailableDate);
          return;
        }
        autoJumpAllowed.current = false;
        setResult({ key: requestKey, slots: body.slots, nextAvailableDate: body.nextAvailableDate });
        const wanted = pendingInitialTime.current;
        if (wanted) {
          pendingInitialTime.current = null;
          if (body.slots.some((s) => s.label === wanted)) {
            setTime(wanted);
            setStep(3);
          } else {
            setNotice(`${wanted} artık dolu. Lütfen başka bir saat seç.`);
          }
        }
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setResult({ key: requestKey, slots: [], nextAvailableDate: null, error: (err as Error).message });
      });
    return () => controller.abort();
  }, [clinic.slug, requestKey, serviceId, vetId, date, today]);

  useEffect(() => {
    const target = step === 2 ? step2Ref.current : step === 3 ? step3Ref.current : null;
    if (target && window.matchMedia("(max-width: 1023px)").matches) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  function chooseService(id: string) {
    setServiceId(id);
    setTime(null);
    setStep(2);
  }

  function chooseDate(d: string) {
    setNotice(null);
    setDate(d);
    setTime(null);
  }

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !time) return;
    setFormError(null);
    startTransition(async () => {
      const res = await bookAppointmentAction({
        clinicSlug: clinic.slug,
        serviceId: service.id,
        vetId,
        date,
        time,
        petName: form.petName,
        petSpecies: form.petSpecies as PetSpecies,
        petBreed: form.petBreed,
        petAge: form.petAge,
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
      if (res.code === "SLOT_TAKEN" || res.fieldErrors?.time || res.fieldErrors?.date) {
        setTime(null);
        setStep(2);
        setReloadKey((k) => k + 1);
      }
    });
  }


  const endLabel = service && time ? minutesToTime(timeToMinutes(time) + service.durationMinutes) : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div className="min-w-0 space-y-4">
        {/* 1. Hizmet */}
        <StepCard
          n={1}
          title="Hizmet"
          active={step === 1}
          done={!!service}
          summary={service ? `${service.name}, ${durationLabel(service.durationMinutes)}` : undefined}
          onEdit={() => setStep(1)}
        >
          <fieldset>
            <legend className="sr-only">Hizmet seç</legend>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {services.map((s) => {
                const selected = s.id === serviceId;
                return (
                  <li key={s.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors ${
                        selected ? "bg-pine-soft" : "bg-surface hover:bg-paper"
                      }`}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={s.id}
                        checked={selected}
                        onChange={() => chooseService(s.id)}
                        className="h-5 w-5 shrink-0 accent-[var(--color-pine)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.name}</span>
                        <span className="block text-sm text-stone">
                          {SERVICE_CATEGORY_LABELS[s.category]}, {durationLabel(s.durationMinutes)}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular">{s.price !== null ? formatPrice(s.price) : ""}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </StepCard>

        {/* 2. Tarih ve saat */}
        <div ref={step2Ref} className="scroll-mt-24">
          <StepCard
            n={2}
            title="Tarih ve saat"
            active={step === 2}
            done={!!time && step > 2}
            summary={time ? `${formatDateMedium(date)}, ${time}${vet ? `, ${vet.name}` : ""}` : undefined}
            onEdit={service ? () => setStep(2) : undefined}
          >
            {vets.length > 1 && (
              <fieldset className="mb-6">
                <legend className="label">Veteriner</legend>
                <div className="flex flex-wrap gap-2">
                  {[{ id: "", name: "Fark etmez", title: "İlk boş hekim" }, ...vets].map((v) => (
                    <button
                      key={v.id || "any"}
                      type="button"
                      aria-pressed={vetId === v.id}
                      onClick={() => {
                        setVetId(v.id);
                        setNotice(null);
                      }}
                      className={`rounded-control border px-4 py-2 text-left transition-colors ${
                        vetId === v.id ? "border-pine bg-pine text-white" : "border-line-strong bg-surface hover:border-pine"
                      }`}
                    >
                      <span className="block text-[0.95rem] font-semibold">{v.name}</span>
                      <span className={`block text-xs ${vetId === v.id ? "text-white/80" : "text-stone"}`}>{v.title}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <p className="label">Gün</p>
            <DateStrip days={days} value={date} today={today} onChange={chooseDate} />

            <div className="mt-4" aria-live="polite">
              {notice && <p className="mb-4 rounded-control bg-lamp-soft px-4 py-3 text-sm font-medium text-[#6b4a00]">{notice}</p>}
              <p className="label">{formatDateMedium(date)} için boş saatler</p>
              {slots.status === "loading" || slots.status === "idle" ? (
                <p className="flex items-center gap-2 py-6 text-stone">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Boş saatler yükleniyor…
                </p>
              ) : slots.status === "error" ? (
                <div className="py-4">
                  <p className="text-coral">{slots.message}</p>
                  <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 font-semibold text-pine underline">
                    Tekrar dene
                  </button>
                </div>
              ) : slotList.length === 0 ? (
                <div className="rounded-card border border-dashed border-line-strong px-4 py-5">
                  <p className="font-medium">Bu gün için boş saat yok.</p>
                  {slots.nextAvailableDate ? (
                    <button
                      type="button"
                      onClick={() => chooseDate(slots.nextAvailableDate!)}
                      className="mt-3 inline-flex min-h-11 items-center rounded-control bg-pine px-4 font-semibold text-white hover:bg-pine-dark"
                    >
                      İlk boş gün: {relativeDayLabel(slots.nextAvailableDate, today)}
                    </button>
                  ) : (
                    <p className="mt-1 text-sm text-stone">Önümüzdeki günlerde de boş saat görünmüyor. Kliniği arayabilirsin.</p>
                  )}
                </div>
              ) : (
                <TimeGrid slots={slotList} value={time} onChange={setTime} />
              )}
            </div>

            {time && (
              <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex items-center justify-between gap-4 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
                <p className="text-sm">
                  <span className="block font-semibold">
                    {relativeDayLabel(date, today)}, {time}–{endLabel}
                  </span>
                  <span className="text-stone">{vet ? vet.name : "İlk boş hekim"}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex min-h-12 shrink-0 items-center rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark"
                >
                  Devam et
                </button>
              </div>
            )}
          </StepCard>
        </div>

        {/* 3. Bilgiler */}
        <div ref={step3Ref} className="scroll-mt-24">
          <StepCard n={3} title="Bilgilerin" active={step === 3} done={false}>
            <form onSubmit={submit} noValidate className="space-y-8">
              <fieldset className="space-y-4">
                <legend className="font-display text-lg font-semibold">Evcil hayvanın</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="petName" label="Adı" error={errors.petName}>
                    <input
                      {...fieldAria("petName", errors.petName)}
                      className="input"
                      value={form.petName}
                      onChange={(e) => update("petName", e.target.value)}
                      maxLength={40}
                      autoComplete="off"
                    />
                  </Field>
                  <div>
                    <p className="label" id="species-label">
                      Türü
                    </p>
                    <div role="radiogroup" aria-labelledby="species-label" className="flex flex-wrap gap-2">
                      {PET_SPECIES.map((sp) => {
                        const Icon = SPECIES_ICON[sp];
                        const selected = form.petSpecies === sp;
                        return (
                          <label
                            key={sp}
                            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control border px-3 text-[0.95rem] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pine ${
                              selected ? "border-pine bg-pine text-white" : "border-line-strong bg-surface hover:border-pine"
                            }`}
                          >
                            <input
                              type="radio"
                              name="petSpecies"
                              value={sp}
                              checked={selected}
                              onChange={() => update("petSpecies", sp)}
                              className="sr-only"
                            />
                            <Icon className="h-4 w-4" aria-hidden />
                            {PET_SPECIES_LABELS[sp]}
                          </label>
                        );
                      })}
                    </div>
                    {errors.petSpecies && (
                      <p className="mt-1.5 text-sm font-medium text-coral" role="alert">
                        {errors.petSpecies}
                      </p>
                    )}
                  </div>
                  <Field id="petBreed" label="Cinsi" optional error={errors.petBreed}>
                    <input
                      {...fieldAria("petBreed", errors.petBreed)}
                      className="input"
                      value={form.petBreed}
                      onChange={(e) => update("petBreed", e.target.value)}
                      placeholder="Örn. Tekir, Golden Retriever"
                      maxLength={60}
                    />
                  </Field>
                  <Field id="petAge" label="Yaşı" optional error={errors.petAge}>
                    <input
                      {...fieldAria("petAge", errors.petAge)}
                      className="input"
                      value={form.petAge}
                      onChange={(e) => update("petAge", e.target.value)}
                      placeholder="Örn. 3 yaş, 8 aylık"
                      maxLength={30}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="font-display text-lg font-semibold">Sen</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="ownerName" label="Ad soyad" error={errors.ownerName}>
                    <input
                      {...fieldAria("ownerName", errors.ownerName)}
                      className="input"
                      value={form.ownerName}
                      onChange={(e) => update("ownerName", e.target.value)}
                      autoComplete="name"
                      maxLength={80}
                    />
                  </Field>
                  <Field id="ownerPhone" label="Cep telefonu" hint="Randevunu bu numarayla yönetirsin." error={errors.ownerPhone}>
                    <input
                      {...fieldAria("ownerPhone", errors.ownerPhone, true)}
                      className="input"
                      type="tel"
                      inputMode="tel"
                      value={form.ownerPhone}
                      onChange={(e) => update("ownerPhone", e.target.value)}
                      autoComplete="tel"
                      placeholder="05XX XXX XX XX"
                      maxLength={20}
                    />
                  </Field>
                  <Field id="ownerEmail" label="E-posta" optional error={errors.ownerEmail} className="sm:col-span-2">
                    <input
                      {...fieldAria("ownerEmail", errors.ownerEmail)}
                      className="input"
                      type="email"
                      value={form.ownerEmail}
                      onChange={(e) => update("ownerEmail", e.target.value)}
                      autoComplete="email"
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    id="notes"
                    label={clinic.isSitter ? "Adresin ve bakım notların" : "Kliniğe notun"}
                    optional
                    error={errors.notes}
                    className="sm:col-span-2"
                  >
                    <textarea
                      {...fieldAria("notes", errors.notes)}
                      className="input"
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      placeholder={
                        clinic.isSitter
                          ? "Bakıcının geleceği adres, mama ve ilaç düzeni, anahtar teslimi gibi bilgiler"
                          : "Şikâyet, kullandığı ilaçlar ya da kliniğin bilmesini istediğin bir şey"
                      }
                      maxLength={500}
                      rows={3}
                    />
                  </Field>
                </div>
              </fieldset>

              {/* Bot tuzağı: ekranda görünmez */}
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
                    aria-invalid={errors.consent ? true : undefined}
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-pine)]"
                  />
                  <span className="text-[0.95rem]">
                    Kişisel verilerimin randevu amacıyla kliniğe iletilmesine ilişkin{" "}
                    <Link href="/kvkk" target="_blank" className="font-semibold text-pine underline underline-offset-2">
                      aydınlatma metnini
                    </Link>{" "}
                    okudum.
                  </span>
                </label>
                {errors.consent && (
                  <p className="mt-1.5 text-sm font-medium text-coral" role="alert">
                    {errors.consent}
                  </p>
                )}
              </div>

              <FormError message={formError ?? undefined} />

              <div className="rounded-card bg-paper p-4 lg:hidden">
                <Summary clinic={clinic} service={service} vetName={vet?.name} date={date} time={time} endLabel={endLabel} today={today} />
              </div>

              <button
                type="submit"
                disabled={pending || !service || !time}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-pine px-6 text-base font-semibold text-white hover:bg-pine-dark disabled:opacity-60 sm:w-auto"
              >
                {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                {pending ? "Randevun oluşturuluyor" : clinic.isSitter ? "Ziyareti onayla" : "Randevuyu onayla"}
              </button>
              <p className="text-sm text-stone">
                {clinic.isSitter
                  ? clinic.autoConfirm
                    ? "Ziyaretin anında onaylanır. Ücreti bakıcıya ödersin."
                    : "Talebin pet sittera iletilir; onayladığında kesinleşir."
                  : clinic.autoConfirm
                    ? "Randevun anında onaylanır. Ücreti klinikte ödersin."
                    : "Randevu talebin kliniğe iletilir; klinik onayladığında kesinleşir."}
              </p>
            </form>
          </StepCard>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-panel border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Randevu özeti</h2>
          <div className="mt-4">
            <Summary clinic={clinic} service={service} vetName={vet?.name} date={date} time={time} endLabel={endLabel} today={today} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Summary({
  clinic,
  service,
  vetName,
  date,
  time,
  endLabel,
  today,
}: {
  clinic: WizardClinic;
  service: WizardService | null;
  vetName?: string;
  date: string;
  time: string | null;
  endLabel: string | null;
  today: string;
}) {
  return (
    <dl className="space-y-3 text-[0.95rem]">
      <div>
        <dt className="text-sm text-stone">{clinic.isSitter ? "Pet sitter" : "Klinik"}</dt>
        <dd className="font-medium">
          {clinic.name}
          <span className="block text-sm font-normal text-stone">
            {clinic.district}, {clinic.city}
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-sm text-stone">Hizmet</dt>
        <dd className="font-medium">{service ? service.name : "Seçilmedi"}</dd>
      </div>
      <div>
        <dt className="text-sm text-stone">Zaman</dt>
        <dd className="font-medium">
          {time ? (
            <>
              {relativeDayLabel(date, today)}, {time}–{endLabel}
              {relativeDayLabel(date, today) !== formatDateMedium(date) && (
                <span className="block text-sm font-normal text-stone">{formatDateMedium(date)}</span>
              )}
            </>
          ) : (
            "Seçilmedi"
          )}
        </dd>
      </div>
      {!clinic.isSitter && (
        <div>
          <dt className="text-sm text-stone">Veteriner</dt>
          <dd className="font-medium">{vetName ?? "İlk boş hekim"}</dd>
        </div>
      )}
      {service?.price !== null && service?.price !== undefined && (
        <div className="border-t border-line pt-3">
          <dt className="text-sm text-stone">{clinic.isSitter ? "Ücret (bakıcıya ödenir)" : "Ücret (klinikte ödenir)"}</dt>
          <dd className="font-display text-2xl font-semibold tabular">{formatPrice(service.price)}</dd>
        </div>
      )}
    </dl>
  );
}

function StepCard({
  n,
  title,
  active,
  done,
  summary,
  onEdit,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  done: boolean;
  summary?: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`adim-${n}`}
      className={`rounded-panel border bg-surface transition-colors ${active ? "border-pine/40 shadow-[0_20px_40px_-32px_rgba(15,92,74,0.6)]" : "border-line"}`}
    >
      <header className="flex items-center gap-4 px-5 py-4 sm:px-6">
        <span
          aria-hidden
          className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
            done && !active ? "bg-pine text-white" : active ? "bg-ink text-white" : "bg-paper text-stone"
          }`}
        >
          {done && !active ? <Check className="h-4 w-4" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`adim-${n}`} className={`text-lg font-semibold ${!active && !done ? "text-stone" : ""}`}>
            {title}
          </h2>
          {!active && summary && <p className="truncate text-sm text-stone">{summary}</p>}
        </div>
        {!active && onEdit && summary && (
          <button type="button" onClick={onEdit} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-pine hover:bg-pine-soft">
            Değiştir
          </button>
        )}
      </header>
      {active && <div className="border-t border-line px-5 pt-5 pb-6 sm:px-6">{children}</div>}
    </section>
  );
}
