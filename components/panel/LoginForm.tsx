"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type FormState } from "@/lib/actions/auth";
import { Field, fieldAria, FormError } from "@/components/ui/Field";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";

export function LoginForm({ next }: { next?: string }) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(loginAction, {});
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
      {next && <input type="hidden" name="next" value={next} />}
      <Field id="email" label="E-posta" error={e.email}>
        <input
          {...fieldAria("email", e.email)}
          name="email"
          type="email"
          autoComplete="username"
          className="input"
          defaultValue={state.values?.email}
          required
        />
      </Field>
      <Field id="password" label="Şifre" error={e.password}>
        <input {...fieldAria("password", e.password)} name="password" type="password" autoComplete="current-password" className="input" required />
      </Field>
      <FormError message={state.error} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        Giriş yap
      </button>
    </form>
  );
}
