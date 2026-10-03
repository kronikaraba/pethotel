"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { deleteVetAction, saveVetAction } from "@/lib/actions/panel";
import { Field, fieldAria, FormError } from "@/components/ui/Field";

export type VetRow = { id: string; name: string; title: string; bio: string | null; isActive: boolean };
type Draft = { name: string; title: string; bio: string; isActive: boolean };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase("tr-TR"))
    .join("");

export function VetManager({ vets }: { vets: VetRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(vets.length === 0 ? "new" : null);
  const [flash, setFlash] = useState<string | null>(null);
  const done = (msg?: string) => {
    setEditing(null);
    setFlash(msg ?? null);
  };

  return (
    <div className="space-y-4">
      {flash && (
        <p role="status" className="rounded-control border border-pine/30 bg-pine-soft px-4 py-3 font-medium text-pine-dark">
          {flash}
        </p>
      )}
      {editing === "new" ? (
        <VetEditor onDone={done} />
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
          Veteriner ekle
        </button>
      )}
      {vets.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
          {vets.map((v) =>
            editing === v.id ? (
              <li key={v.id} className="p-2">
                <VetEditor vet={v} onDone={done} />
              </li>
            ) : (
              <li key={v.id} className={`flex items-center gap-4 px-4 py-4 sm:px-5 ${v.isActive ? "" : "opacity-60"}`}>
                <span aria-hidden className="font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine-soft font-bold text-pine">
                  {initials(v.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {v.name} {!v.isActive && <span className="ml-1 text-xs font-semibold text-stone">Pasif: randevu almıyor</span>}
                  </p>
                  <p className="text-sm text-stone">{v.title}</p>
                  {v.bio && <p className="mt-0.5 text-sm">{v.bio}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(v.id);
                    setFlash(null);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-line-strong px-3 text-sm font-semibold hover:border-pine hover:text-pine"
                  aria-label={`${v.name} bilgilerini düzenle`}
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

function VetEditor({ vet, onDone }: { vet?: VetRow; onDone: (message?: string) => void }) {
  const [d, setD] = useState<Draft>({ name: vet?.name ?? "", title: vet?.title ?? "Veteriner Hekim", bio: vet?.bio ?? "", isActive: vet?.isActive ?? true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const idp = vet?.id ?? "yeni";
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const res = await saveVetAction(vet?.id ?? null, d);
          if (res.ok) onDone(res.message);
          else {
            setError(res.error);
            setErrors(res.fieldErrors ?? {});
          }
        });
      }}
      className="space-y-4 rounded-card border border-pine/40 bg-surface p-4 sm:p-5"
    >
      <p className="font-semibold">{vet ? "Bilgileri düzenle" : "Yeni veteriner"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idp}-name`} label="Ad soyad" error={errors.name}>
          <input {...fieldAria(`${idp}-name`, errors.name)} className="input" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </Field>
        <Field id={`${idp}-title`} label="Unvan" error={errors.title}>
          <input {...fieldAria(`${idp}-title`, errors.title)} className="input" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={60} />
        </Field>
        <Field id={`${idp}-bio`} label="Uzmanlık ya da kısa bilgi" optional error={errors.bio} className="sm:col-span-2">
          <input {...fieldAria(`${idp}-bio`, errors.bio)} className="input" value={d.bio} onChange={(e) => set("bio", e.target.value)} maxLength={200} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-3">
        <input type="checkbox" checked={d.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-5 w-5 accent-[var(--color-pine)]" />
        <span>Online randevu alıyor</span>
      </label>
      <FormError message={error ?? undefined} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {vet ? "Değişiklikleri kaydet" : "Veterineri ekle"}
        </button>
        <button type="button" onClick={() => onDone()} className="min-h-11 rounded-control px-4 font-semibold text-stone hover:text-ink">
          Vazgeç
        </button>
        {vet &&
          (confirmDelete ? (
            <span className="ml-auto inline-flex flex-wrap items-center gap-2">
              <span className="text-sm">Silinsin mi?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await deleteVetAction(vet.id);
                    if (res.ok) onDone(res.message);
                    else {
                      setError(res.error);
                      setConfirmDelete(false);
                    }
                  })
                }
                className="min-h-10 rounded-control bg-coral px-4 text-sm font-semibold text-white"
              >
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
