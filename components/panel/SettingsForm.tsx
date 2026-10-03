"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { saveClinicSettingsAction } from "@/lib/actions/panel";
import { CITIES } from "@/lib/cities";
import { SLOT_STEP_OPTIONS, WEEKDAYS, type WeekdayKey } from "@/lib/constants";
import type { WeekHours } from "@/lib/db/schema";
import { formatDateLong } from "@/lib/time";
import type { ClinicSettingsInput } from "@/lib/validation";
import { Field, fieldAria, FormError } from "@/components/ui/Field";

type DayDraft = { closed: boolean; open: string; close: string; breakStart: string; breakEnd: string };

export type SettingsInitial = {
  name: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  workingHours: WeekHours;
  closedDates: string[];
  slotMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  autoConfirm: boolean;
  boardingEnabled: boolean;
  boardingCatCapacity: number;
  boardingDogCapacity: number;
  boardingCatPrice: number | null;
  boardingDogPrice: number | null;
  boardingNotes: string;
};

const NOTICE_OPTIONS = [
  { value: 0, label: "Bildirim gerekmez" },
  { value: 30, label: "30 dakika önceden" },
  { value: 60, label: "1 saat önceden" },
  { value: 120, label: "2 saat önceden" },
  { value: 240, label: "4 saat önceden" },
  { value: 1440, label: "1 gün önceden" },
];
const AHEAD_OPTIONS = [7, 14, 30, 60, 90];

function toDayDraft(h: WeekHours[WeekdayKey]): DayDraft {
  return h
    ? { closed: false, open: h.open, close: h.close, breakStart: h.breakStart ?? "", breakEnd: h.breakEnd ?? "" }
    : { closed: true, open: "09:00", close: "18:00", breakStart: "", breakEnd: "" };
}

