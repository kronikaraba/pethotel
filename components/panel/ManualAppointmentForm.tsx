"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createManualAppointmentAction } from "@/lib/actions/panel";
import { PET_SPECIES, PET_SPECIES_LABELS, type PetSpecies } from "@/lib/constants";
import { durationLabel } from "@/lib/format";
import { formatDateMedium } from "@/lib/time";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { TimeGrid, type SlotDTO } from "@/components/booking/TimeGrid";

type Opt = { id: string; name: string };

export function ManualAppointmentForm({
  clinicSlug,
  services,
  vets,
  defaultDate,
}: {
  clinicSlug: string;
  services: (Opt & { durationMinutes: number })[];
  vets: (Opt & { title: string })[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [vetId, setVetId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [rawTime, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ petName: "", petSpecies: "cat" as PetSpecies, ownerName: "", ownerPhone: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Sonuçlar istek anahtarıyla saklanır; anahtar değişince "yükleniyor" kendiliğinden görünür.
  const requestKey = serviceId && date ? `${serviceId}|${vetId}|${date}` : null;
  const [result, setResult] = useState<{ key: string; slots: SlotDTO[]; error?: string } | null>(null);
  const current = result && result.key === requestKey ? result : null;
  const slots = current && !current.error ? current.slots : null;
  const loadError = current?.error ?? null;
  const time = rawTime && slots?.some((s) => s.label === rawTime) ? rawTime : null;

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ hizmet: serviceId, tarih: date, mod: "klinik" });
    if (vetId) params.set("veteriner", vetId);
    fetch(`/api/klinik/${clinicSlug}/musaitlik?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Boş saatler alınamadı.");
        setResult({ key: requestKey, slots: body.slots });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setResult({ key: requestKey, slots: [], error: e.message });
      });
    return () => controller.abort();
  }, [clinicSlug, requestKey, serviceId, vetId, date]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!time) {
      setFormError("Bir saat seç.");
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const res = await createManualAppointmentAction({ serviceId, vetId, date, time, ...form });
      if (res.ok) {
        router.push(`/panel/randevular?tarih=${res.data!.date}&eklendi=${res.data!.code}`);
        return;
      }
      setFormError(res.error);
      setErrors(res.fieldErrors ?? {});
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-5 rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Zaman</h2>
        <Field id="serviceId" label="Hizmet">
          <select id="serviceId" className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({durationLabel(s.durationMinutes)})
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Tek kişilik takvimde (pet sitter, tek hekimli klinik) seçim gerekmez. */}
          {vets.length > 1 && (
            <Field id="vetId" label="Veteriner">
              <select id="vetId" className="input" value={vetId} onChange={(e) => setVetId(e.target.value)}>
                <option value="">Fark etmez (ilk boş hekim)</option>
                {vets.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field id="date" label="Tarih" error={errors.date}>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div aria-live="polite">
          <p className="label">{date ? `${formatDateMedium(date)} için boş saatler` : "Boş saatler"}</p>
          {loadError ? (
            <p className="text-coral">{loadError}</p>
          ) : slots === null ? (
            <p className="flex items-center gap-2 text-stone">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Yükleniyor…
            </p>
          ) : slots.length === 0 ? (
            <p className="rounded-control bg-paper px-4 py-3 text-stone">Bu gün için boş saat yok (klinik kapalı ya da takvim dolu).</p>
          ) : (
            <TimeGrid slots={slots} value={time} onChange={setTime} />
          )}
        </div>
      </section>

      <section className="space-y-5 rounded-panel border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Hasta ve sahibi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="petName" label="Hayvanın adı" error={errors.petName}>
            <input {...fieldAria("petName", errors.petName)} className="input" value={form.petName} onChange={(e) => set("petName", e.target.value)} />
          </Field>
          <Field id="petSpecies" label="Türü">
            <select id="petSpecies" className="input" value={form.petSpecies} onChange={(e) => set("petSpecies", e.target.value)}>
              {PET_SPECIES.map((s) => (
                <option key={s} value={s}>
                  {PET_SPECIES_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="ownerName" label="Sahibinin adı" error={errors.ownerName}>
            <input {...fieldAria("ownerName", errors.ownerName)} className="input" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
          </Field>
          <Field id="ownerPhone" label="Telefon" error={errors.ownerPhone}>
            <input
              {...fieldAria("ownerPhone", errors.ownerPhone)}
              className="input"
              type="tel"
              inputMode="tel"
              value={form.ownerPhone}
              onChange={(e) => set("ownerPhone", e.target.value)}
            />
          </Field>
        </div>
        <Field id="notes" label="Not" optional error={errors.notes}>
          <textarea {...fieldAria("notes", errors.notes)} className="input" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <FormError message={formError ?? undefined} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
        >
          {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {time ? `${formatDateMedium(date)} ${time} için randevuyu ekle` : "Randevuyu ekle"}
        </button>
      </section>
    </form>
  );
}
