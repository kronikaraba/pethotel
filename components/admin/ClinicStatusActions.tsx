"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setClinicStatusAction } from "@/lib/actions/admin";
import type { ClinicStatus } from "@/lib/constants";

export function ClinicStatusActions({ id, status }: { id: string; status: ClinicStatus }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (to: ClinicStatus) =>
    startTransition(async () => {
      setError(null);
      const res = await setClinicStatusAction(id, to);
      if (!res.ok) setError(res.error);
      setConfirm(false);
    });

  const btn = "inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1.5">
        {status !== "active" && (
          <button type="button" disabled={pending} onClick={() => run("active")} className={`${btn} bg-pine text-white hover:bg-pine-dark`}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {status === "pending" ? "Onayla ve yayına al" : "Yeniden yayına al"}
          </button>
        )}
        {status === "active" &&
          (confirm ? (
            <>
              <button type="button" disabled={pending} onClick={() => run("suspended")} className={`${btn} bg-coral text-white`}>
                Evet, askıya al
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={`${btn} text-stone`}>
                Vazgeç
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className={`${btn} border border-coral/40 text-coral hover:bg-coral-soft`}>
              Askıya al
            </button>
          ))}
      </div>
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
