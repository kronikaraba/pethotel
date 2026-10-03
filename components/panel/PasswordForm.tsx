"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { changePasswordAction, type FormState } from "@/lib/actions/auth";
import { Field, fieldAria, FormError } from "@/components/ui/Field";

export function PasswordForm() {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        startTransition(() => dispatch(data));
      }}
      className="max-w-md space-y-4"
    >
      <Field id="current" label="Mevcut şifre" error={e.current}>
        <input {...fieldAria("current", e.current)} name="current" type="password" autoComplete="current-password" className="input" />
      </Field>
      <Field id="next" label="Yeni şifre" hint="En az 8 karakter." error={e.next}>
        <input {...fieldAria("next", e.next, true)} name="next" type="password" autoComplete="new-password" className="input" />
      </Field>
      <Field id="repeat" label="Yeni şifre (tekrar)" error={e.repeat}>
        <input {...fieldAria("repeat", e.repeat)} name="repeat" type="password" autoComplete="new-password" className="input" />
      </Field>
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="font-medium text-pine">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-pine px-5 font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Şifreyi değiştir
      </button>
    </form>
  );
}
