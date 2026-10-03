"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { deleteServiceAction, saveServiceAction } from "@/lib/actions/panel";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/constants";
import { durationLabel, formatPrice } from "@/lib/format";
import { Field, fieldAria, FormError } from "@/components/ui/Field";

export type ServiceRow = {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number | null;
  description: string | null;
  isActive: boolean;
};

type Draft = { name: string; category: ServiceCategory; durationMinutes: string; price: string; description: string; isActive: boolean };

const toDraft = (s?: ServiceRow): Draft => ({
  name: s?.name ?? "",
  category: s?.category ?? "muayene",
  durationMinutes: String(s?.durationMinutes ?? 30),
  price: s?.price !== null && s?.price !== undefined ? String(s.price) : "",
  description: s?.description ?? "",
  isActive: s?.isActive ?? true,
});

export function ServiceManager({ services }: { services: ServiceRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(services.length === 0 ? "new" : null);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {flash && (
        <p role="status" className="rounded-control border border-pine/30 bg-pine-soft px-4 py-3 font-medium text-pine-dark">
          {flash}
        </p>
      )}
      {editing === "new" ? (
        <ServiceEditor
          onDone={(msg) => {
            setEditing(null);
            setFlash(msg ?? null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing("new");
            setFlash(null);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white hover:bg-pine-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Yeni hizmet
        </button>
      )}

      {services.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
          {services.map((s) =>
            editing === s.id ? (
              <li key={s.id} className="p-2">
                <ServiceEditor
                  service={s}
                  onDone={(msg) => {
                    setEditing(null);
                    setFlash(msg ?? null);
                  }}
                />
              </li>
            ) : (
              <li key={s.id} className={`flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-5 ${s.isActive ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold">
                    {s.name} {!s.isActive && <span className="ml-1 text-xs font-semibold text-stone">Pasif</span>}
                  </p>
                  <p className="text-sm text-stone">{SERVICE_CATEGORY_LABELS[s.category]}</p>
                </div>
                <p className="w-20 text-sm text-stone tabular">{durationLabel(s.durationMinutes)}</p>
                <p className="w-24 text-right font-semibold tabular">{s.price !== null ? formatPrice(s.price) : "—"}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(s.id);
                    setFlash(null);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-line-strong px-3 text-sm font-semibold hover:border-pine hover:text-pine"
                  aria-label={`${s.name} hizmetini düzenle`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Düzenle
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function ServiceEditor({ service, onDone }: { service?: ServiceRow; onDone: (message?: string) => void }) {
  const [d, setD] = useState<Draft>(toDraft(service));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const idp = service?.id ?? "yeni";

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await saveServiceAction(service?.id ?? null, {
        name: d.name,
        category: d.category,
        durationMinutes: d.durationMinutes,
        price: d.price,
        description: d.description,
        isActive: d.isActive,
      });
      if (res.ok) onDone(res.message);
      else {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteServiceAction(service!.id);
      if (res.ok) onDone(res.message);
      else {
        setError(res.error);
        setConfirmDelete(false);
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="space-y-4 rounded-card border border-pine/40 bg-surface p-4 sm:p-5"
    >
      <p className="font-semibold">{service ? "Hizmeti düzenle" : "Yeni hizmet"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idp}-name`} label="Hizmet adı" error={errors.name}>
          <input {...fieldAria(`${idp}-name`, errors.name)} className="input" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </Field>
        <Field id={`${idp}-category`} label="Kategori">
          <select id={`${idp}-category`} className="input" value={d.category} onChange={(e) => set("category", e.target.value as ServiceCategory)}>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SERVICE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${idp}-duration`} label="Süre (dakika)" hint="Takvimde bu kadar yer kaplar." error={errors.durationMinutes}>
          <input
            {...fieldAria(`${idp}-duration`, errors.durationMinutes, true)}
            className="input"
            type="number"
            inputMode="numeric"
            min={5}
            step={5}
            value={d.durationMinutes}
            onChange={(e) => set("durationMinutes", e.target.value)}
          />
        </Field>
        <Field id={`${idp}-price`} label="Fiyat (₺)" optional hint="Boş bırakırsan sitede fiyat gösterilmez." error={errors.price}>
          <input
            {...fieldAria(`${idp}-price`, errors.price, true)}
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={d.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </Field>
        <Field id={`${idp}-desc`} label="Kısa açıklama" optional error={errors.description} className="sm:col-span-2">
          <input {...fieldAria(`${idp}-desc`, errors.description)} className="input" value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-5 w-5 accent-[var(--color-pine)]" />
        <span>Online randevuya açık</span>
      </label>
      <FormError message={error ?? undefined} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {service ? "Değişiklikleri kaydet" : "Hizmeti ekle"}
        </button>
        <button type="button" onClick={() => onDone()} className="min-h-11 rounded-control px-4 font-semibold text-stone hover:text-ink">
          Vazgeç
        </button>
        {service &&
          (confirmDelete ? (
            <span className="ml-auto inline-flex flex-wrap items-center gap-2">
              <span className="text-sm">Silinsin mi?</span>
              <button type="button" disabled={pending} onClick={remove} className="min-h-10 rounded-control bg-coral px-4 text-sm font-semibold text-white">
                Evet, sil
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 px-2 text-sm font-medium text-stone">
                Hayır
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto min-h-11 rounded-control px-4 font-semibold text-coral hover:bg-coral-soft">
              Sil
            </button>
          ))}
      </div>
    </form>
  );
}
