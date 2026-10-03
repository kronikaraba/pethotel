"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { lookupBookingAction, type LookupState } from "@/lib/actions/booking";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";

export function LookupForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, dispatch, pending] = useActionState<LookupState, FormData>(lookupBookingAction, {});
  const e = state.fieldErrors ?? {};
  useFocusFirstError(state.fieldErrors);

  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => dispatch(data));
      }}
      className="space-y-4"
    >
      <Field id="code" label="Rezervasyon kodu" hint="Örn. R-7K3M9Q ya da K-4TQ8ZP" error={e.code}>
        <input
          {...fieldAria("code", e.code, true)}
          name="code"
          className="input uppercase"
          defaultValue={state.values?.code ?? defaultCode}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
        />
      </Field>
      <Field id="phone" label="Telefon numarası" hint="Rezervasyonda yazdığın numara" error={e.phone}>
        <input
          {...fieldAria("phone", e.phone, true)}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="input"
          defaultValue={state.values?.phone}
          placeholder="05XX XXX XX XX"
          maxLength={20}
        />
      </Field>
      <FormError message={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        Rezervasyonu göster
      </button>
    </form>
  );
}
