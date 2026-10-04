"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { deleteClinicPhotoAction, moveClinicPhotoAction, uploadClinicPhotoAction } from "@/lib/actions/photos";
import type { PhotoMeta } from "@/lib/data/photos";
import { MAX_PHOTO_BYTES, MAX_PHOTO_EDGE, MAX_PHOTOS_PER_CLINIC, photoUrl } from "@/lib/photos";
import { FormError } from "@/components/ui/Field";

/** Fotoğrafı tarayıcıda küçültüp JPEG'e çevirir; telefon fotoğrafları birkaç yüz KB'a iner. */
async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${file.name}: bu dosya açılamadı. JPEG, PNG ya da WebP bir fotoğraf seç.`);
  }
  for (const [edge, quality] of [
    [MAX_PHOTO_EDGE, 0.82],
    [MAX_PHOTO_EDGE, 0.7],
    [1200, 0.7],
  ] as const) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; // saydam PNG'ler siyah görünmesin
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_PHOTO_BYTES) {
      bitmap.close();
      return { blob, width, height };
    }
  }
  bitmap.close();
  throw new Error(`${file.name}: fotoğraf küçültülemedi.`);
}

export function PhotoManager({ photos, clinicName }: { photos: PhotoMeta[]; clinicName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const remaining = MAX_PHOTOS_PER_CLINIC - photos.length;

  async function upload(files: File[]) {
    setError(null);
    if (files.length === 0) return;
    const list = files.slice(0, remaining);
    const skipped = files.length - list.length;
    const problems: string[] = [];
    setProgress({ done: 0, total: list.length });
    for (const [i, file] of list.entries()) {
      try {
        const { blob, width, height } = await shrink(file);
        const form = new FormData();
        form.set("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
        form.set("width", String(width));
        form.set("height", String(height));
        const result = await uploadClinicPhotoAction(form);
        if (!result.ok) problems.push(result.error);
      } catch (e) {
        problems.push(e instanceof Error ? e.message : "Fotoğraf yüklenemedi.");
      }
      setProgress({ done: i + 1, total: list.length });
    }
    if (skipped > 0) problems.push(`En fazla ${MAX_PHOTOS_PER_CLINIC} fotoğraf olabildiği için ${skipped} fotoğraf eklenmedi.`);
    setProgress(null);
    setError(problems.length ? problems.join(" ") : null);
    if (input.current) input.current.value = "";
  }

  function run(id: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "İşlem yapılamadı.");
      setBusyId(null);
    });
  }

  const uploading = progress !== null;

  return (
    <div className="space-y-6">
      <FormError message={error ?? undefined} />

      {remaining > 0 && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!uploading) void upload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line-strong bg-surface px-6 py-10 text-center transition-colors hover:border-pine hover:bg-pine-soft/40 has-[:focus-visible]:border-pine ${
            uploading ? "pointer-events-none opacity-70" : ""
          }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-pine" aria-hidden />
          ) : (
            <ImagePlus className="h-8 w-8 text-pine" aria-hidden />
          )}
          <span className="text-lg font-semibold">
            {uploading ? `Yükleniyor: ${progress.done} / ${progress.total}` : "Fotoğraf ekle"}
          </span>
          <span className="max-w-[46ch] text-sm text-stone">
            Bilgisayarından ya da telefonundan seç veya buraya sürükle. Birden fazla seçebilirsin; fotoğraflar otomatik küçültülür.
            {` ${remaining} fotoğraf daha ekleyebilirsin.`}
          </span>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(e) => void upload(Array.from(e.target.files ?? []))}
          />
        </label>
      )}

      {photos.length === 0 ? (
        <p className="text-stone">
          Henüz fotoğraf yok. Fotoğraf ekleyene kadar sitede {clinicName} için renkli bir kapak görseli gösteriliyor.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((p, i) => {
            const busy = busyId === p.id;
            return (
              <li key={p.id} className="overflow-hidden rounded-card border border-line bg-surface">
                <div className="relative aspect-[4/3] bg-paper">
                  <Image src={photoUrl(p.id)} alt={`Fotoğraf ${i + 1}`} fill unoptimized sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
                  {i === 0 && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
                      <Star className="h-3.5 w-3.5 fill-lamp text-lamp" aria-hidden />
                      Kapak
                    </span>
                  )}
                  {busy && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <Loader2 className="h-6 w-6 animate-spin text-pine" aria-hidden />
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <button
                    type="button"
                    disabled={busy || i === 0}
                    onClick={() => run(p.id, () => moveClinicPhotoAction(p.id, "left"))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong hover:border-pine hover:text-pine disabled:opacity-40"
                    aria-label={`Fotoğraf ${i + 1}: sola taşı`}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={busy || i === photos.length - 1}
                    onClick={() => run(p.id, () => moveClinicPhotoAction(p.id, "right"))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-strong hover:border-pine hover:text-pine disabled:opacity-40"
                    aria-label={`Fotoğraf ${i + 1}: sağa taşı`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(p.id, () => moveClinicPhotoAction(p.id, "first"))}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-line-strong px-3 text-sm font-semibold hover:border-pine hover:text-pine disabled:opacity-40"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      Kapak yap
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Bu fotoğraf silinsin mi?")) run(p.id, () => deleteClinicPhotoAction(p.id));
                    }}
                    className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-coral/40 px-3 text-sm font-semibold text-coral hover:bg-coral-soft disabled:opacity-40"
                    aria-label={`Fotoğraf ${i + 1}: sil`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Sil
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
