import type { ReactNode } from "react";

/** Etiket + alan + yardım/hata metni. Hata varsa alan aria-invalid ile işaretlenmelidir. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {optional && <span className="ml-1.5 font-normal text-stone">(isteğe bağlı)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-coral" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-stone">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Alanın aria özniteliklerini Field ile tutarlı üretir. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  };
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-[var(--radius-control)] border border-coral/30 bg-coral-soft px-4 py-3 text-sm font-medium text-coral">
      {message}
    </div>
  );
}
