"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setAppointmentStatusAction } from "@/lib/actions/panel";
import type { AppointmentStatus } from "@/lib/constants";

const ACTIONS: Record<AppointmentStatus, { to: AppointmentStatus; label: string; tone: "primary" | "plain" | "danger" }[]> = {
  pending: [
    { to: "confirmed", label: "Onayla", tone: "primary" },
    { to: "cancelled", label: "Reddet", tone: "danger" },
  ],
  confirmed: [
    { to: "completed", label: "Tamamlandı", tone: "primary" },
    { to: "no_show", label: "Gelmedi", tone: "plain" },
    { to: "cancelled", label: "İptal et", tone: "danger" },
  ],
  completed: [{ to: "no_show", label: "Gelmedi olarak işaretle", tone: "plain" }],
  no_show: [{ to: "completed", label: "Geldi olarak işaretle", tone: "plain" }],
  cancelled: [],
};

const TONE = {
  primary: "bg-pine text-white hover:bg-pine-dark",
  plain: "border border-line-strong bg-surface hover:border-pine hover:text-pine",
  danger: "border border-coral/40 bg-surface text-coral hover:bg-coral-soft",
};

export function AppointmentActions({ id, status, compact }: { id: string; status: AppointmentStatus; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<AppointmentStatus | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = ACTIONS[status];
  if (actions.length === 0) return null;

  const run = (to: AppointmentStatus) => {
    setBusy(to);
    setError(null);
    startTransition(async () => {
      const res = await setAppointmentStatusAction(id, to);
      if (!res.ok) setError(res.error);
      setBusy(null);
      setConfirmCancel(false);
    });
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {actions.map((a) => {
          const isCancel = a.to === "cancelled";
          if (isCancel && confirmCancel) {
            return (
              <span key={a.to} className="inline-flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(a.to)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] bg-coral px-3 text-sm font-semibold text-white"
                >
                  {busy === a.to && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Evet, {a.label.toLocaleLowerCase("tr-TR")}
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-9 rounded-[10px] px-2 text-sm font-medium text-stone">
                  Vazgeç
                </button>
              </span>
            );
          }
          return (
            <button
              key={a.to}
              type="button"
              disabled={pending}
              onClick={() => (isCancel ? setConfirmCancel(true) : run(a.to))}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${TONE[a.tone]} ${
                compact ? "" : ""
              }`}
            >
              {busy === a.to && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {a.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm font-medium text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
