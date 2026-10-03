"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { addStaffUserAction, removeStaffUserAction } from "@/lib/actions/panel";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/constants";
import { Field, fieldAria, FormError } from "@/components/ui/Field";

export type UserRow = { id: string; name: string; email: string; role: UserRole; lastLogin: string | null };

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {flash && (
        <p role="status" className="rounded-control border border-pine/30 bg-pine-soft px-4 py-3 font-medium text-pine-dark">
          {flash}
        </p>
      )}
      {adding ? (
        <AddUserForm
          onDone={(msg) => {
            setAdding(false);
            setFlash(msg ?? null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setFlash(null);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white hover:bg-pine-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Kullanıcı ekle
        </button>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
        {users.map((u) => (
          <UserItem key={u.id} user={u} isSelf={u.id === currentUserId} onRemoved={setFlash} />
        ))}
      </ul>
    </div>
  );
}

function UserItem({ user, isSelf, onRemoved }: { user: UserRow; isSelf: boolean; onRemoved: (msg: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">
          {user.name} {isSelf && <span className="text-sm font-normal text-stone">(sen)</span>}
        </p>
        <p className="truncate text-sm text-stone">{user.email}</p>
      </div>
      <p className="text-sm">{USER_ROLE_LABELS[user.role]}</p>
      <p className="w-44 text-sm text-stone">{user.lastLogin ? `Son giriş ${user.lastLogin}` : "Henüz giriş yapmadı"}</p>
      {!isSelf &&
        (confirm ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await removeStaffUserAction(user.id);
                  if (res.ok) onRemoved(res.message ?? "Kaldırıldı.");
                  else {
                    setError(res.error);
                    setConfirm(false);
                  }
                })
              }
              className="min-h-9 rounded-[10px] bg-coral px-3 text-sm font-semibold text-white"
            >
              Evet, kaldır
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="min-h-9 px-2 text-sm text-stone">
              Vazgeç
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="min-h-9 rounded-[10px] px-3 text-sm font-semibold text-coral hover:bg-coral-soft">
            Kaldır
          </button>
        ))}
      {error && <p className="w-full text-sm font-medium text-coral">{error}</p>}
    </li>
  );
}

function AddUserForm({ onDone }: { onDone: (msg?: string) => void }) {
  const [d, setD] = useState({ name: "", email: "", password: "", role: "clinic_staff" as "clinic_staff" | "clinic_admin" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await addStaffUserAction(d);
          if (res.ok) onDone(res.message);
          else {
            setError(res.error);
            setErrors(res.fieldErrors ?? {});
          }
        });
      }}
      className="space-y-4 rounded-card border border-pine/40 bg-surface p-4 sm:p-5"
    >
      <p className="font-semibold">Yeni kullanıcı</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="u-name" label="Ad soyad" error={errors.name}>
          <input {...fieldAria("u-name", errors.name)} className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field id="u-email" label="E-posta" error={errors.email}>
          <input {...fieldAria("u-email", errors.email)} className="input" type="email" autoComplete="off" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
        </Field>
        <Field id="u-pass" label="Geçici şifre" hint="En az 8 karakter. Kullanıcı girişten sonra değiştirebilir." error={errors.password}>
          <input
            {...fieldAria("u-pass", errors.password, true)}
            className="input"
            type="text"
            autoComplete="new-password"
            value={d.password}
            onChange={(e) => setD({ ...d, password: e.target.value })}
          />
        </Field>
        <Field id="u-role" label="Yetki">
          <select id="u-role" className="input" value={d.role} onChange={(e) => setD({ ...d, role: e.target.value as typeof d.role })}>
            <option value="clinic_staff">Personel: randevu ve konaklamaları yönetir</option>
            <option value="clinic_admin">Yönetici: ayarlar dahil her şey</option>
          </select>
        </Field>
      </div>
      <FormError message={error ?? undefined} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Kullanıcıyı ekle
        </button>
        <button type="button" onClick={() => onDone()} className="min-h-11 rounded-control px-4 font-semibold text-stone">
          Vazgeç
        </button>
      </div>
    </form>
  );
}
