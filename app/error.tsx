"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold sm:text-4xl">Bir şeyler ters gitti.</h1>
      <p className="mt-3 text-lg text-stone">
        Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar dene; sorun sürerse birkaç dakika sonra yeniden gel.
      </p>
      {error.digest && <p className="mt-2 text-sm text-stone">Hata kodu: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center rounded-control bg-pine px-6 font-semibold text-white hover:bg-pine-dark"
        >
          Tekrar dene
        </button>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-control border border-line-strong bg-surface px-6 font-semibold">
          Ana sayfa
        </Link>
      </div>
    </main>
  );
}
