"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cancelBookingAction } from "@/lib/actions/booking";

/** İki adımlı iptal: önce sorar, sonra iptal eder (tarayıcı onay penceresi kullanmaz). */
export function CancelBooking({ code, label }: { code: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-11 items-center rounded-control border border-coral/40 bg-surface px-4 font-semibold text-coral hover:bg-coral-soft"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-card border border-coral/30 bg-coral-soft p-4" role="group" aria-label="İptal onayı">
      <p className="font-semibold text-ink">Bu rezervasyonu iptal etmek istediğine emin misin?</p>
      <p className="mt-1 text-sm text-stone">İptal ettiğinde saat başkasına açılır ve geri alınamaz.</p>
      {error && (
        <p className="mt-2 text-sm font-medium text-coral" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await cancelBookingAction(code);
              if (res.ok) {
                setConfirming(false);
                router.refresh();
              } else setError(res.error);
            })
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-coral px-4 font-semibold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Evet, iptal et
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-11 items-center rounded-control border border-line-strong bg-surface px-4 font-semibold"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}