export function SettingsForm({ initial, phoneDisplay }: { initial: SettingsInitial; phoneDisplay: string }) {
  const [info, setInfo] = useState({
    name: initial.name,
    city: initial.city,
    district: initial.district,
    address: initial.address,
    phone: phoneDisplay,
    email: initial.email,
    description: initial.description,
  });
  const [hours, setHours] = useState<Record<WeekdayKey, DayDraft>>(
    () => Object.fromEntries(WEEKDAYS.map((d) => [d.key, toDayDraft(initial.workingHours[d.key])])) as Record<WeekdayKey, DayDraft>,
  );
  const [rules, setRules] = useState({
    slotMinutes: initial.slotMinutes,
    minNoticeMinutes: initial.minNoticeMinutes,
    maxDaysAhead: initial.maxDaysAhead,
    autoConfirm: initial.autoConfirm,
  });
  const [closedDates, setClosedDates] = useState<string[]>(initial.closedDates);
  const [newClosed, setNewClosed] = useState("");
  const [boarding, setBoarding] = useState({
    boardingEnabled: initial.boardingEnabled,
    boardingCatCapacity: String(initial.boardingCatCapacity),
    boardingDogCapacity: String(initial.boardingDogCapacity),
    boardingCatPrice: initial.boardingCatPrice !== null ? String(initial.boardingCatPrice) : "",
    boardingDogPrice: initial.boardingDogPrice !== null ? String(initial.boardingDogPrice) : "",
    boardingNotes: initial.boardingNotes,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const setDay = (key: WeekdayKey, patch: Partial<DayDraft>) => setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await saveClinicSettingsAction({
        ...info,
        city: info.city as ClinicSettingsInput["city"],
        hours,
        closedDates,
        ...rules,
        ...boarding,
      });
      if (res.ok) {
        setErrors({});
        setResult({ ok: true, text: res.message ?? "Kaydedildi." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setResult({ ok: false, text: res.error });
      }
    });
  }

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <Section title="Klinik bilgileri" description="Sitedeki klinik sayfanda görünür.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Klinik adı" error={err("name")}>
            <input {...fieldAria("name", err("name"))} className="input" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          </Field>
          <Field id="phone" label="Telefon" error={err("phone")}>
            <input {...fieldAria("phone", err("phone"))} className="input" type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
          </Field>
          <Field id="city" label="İl" error={err("city")}>
            <select id="city" className="input" value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field id="district" label="İlçe" error={err("district")}>
            <input {...fieldAria("district", err("district"))} className="input" value={info.district} onChange={(e) => setInfo({ ...info, district: e.target.value })} />
          </Field>
          <Field id="address" label="Açık adres" error={err("address")} className="sm:col-span-2">
            <input {...fieldAria("address", err("address"))} className="input" value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
          </Field>
          <Field id="email" label="E-posta" optional error={err("email")}>
            <input {...fieldAria("email", err("email"))} className="input" type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
          </Field>
          <Field id="description" label="Tanıtım yazısı" optional error={err("description")} className="sm:col-span-2">
            <textarea
              {...fieldAria("description", err("description"))}
              className="input"
              rows={3}
              maxLength={600}
              value={info.description}
              onChange={(e) => setInfo({ ...info, description: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Çalışma saatleri" description="Online randevu yalnızca bu saatler içinde alınır. Öğle arası isteğe bağlıdır.">
        <div className="divide-y divide-line">
          {WEEKDAYS.map((d) => {
            const h = hours[d.key];
            const e = err(`hours.${d.key}`);
            return (
              <div key={d.key} className="grid grid-cols-1 items-center gap-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <label className="flex cursor-pointer items-center gap-3 font-medium">
                  <input
                    type="checkbox"
                    checked={!h.closed}
                    onChange={(ev) => setDay(d.key, { closed: !ev.target.checked })}
                    className="h-5 w-5 accent-[var(--color-pine)]"
                  />
                  {d.label}
                </label>
                {h.closed ? (
                  <p className="text-stone">Kapalı</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <TimeInput label={`${d.label} açılış`} value={h.open} onChange={(v) => setDay(d.key, { open: v })} />
                    <span aria-hidden>–</span>
                    <TimeInput label={`${d.label} kapanış`} value={h.close} onChange={(v) => setDay(d.key, { close: v })} />
                    <span className="ml-2 text-stone">Ara</span>
                    <TimeInput label={`${d.label} öğle arası başlangıç`} value={h.breakStart} onChange={(v) => setDay(d.key, { breakStart: v })} />
                    <span aria-hidden>–</span>
                    <TimeInput label={`${d.label} öğle arası bitiş`} value={h.breakEnd} onChange={(v) => setDay(d.key, { breakEnd: v })} />
                    {(h.breakStart || h.breakEnd) && (
                      <button type="button" onClick={() => setDay(d.key, { breakStart: "", breakEnd: "" })} className="text-sm font-medium text-stone underline">
                        Arayı kaldır
                      </button>
                    )}
                    {e && (
                      <p className="w-full text-sm font-medium text-coral" role="alert">
                        {e}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Randevu kuralları">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="slotMinutes" label="Saat aralığı" hint="Boş saatler bu aralıkla listelenir.">
            <select
              id="slotMinutes"
              className="input"
              value={rules.slotMinutes}
              onChange={(e) => setRules({ ...rules, slotMinutes: Number(e.target.value) })}
            >
              {SLOT_STEP_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} dakikada bir
                </option>
              ))}
            </select>
          </Field>
          <Field id="minNotice" label="En geç ne zaman alınabilir?">
            <select
              id="minNotice"
              className="input"
              value={rules.minNoticeMinutes}
              onChange={(e) => setRules({ ...rules, minNoticeMinutes: Number(e.target.value) })}
            >
              {NOTICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="maxDays" label="En ileri tarih">
            <select id="maxDays" className="input" value={rules.maxDaysAhead} onChange={(e) => setRules({ ...rules, maxDaysAhead: Number(e.target.value) })}>
              {AHEAD_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} gün sonrasına kadar
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={rules.autoConfirm}
            onChange={(e) => setRules({ ...rules, autoConfirm: e.target.checked })}
            className="mt-0.5 h-5 w-5 accent-[var(--color-pine)]"
          />
          <span>
            <span className="font-medium">Online randevuları otomatik onayla</span>
            <span className="block text-sm text-stone">Kapalıysa randevular &quot;Onay bekliyor&quot; durumunda gelir ve senin onaylaman gerekir.</span>
          </span>
        </label>

        <div className="mt-6 border-t border-line pt-5">
          <p className="label">Tatil ve kapalı günler</p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="newClosed" className="sr-only">
              Kapalı gün ekle
            </label>
            <input id="newClosed" type="date" className="input w-auto" value={newClosed} onChange={(e) => setNewClosed(e.target.value)} />
            <button
              type="button"
              onClick={() => {
                if (newClosed && !closedDates.includes(newClosed)) setClosedDates([...closedDates, newClosed].sort());
                setNewClosed("");
              }}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-control border border-line-strong bg-surface px-4 font-semibold hover:border-pine"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Ekle
            </button>
          </div>
          {closedDates.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {closedDates.map((d) => (
                <li key={d} className="inline-flex items-center gap-1 rounded-full bg-paper py-1 pr-1 pl-3 text-sm">
                  {formatDateLong(d)}
                  <button
                    type="button"
                    onClick={() => setClosedDates(closedDates.filter((x) => x !== d))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-coral-soft hover:text-coral"
                    aria-label={`${formatDateLong(d)} kapalı gününü kaldır`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone">Bayram, tatil ya da kongre günlerini ekle; bu günlerde online randevu alınmaz.</p>
          )}
        </div>
      </Section>

      <section id="konaklama" className="night scroll-mt-24 rounded-panel bg-night p-5 text-night-ink sm:p-7">
        <h2 className="text-xl font-semibold">Pet otel</h2>
        <p className="mt-1 text-sm text-night-muted">Kapasite, aynı gece konaklayabilecek en fazla misafir sayısıdır.</p>
        <label className="mt-5 flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={boarding.boardingEnabled}
            onChange={(e) => setBoarding({ ...boarding, boardingEnabled: e.target.checked })}
            className="h-5 w-5 accent-[var(--color-lamp)]"
          />
          <span className="font-medium">Konaklama talebi kabul et</span>
        </label>
        {boarding.boardingEnabled && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="catCap" label="Kedi kapasitesi" error={err("boardingCatCapacity")}>
              <input
                {...fieldAria("catCap", err("boardingCatCapacity"))}
                className="input"
                type="number"
                min={0}
                value={boarding.boardingCatCapacity}
                onChange={(e) => setBoarding({ ...boarding, boardingCatCapacity: e.target.value })}
              />
            </Field>
            <Field id="catPrice" label="Kedi gecelik fiyatı (₺)" optional error={err("boardingCatPrice")}>
              <input
                {...fieldAria("catPrice", err("boardingCatPrice"))}
                className="input"
                type="number"
                min={0}
                step={50}
                value={boarding.boardingCatPrice}
                onChange={(e) => setBoarding({ ...boarding, boardingCatPrice: e.target.value })}
              />
            </Field>
            <Field id="dogCap" label="Köpek kapasitesi" error={err("boardingDogCapacity")}>
              <input
                {...fieldAria("dogCap", err("boardingDogCapacity"))}
                className="input"
                type="number"
                min={0}
                value={boarding.boardingDogCapacity}
                onChange={(e) => setBoarding({ ...boarding, boardingDogCapacity: e.target.value })}
              />
            </Field>
            <Field id="dogPrice" label="Köpek gecelik fiyatı (₺)" optional error={err("boardingDogPrice")}>
              <input
                {...fieldAria("dogPrice", err("boardingDogPrice"))}
                className="input"
                type="number"
                min={0}
                step={50}
                value={boarding.boardingDogPrice}
                onChange={(e) => setBoarding({ ...boarding, boardingDogPrice: e.target.value })}
              />
            </Field>
            <Field id="bNotes" label="Konaklama kuralları" optional hint="Giriş-çıkış saatleri, aşı şartı, mama vb." error={err("boardingNotes")} className="sm:col-span-2">
              <textarea
                {...fieldAria("bNotes", err("boardingNotes"), true)}
                className="input"
                rows={3}
                maxLength={600}
                value={boarding.boardingNotes}
                onChange={(e) => setBoarding({ ...boarding, boardingNotes: e.target.value })}
              />
            </Field>
          </div>
        )}
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center gap-2 rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark disabled:opacity-60">
          {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          Ayarları kaydet
        </button>
        {result &&
          (result.ok ? (
            <p role="status" className="font-medium text-pine">
              {result.text}
            </p>
          ) : (
            <div className="flex-1">
              <FormError message={result.text} />
            </div>
          ))}
      </div>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-stone">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      aria-label={label}
      step={300}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input min-h-10 w-[8.5rem] px-3 py-1.5 text-[0.95rem] tabular"
    />
  );
}
