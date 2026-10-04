"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { registerClinicAction } from "@/lib/actions/register";
import type { FormState } from "@/lib/actions/auth";
import { CITIES } from "@/lib/cities";
import type { BusinessKind } from "@/lib/constants";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";

const COPY: Record<
  BusinessKind,
  { legend: string; name: string; address: string; addressHint?: string; phone: string; email: string; description: string; descriptionHint: string; submit: string }
> = {
  vet: {
    legend: "Klinik",
    name: "Klinik adı",
    address: "Açık adres",
    phone: "Klinik telefonu",
    email: "Klinik e-postası",
    description: "Kısa tanıtım",
    descriptionHint: "Sitedeki klinik sayfanda görünür. Sonradan değiştirebilirsin.",
    submit: "Kliniği kaydet",
  },
  hotel: {
    legend: "Otel",
    name: "Otel adı",
    address: "Açık adres",
    phone: "Otel telefonu",
    email: "Otel e-postası",
    description: "Kısa tanıtım",
    descriptionHint: "Odalar, bahçe, günlük bakım gibi öne çıkanları yaz. Sonradan değiştirebilirsin.",
    submit: "Oteli kaydet",
  },
  sitter: {
    legend: "Profilin",
    name: "Adın soyadın",
    address: "Hizmet verdiğin semtler",
    addressHint: "Örn. Kadıköy, Ataşehir ve Üsküdar. Açık adresin sitede görünmez.",
    phone: "Telefonun",
    email: "İletişim e-postası",
    description: "Kendini tanıt",
    descriptionHint: "Deneyimin, baktığın hayvanlar, ilaç verebilmek gibi bilgiler profilinde görünür.",
    submit: "Profilimi oluştur",
  },
};

export function RegisterForm({ kind }: { kind: BusinessKind }) {
  const copy = COPY[kind];
  const [state, dispatch, pending] = useActionState<FormState, FormData>(registerClinicAction, {});
  const e = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors);
  const v = state.values ?? {};

  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => dispatch(data));
      }}
      className="space-y-10"
    >
      <input type="hidden" name="kind" value={kind} />
      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold">{copy.legend}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="clinicName" label={copy.name} error={e.clinicName} className="sm:col-span-2">
            <input
              {...fieldAria("clinicName", e.clinicName)}
              name="clinicName"
              autoComplete={kind === "sitter" ? "name" : "organization"}
              className="input"
              defaultValue={v.clinicName}
              maxLength={80}
            />
          </Field>
          <Field id="city" label="İl" error={e.city}>
            <select id="city" name="city" className="input" defaultValue={v.city ?? ""} aria-invalid={e.city ? true : undefined}>
              <option value="" disabled>
                İl seç
              </option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field id="district" label="İlçe" error={e.district}>
            <input {...fieldAria("district", e.district)} name="district" className="input" defaultValue={v.district} maxLength={40} />
          </Field>
          <Field id="address" label={copy.address} hint={copy.addressHint} error={e.address} className="sm:col-span-2">
            <input {...fieldAria("address", e.address, Boolean(copy.addressHint))} name="address" className="input" defaultValue={v.address} maxLength={200} />
          </Field>
          <Field id="phone" label={copy.phone} error={e.phone}>
            <input {...fieldAria("phone", e.phone)} name="phone" type="tel" inputMode="tel" className="input" defaultValue={v.phone} />
          </Field>
          <Field id="clinicEmail" label={copy.email} optional error={e.clinicEmail}>
            <input {...fieldAria("clinicEmail", e.clinicEmail)} name="clinicEmail" type="email" className="input" defaultValue={v.clinicEmail} />
          </Field>
          <Field id="description" label={copy.description} optional hint={copy.descriptionHint} error={e.description} className="sm:col-span-2">
            <textarea {...fieldAria("description", e.description, true)} name="description" rows={3} className="input" defaultValue={v.description} maxLength={600} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-display text-xl font-semibold">Panel hesabın</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {kind !== "sitter" && (
            <Field id="contactName" label="Ad soyad" error={e.contactName}>
              <input {...fieldAria("contactName", e.contactName)} name="contactName" autoComplete="name" className="input" defaultValue={v.contactName} />
            </Field>
          )}
          <Field id="email" label="E-posta" hint="Panele bu adresle giriş yapacaksın." error={e.email}>
            <input {...fieldAria("email", e.email, true)} name="email" type="email" autoComplete="username" className="input" defaultValue={v.email} />
          </Field>
          <Field id="password" label="Şifre" hint="En az 8 karakter." error={e.password}>
            <input {...fieldAria("password", e.password, true)} name="password" type="password" autoComplete="new-password" className="input" />
          </Field>
        </div>
      </fieldset>

      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Web sitesi</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-pine)]" />
          <span className="text-[0.95rem]">
            Kayıt ve hesap bilgilerimin platform tarafından işlenmesine ilişkin{" "}
            <Link href="/kvkk" target="_blank" className="font-semibold text-pine underline underline-offset-2">
              aydınlatma metnini
            </Link>{" "}
            okudum.
          </span>
        </label>
        {e.consent && (
          <p className="mt-1.5 text-sm font-medium text-coral" role="alert">
            {e.consent}
          </p>
        )}
      </div>

      <FormError message={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-pine px-6 text-base font-semibold text-white hover:bg-pine-dark disabled:opacity-60 sm:w-auto"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        {copy.submit}
      </button>
    </form>
  );
}
