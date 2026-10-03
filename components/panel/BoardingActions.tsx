"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setBoardingStatusAction } from "@/lib/actions/panel";
import type { BoardingStatus } from "@/lib/constants";

export function BoardingActions({ id, status }: { id: string; status: BoardingStatus }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<BoardingStatus | null>(null);
  const [mode, setMode] = useState<"idle" | "reject" | "cancel">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (to: BoardingStatus, withNote?: string) => {
    setBusy(to);
    setError(null);
    startTransition(async () => {
      const res = await setBoardingStatusAction(id, to, withNote);
      if (!res.ok) setError(res.error);
      setBusy(null);
      setMode("idle");
    });
  };

  const btn = "inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors disabled:opacity-60";
  const spinner = (s: BoardingStatus) => busy === s && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />;

  if (mode !== "idle") {
    const to: BoardingStatus = mode === "reject" ? "rejected" : "cancelled";
    return (
      <div className="w-full max-w-sm space-y-2">
        <label className="block text-sm font-medium" htmlFor={`not-${id}`}>
          Müşteriye not <span className="font-normal text-stone">(isteğe bağlı)</span>
        </label>
        <input
          id={`not-${id}`}
          className="input min-h-10 text-sm"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === "reject" ? "Örn. Bu tarihlerde köpek odalarımız dolu." : "İptal nedeni"}
        />
        <div className="flex gap-1.5">
          <button type="button" disabled={pending} onClick={() => run(to, note)} className={`${btn} bg-coral text-white`}>
            {spinner(to)}
            {mode === "reject" ? "Talebi reddet" : "Konaklamayı iptal et"}
          </button>
          <button type="button" onClick={() => setMode("idle")} className={`${btn} text-stone`}>
            Vazgeç
          </button>
        </div>
        {error && <p className="text-sm font-medium text-coral">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {status === "pending" && (
          <>
            <button type="button" disabled={pending} onClick={() => run("confirmed")} className={`${btn} bg-night text-lamp hover:bg-night-2`}>
              {spinner("confirmed")}
              Onayla
            </button>
            <button type="button" disabled={pending} onClick={() => setMode("reject")} className={`${btn} border border-coral/40 bg-surface text-coral hover:bg-coral-soft`}>
              Reddet
            </button>
          </>
        )}
        {status === "confirmed" && (
          <>
            <button type="button" disabled={pending} onClick={() => run("checked_in")} className={`${btn} bg-night text-lamp hover:bg-night-2`}>
              {spinner("checked_in")}
              Giriş yaptı
            </button>
            <button type="button" disabled={pending} onClick={() => setMode("cancel")} className={`${btn} border border-coral/40 bg-surface text-coral hover:bg-coral-soft`}>
              İptal et
            </button>
          </>
        )}
        {status === "checked_in" && (
          <button type="button" disabled={pending} onClick={() => run("completed")} className={`${btn} bg-night text-lamp hover:bg-night-2`}>
            {spinner("completed")}
            Çıkış yaptı
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
