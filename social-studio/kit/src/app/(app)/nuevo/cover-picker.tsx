"use client";

import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, X } from "lucide-react";

export type CoverValue = {
  /** Imagen subida (/api/covers): fotograma capturado o imagen propia */
  imageId: string | null;
  /** Fotograma elegido, en ms (Instagram Reels y TikTok solo admiten esto) */
  offsetMs: number | null;
  previewUrl: string | null;
  source: "frame" | "image" | null;
};

export const EMPTY_COVER: CoverValue = { imageId: null, offsetMs: null, previewUrl: null, source: null };

const MAX_BYTES = 2 * 1024 * 1024;

async function uploadCover(blob: Blob): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/covers", { method: "POST", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
  } catch {
    throw new Error("Sin conexión con el servidor");
  }
  const data = (await res.json().catch(() => null)) as { coverId?: string; error?: string } | null;
  if (!res.ok || !data?.coverId) throw new Error(data?.error || `Error ${res.status}`);
  return data.coverId;
}

/** Captura el fotograma actual del vídeo como JPEG (máx. 1280 px de ancho para no pasar de 2 MB). */
async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || 720) * scale);
  canvas.height = Math.round((video.videoHeight || 1280) * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("No se pudo sacar una imagen del vídeo");
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
};

/**
 * Portada: el usuario mueve el vídeo hasta el fotograma que quiere, o sube una imagen.
 * - Fotograma: se guarda el instante (Instagram, TikTok) y una captura JPEG (YouTube, Facebook).
 * - Imagen propia: solo la aceptan YouTube y el vídeo de Facebook; Instagram y TikTok usan su portada por defecto.
 */
export function CoverPicker({
  videoUrl,
  value,
  onChange,
  onBusy,
  usesImage,
  usesFrame,
}: {
  videoUrl: string;
  value: CoverValue;
  onChange: (v: CoverValue) => void;
  onBusy: (busy: boolean) => void;
  usesImage: string[];
  usesFrame: string[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [atMs, setAtMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    onBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la portada");
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }

  const pickFrame = () =>
    run(async () => {
      const video = videoRef.current;
      if (!video) return;
      const blob = await captureFrame(video);
      // Se sube siempre: si luego marcas YouTube o Facebook, ya tienen su imagen
      const imageId = await uploadCover(blob);
      if (value.previewUrl) URL.revokeObjectURL(value.previewUrl);
      onChange({ imageId, offsetMs: Math.round(video.currentTime * 1000), previewUrl: URL.createObjectURL(blob), source: "frame" });
    });

  const pickImage = (file: File | undefined) =>
    run(async () => {
      if (!file) return;
      if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error("Tiene que ser una imagen JPG o PNG");
      if (file.size > MAX_BYTES) throw new Error("La imagen no puede pasar de 2 MB (límite de YouTube)");
      const imageId = await uploadCover(file);
      if (value.previewUrl) URL.revokeObjectURL(value.previewUrl);
      onChange({ imageId, offsetMs: null, previewUrl: URL.createObjectURL(file), source: "image" });
    });

  function clear() {
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange(EMPTY_COVER);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_1fr]">
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          playsInline
          preload="auto"
          className="aspect-[9/16] w-full rounded-lg bg-black object-contain"
          onLoadedMetadata={(e) => setDurationMs(Math.floor(e.currentTarget.duration * 1000) || 0)}
          aria-label="Vista del fotograma elegido"
        />
        <div className="space-y-3 text-sm">
          <div>
            <label className="label" htmlFor="cover-at">
              Fotograma <span className="font-normal text-muted tabular-nums">{fmt(atMs)}</span>
            </label>
            <input
              id="cover-at"
              type="range"
              className="w-full"
              min={0}
              max={Math.max(durationMs - 100, 0)}
              step={100}
              value={atMs}
              disabled={!durationMs || busy}
              onChange={(e) => {
                const ms = Number(e.target.value);
                setAtMs(ms);
                if (videoRef.current) videoRef.current.currentTime = ms / 1000;
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost btn-sm" disabled={!durationMs || busy} onClick={pickFrame}>
              {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
              Usar este fotograma
            </button>
            <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <ImageUp size={14} aria-hidden />
              Subir imagen
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
          </div>

          {value.source ? (
            <div className="flex items-center gap-3 rounded-lg bg-surface-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL local del navegador (blob:) */}
              {value.previewUrl && <img src={value.previewUrl} alt="Portada elegida" className="h-16 w-auto rounded object-cover" />}
              <span className="flex-1">
                {value.source === "frame" ? `Fotograma ${fmt(value.offsetMs ?? 0)}` : "Imagen propia"}
              </span>
              <button type="button" className="btn-ghost btn-sm" onClick={clear} aria-label="Quitar portada">
                <X size={14} aria-hidden />
              </button>
            </div>
          ) : (
            <p className="hint">Sin elegir: cada red pone su portada automática.</p>
          )}

          <ul className="hint space-y-1">
            {usesImage.length > 0 && <li>Imagen (fotograma o propia): {usesImage.join(", ")}.</li>}
            {usesFrame.length > 0 && (
              <li>Solo fotograma del vídeo: {usesFrame.join(", ")}{value.source === "image" ? " (con imagen propia usarán su portada automática)" : ""}.</li>
            )}
          </ul>
          {error && (
            <p role="alert" className="text-bad">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
