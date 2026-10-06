"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle, RectangleVertical, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { PlatformDot, PLATFORM } from "@/components/ui";
import { api } from "@/lib/client-api";
import { buildCaption, CAPTION_LIMIT, normalizeHashtag, YOUTUBE_TITLE_LIMIT } from "@/lib/core/caption";
import { tiktokConsentText, type TikTokOptions } from "@/lib/core/tiktok-options";
import type { MediaStatus, Platform } from "@/lib/db";
import type { ClientFeatures } from "@/lib/features";
import { EMPTY_TIKTOK_OPTIONS, TikTokPanel, tiktokProblem, type CreatorState } from "./tiktok-panel";
import { defaultFormat, formatDef, formatProblem, FORMATS, shapeOf, type FormatId, type Shape } from "@/lib/core/formats";
import { CoverPicker, EMPTY_COVER, type CoverValue } from "./cover-picker";

/** relayed: conectada a través de Upload-Post (su app de TikTok ya está auditada y admite programar) */
type AccountLite = { id: number; platform: Platform; name: string; avatar: string | null; relayed?: boolean };
type MediaState = {
  id: string;
  status: MediaStatus;
  durationS: number | null;
  transcript: string | null;
  error: string | null;
  ai: { title: string; description: string; keywords: string[]; hashtags: string[]; noSpeech?: boolean } | null;
};

const ACCEPT = ".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm";
const POLL_MS = 2000;
const POLL_GIVE_UP_MS = 45 * 60_000;

const STEPS = [
  { key: "upload", label: "Subir vídeo" },
  { key: "transcribing", label: "Transcribir el audio" },
  { key: "generating", label: "Escribir título, descripción y hashtags" },
  { key: "ready", label: "Listo para publicar" },
] as const;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stepIndex(media: MediaState | null) {
  if (!media) return 0;
  if (media.status === "queued" || media.status === "transcribing") return media.transcript === null ? 1 : 2;
  if (media.status === "generating") return 2;
  if (media.status === "ready") return 3;
  return media.transcript === null ? 1 : 2;
}

/** Hora por defecto al llegar desde el calendario: la próxima hora en punto si es hoy, las 10:00 si es otro día. */
function initialWhen(date: string | undefined) {
  const now = new Date();
  if (!date) return toLocalInput(new Date(Date.now() + 3600_000));
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d, 10, 0);
  if (target.toDateString() === now.toDateString() || target < now) {
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 0, 0);
    return toLocalInput(next);
  }
  return toLocalInput(target);
}

export function Composer({
  ai,
  initialDate,
  accounts,
  maxUploadMb,
  features,
}: {
  /** El plan incluye IA (Pro/Business). En Free el vídeo queda listo al subirlo y el texto se escribe a mano. */
  ai: boolean;
  /** Día elegido en el calendario (YYYY-MM-DD): se abre en «Programar» con esa fecha */
  initialDate?: string;
  accounts: AccountLite[];
  maxUploadMb: number;
  features: ClientFeatures;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [media, setMedia] = useState<MediaState | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [edited, setEdited] = useState(false);
  const [selected, setSelected] = useState<number[]>(() => accounts.filter((a) => a.platform !== "tiktok").map((a) => a.id));
  const [tiktok, setTiktok] = useState<Record<number, TikTokOptions>>({});
  const [creators, setCreators] = useState<Record<number, CreatorState>>({});
  // Formato por cuenta (Short, Reel, Historia…); sin elegir = el habitual según la duración
  const [formats, setFormats] = useState<Record<number, FormatId>>({});
  const [cover, setCover] = useState<CoverValue>(EMPTY_COVER);
  const [coverBusy, setCoverBusy] = useState(false);
  // Duración leída del propio vídeo en el navegador (sin IA no hay transcripción que la mida)
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  // Forma del vídeo (vertical, cuadrado u horizontal): YouTube solo hace Short de verticales o cuadrados
  const [shape, setShape] = useState<Shape | null>(null);
  const [converting, setConverting] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [modeChoice, setMode] = useState<"now" | "schedule">(initialDate ? "schedule" : "now");
  const [when, setWhen] = useState(() => initialWhen(initialDate));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const awaitingCopy = useRef(true);
  const currentMediaId = useRef<string | null>(null);

  // Salir de la página cancela una subida en curso
  useEffect(() => () => xhrRef.current?.abort(), []);

  // Libera la URL de previsualización al cambiar de vídeo o salir
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const editedRef = useRef(false);
  useEffect(() => {
    editedRef.current = edited;
  }, [edited]);

  /** Aplica el estado del vídeo y, cuando la IA termina, rellena los campos (sin pisar lo que el usuario escribió). */
  const applyMedia = useCallback((next: MediaState) => {
    setMedia(next);
    if (next.status !== "ready" || !next.ai || !awaitingCopy.current) return;
    awaitingCopy.current = false;
    const ai = next.ai;
    if (editedRef.current) {
      setTitle((t) => t || ai.title);
      setDescription((d) => d || ai.description);
      setHashtags((h) => (h.length ? h : ai.hashtags));
    } else {
      setTitle(ai.title);
      setDescription(ai.description);
      setHashtags(ai.hashtags);
    }
    toast.success(ai.noSpeech ? "El vídeo no tiene voz: revisa el texto propuesto" : "Texto SEO listo. Revísalo antes de publicar.");
  }, []);

  // Consulta el estado de la transcripción / IA hasta que termine
  const mediaId = media?.id;
  const mediaStatus = media?.status;
  useEffect(() => {
    if (!mediaId || mediaStatus === "ready" || mediaStatus === "error") return;
    const started = Date.now();
    let cancelled = false;
    const t = setInterval(async () => {
      if (Date.now() - started > POLL_GIVE_UP_MS) {
        clearInterval(t);
        setError("El procesado está tardando mucho. Recarga la página más tarde o reintenta.");
        return;
      }
      try {
        const next = await api<MediaState>(`/api/media/${mediaId}`);
        // Ignora respuestas de un vídeo que el usuario ya ha descartado
        if (!cancelled && currentMediaId.current === next.id) applyMedia(next);
      } catch {
        // Fallo puntual de red: el siguiente intervalo lo vuelve a intentar
      }
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [mediaId, mediaStatus, applyMedia]);

  /**
   * Crea la versión vertical (9:16) en el servidor y, cuando está lista, pasa a usarla: el vídeo de la
   * vista previa, los formatos y la portada pasan a ser los del vertical. El texto escrito se conserva.
   */
  async function toVertical() {
    if (!media) return;
    setConverting(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>(`/api/media/${media.id}/vertical`, { body: {} });
      const started = Date.now();
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const next = await api<MediaState>(`/api/media/${id}`);
        if (next.status === "error") throw new Error(next.error ?? "No se pudo convertir el vídeo");
        if (next.status === "ready") {
          currentMediaId.current = id;
          setMedia(next);
          setPreview(`/api/media/${id}/file`);
          setShape(null);
          setFormats({});
          setCover(EMPTY_COVER);
          toast.success("Versión vertical lista");
          break;
        }
        if (Date.now() - started > 30 * 60_000) throw new Error("La conversión está tardando mucho. Prueba más tarde.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo convertir el vídeo");
    } finally {
      setConverting(false);
    }
  }

  function reset() {
    xhrRef.current?.abort();
    currentMediaId.current = null;
    setUploadFailed(false);
    setFile(null);
    setPreview(null);
    setShape(null);
    setPreviewDuration(null);
    setCover(EMPTY_COVER);
    setFormats({});
    setMedia(null);
    setProgress(0);
    setTitle("");
    setDescription("");
    setHashtags([]);
    setEdited(false);
    setError(null);
    awaitingCopy.current = true;
  }

  function pick(f: File | undefined) {
    if (!f) return;
    if (!/\.(mp4|mov|m4v|webm)$/i.test(f.name)) return setError("Formato no admitido. Usa MP4, MOV o WebM.");
    if (f.size > maxUploadMb * 1024 * 1024) return setError(`El vídeo pesa ${(f.size / 1024 / 1024).toFixed(0)} MB y el máximo es ${maxUploadMb} MB.`);
    setError(null);
    setMedia(null);
    currentMediaId.current = null;
    awaitingCopy.current = true;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    upload(f);
  }

  function upload(f: File) {
    setProgress(0);
    setUploadFailed(false);
    setError(null);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
    xhr.setRequestHeader("x-filename", encodeURIComponent(f.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { id?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Respuesta sin JSON (p. ej. un proxy cortó la petición)
      }
      if (xhr.status !== 200 || !body.id) {
        setError(body.error ?? `No se pudo subir el vídeo (error ${xhr.status})`);
        // Formato o tamaño no válidos: hay que elegir otro archivo; si no, se puede reintentar
        if (xhr.status === 400 || xhr.status === 413) setFile(null);
        else setUploadFailed(true);
        return;
      }
      currentMediaId.current = body.id;
      setMedia({ id: body.id, status: "queued", durationS: null, transcript: null, error: null, ai: null });
    };
    xhr.onerror = () => {
      setError("Se cortó la subida. Revisa tu conexión e inténtalo de nuevo.");
      setUploadFailed(true);
    };
    xhr.send(f);
  }

  async function regenerate() {
    if (!media) return;
    try {
      awaitingCopy.current = true;
      applyMedia(await api<MediaState>(`/api/media/${media.id}`, { method: "POST" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo regenerar");
    }
  }

  function addTag() {
    const t = normalizeHashtag(tagInput);
    if (t && !hashtags.some((h) => h.toLowerCase() === t.toLowerCase())) {
      setHashtags([...hashtags, t]);
      setEdited(true);
    }
    setTagInput("");
  }

  const onCreatorState = useCallback((id: number, state: CreatorState) => setCreators((c) => ({ ...c, [id]: state })), []);

  const selectedAccounts = accounts.filter((a) => selected.includes(a.id));
  const selectedTiktok = selectedAccounts.filter((a) => a.platform === "tiktok");
  const hasTiktok = selectedTiktok.length > 0;
  // Con la conexión directa de TikTok aún no se programa: con esa cuenta elegida siempre es "Publicar ahora"
  const scheduleBlocked = selectedTiktok.some((a) => !a.relayed) && !features.tiktokScheduling;
  const mode = scheduleBlocked ? "now" : modeChoice;
  const caption = buildCaption(description, hashtags);
  const platforms = [...new Set(selectedAccounts.map((a) => a.platform))];
  const overLimit = platforms.filter((p) => caption.length > CAPTION_LIMIT[p]);
  const tiktokIssue = selectedTiktok
    .map((a) => tiktokProblem(tiktok[a.id] ?? EMPTY_TIKTOK_OPTIONS, creators[a.id] ?? { status: "loading" }, media?.durationS ?? null))
    .find(Boolean);
  const durationS = media?.durationS ?? previewDuration;
  const formatOf = (a: AccountLite) => formats[a.id] ?? defaultFormat(a.platform, durationS, shape);
  const formatIssue = selectedAccounts.map((a) => formatProblem(a.platform, formatOf(a), durationS, PLATFORM[a.platform].label, shape)).find(Boolean);
  // Qué redes elegidas usan portada, y de qué tipo (según el formato)
  const coverUse = (kind: "image" | "frame") => [
    ...new Set(
      selectedAccounts
        .filter((a) => formatDef(a.platform, formatOf(a))?.cover === kind)
        .map((a) => `${PLATFORM[a.platform].label} (${formatDef(a.platform, formatOf(a))!.label})`),
    ),
  ];
  const usesImage = coverUse("image");
  const usesFrame = coverUse("frame");
  const busy = !!media && (media.status === "queued" || media.status === "transcribing" || media.status === "generating");
  const current = stepIndex(media);
  const blocker = !media
    ? "Espera a que termine la subida"
    : !description.trim()
      ? "Escribe o genera una descripción"
      : title.length > YOUTUBE_TITLE_LIMIT
        ? `El título no puede pasar de ${YOUTUBE_TITLE_LIMIT} caracteres`
      : !selected.length
        ? "Elige al menos una red"
        : overLimit.length
          ? `El texto es demasiado largo para ${overLimit.map((p) => PLATFORM[p].label).join(", ")}`
          : coverBusy
            ? "Guardando la portada…"
            : (formatIssue ?? tiktokIssue);

  async function submit() {
    if (!media || blocker) return;
    const scheduledAt = mode === "now" ? null : new Date(when).getTime();
    if (scheduledAt !== null && (Number.isNaN(scheduledAt) || scheduledAt < Date.now())) {
      setError("Elige una fecha y hora futuras");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api("/api/posts", {
        body: {
          mediaId: media.id,
          title,
          description,
          hashtags,
          targets: selectedAccounts.map((a) => ({
            accountId: a.id,
            options: a.platform === "tiktok" ? tiktok[a.id] : { format: formatOf(a) },
          })),
          scheduledAt,
          cover: cover.source ? { id: cover.imageId, offsetMs: cover.offsetMs } : undefined,
        },
      });
      toast.success(mode === "now" ? "Publicando en tus redes…" : "Publicación programada");
      router.push(mode === "now" ? "/publicaciones" : "/calendario");
      router.refresh();
    } catch (e) {
      setSending(false);
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  if (!file) {
    return (
      <div>
        <button
          type="button"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`card group flex w-full flex-col items-center justify-center gap-4 overflow-hidden border-dashed px-6 py-24 text-center transition-[border-color,background-color] duration-300 ${
            dragging ? "border-accent bg-accent-soft" : "border-line-strong hover:border-accent/50"
          }`}
        >
          {/* Halo que se enciende al pasar por encima o al arrastrar */}
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl transition-opacity duration-500 ${
              dragging ? "opacity-100" : "opacity-0 group-hover:opacity-70"
            }`}
          />
          <span className="relative grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-accent transition-transform duration-300 group-hover:-translate-y-1">
            <Upload size={22} aria-hidden />
          </span>
          <span className="display relative text-3xl">{dragging ? "Suéltalo aquí" : "Arrastra tu vídeo"}</span>
          <span className="relative text-sm text-muted">o haz clic para elegirlo del ordenador</span>
          <span className="relative font-mono text-[11px] tracking-wider text-faint uppercase">
            MP4 · MOV · WebM · hasta {maxUploadMb} MB
          </span>
          {initialDate && (
            <span className="relative mt-1 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-xs text-accent">
              Se programará para el{" "}
              {new Date(`${initialDate}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} · eliges la hora después
            </span>
          )}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
        {error && (
          <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg bg-bad-soft p-3 text-sm text-bad">
            <CircleAlert size={16} aria-hidden /> {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <div className="card overflow-hidden">
          {preview && (
            <video
              src={preview}
              controls
              className="aspect-[9/16] max-h-[520px] w-full bg-black object-contain"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (Number.isFinite(v.duration)) setPreviewDuration(v.duration);
                setShape(shapeOf(v.videoWidth, v.videoHeight));
              }}
            />
          )}
          <div className="flex items-center gap-2 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="hint">
                {(file.size / 1024 / 1024).toFixed(1)} MB{durationS ? ` · ${Math.round(durationS)} s` : ""}
                {shape ? ` · ${shape === "vertical" ? "vertical" : shape === "square" ? "cuadrado" : "horizontal"}` : ""}
              </p>
            </div>
            <ConfirmButton onConfirm={reset} className="btn-ghost btn-sm" confirmLabel="¿Descartar?">
              <X size={12} aria-hidden /> Cambiar
            </ConfirmButton>
          </div>
          {shape === "horizontal" && media && !busy && (
            <div className="border-t border-line p-3 text-sm">
              <p className="text-muted">
                Es horizontal: para Shorts, Reels e historias hace falta vertical. Podemos crear una versión 9:16 con el vídeo centrado y un
                fondo desenfocado.
              </p>
              <button type="button" onClick={toVertical} disabled={converting} className="btn-ghost btn-sm mt-2">
                {converting ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <RectangleVertical size={12} aria-hidden />}
                {converting ? "Convirtiendo… (unos segundos por cada segundo de vídeo)" : "Convertir a vertical 9:16"}
              </button>
            </div>
          )}
        </div>

        {!ai && (
          <div className="card space-y-1.5 p-4 text-sm">
            <p className="flex items-center gap-1.5 font-medium">
              <Sparkles size={14} aria-hidden className="text-accent" /> Escribe el texto con IA
            </p>
            <p className="text-muted">
              Tu plan Free incluye todo menos la IA. Con Pro y Business transcribimos tu vídeo y la IA escribe el título, la descripción SEO y 4 hashtags a
              partir de lo que dices.
            </p>
            <a href="/precios" className="font-medium text-accent underline">
              Ver planes
            </a>
          </div>
        )}

        <ol className="card space-y-3 p-4 text-sm" aria-label="Progreso">
          {(ai ? STEPS : STEPS.filter((s) => s.key === "upload" || s.key === "ready")).map((s, i) => {
            const failed = media?.status === "error" && i === current;
            const done = i < current || media?.status === "ready";
            const active = i === current && !done && !failed;
            return (
              <li key={s.key} className="flex items-start gap-2.5" aria-current={active ? "step" : undefined}>
                <span
                  className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                    failed ? "bg-bad-strong text-white" : done ? "bg-ok-strong text-white" : active ? "bg-accent-strong text-white" : "bg-surface-2 text-muted"
                  }`}
                >
                  {failed ? "!" : done ? <Check size={12} aria-hidden /> : active ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className={done || active || failed ? "" : "text-muted"}>{s.label}</span>
                  {s.key === "upload" && !media && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Progreso de la subida" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-accent-strong transition-[width]" style={{ width: `${progress * 100}%` }} />
                    </div>
                  )}
                  {active && s.key === "transcribing" && <p className="hint mt-0.5">Puede tardar un par de minutos según la duración.</p>}
                </div>
              </li>
            );
          })}
          {uploadFailed && !media && (
            <li className="rounded-lg bg-bad-soft p-2.5 text-bad">
              {error}
              <button onClick={() => upload(file)} className="mt-2 block font-medium underline">
                Reintentar la subida
              </button>
            </li>
          )}
          {media?.status === "error" && (
            <li role="alert" className="rounded-lg bg-bad-soft p-2.5 text-bad">
              {media.error}
              {/* Sin clave de IA reintentar no sirve: se puede escribir el texto a mano (o partir de la transcripción) */}
              {/ANTHROPIC_API_KEY|clave de la IA/.test(media.error ?? "") ? (
                <span className="mt-2 block text-fg">
                  Puedes escribir tú el texto y publicar igualmente.
                  {!!media.transcript && !description.trim() && (
                    <button
                      onClick={() => {
                        setDescription(media.transcript!.slice(0, 2000));
                        setEdited(true);
                      }}
                      className="mt-1 block font-medium underline"
                    >
                      Usar la transcripción como descripción
                    </button>
                  )}
                </span>
              ) : !ai ? (
                // Free no incluye IA: reintentar daría 402; el texto se escribe a mano
                <span className="mt-2 block text-fg">
                  Tu plan no incluye la IA: escribe tú el texto y publica igualmente.{" "}
                  <a href="/precios" className="font-medium underline">
                    Ver planes con IA
                  </a>
                </span>
              ) : (
                <button onClick={regenerate} className="mt-2 block font-medium underline">
                  Reintentar
                </button>
              )}
            </li>
          )}
        </ol>

        {!!media?.transcript && (
          <div className="card p-4 text-sm">
            <button onClick={() => setShowTranscript(!showTranscript)} aria-expanded={showTranscript} className="font-medium">
              {showTranscript ? "Ocultar" : "Ver"} transcripción
            </button>
            {showTranscript && <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-muted">{media.transcript}</p>}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Texto de la publicación</h2>
            {!ai ? (
              <a
                href="/precios"
                className="btn-ghost btn-sm"
                title="Tu plan Free incluye todo menos la IA. La transcripción y el texto con IA están en Pro y Business."
              >
                <Sparkles size={12} aria-hidden /> Escribir con IA (Pro y Business)
              </a>
            ) : edited ? (
              <ConfirmButton onConfirm={regenerate} disabled={!media || busy} className="btn-ghost btn-sm" confirmLabel="Se perderán tus cambios. ¿Seguro?">
                <Sparkles size={12} aria-hidden /> Regenerar con IA
              </ConfirmButton>
            ) : (
              <button onClick={regenerate} disabled={!media || busy || media.status === "error"} className="btn-ghost btn-sm">
                {busy ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <Sparkles size={12} aria-hidden />}
                {busy ? "La IA está escribiendo…" : "Regenerar con IA"}
              </button>
            )}
          </div>

          {media?.ai?.noSpeech && (
            <p className="rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
              No hemos detectado voz en el vídeo: el texto se basa en tu sector y el nombre del archivo. Revísalo.
            </p>
          )}

          <div>
            <label className="label" htmlFor="title">
              Título <span className="font-normal text-muted">(YouTube)</span>
            </label>
            <input
              id="title"
              className="input"
              value={title}
              maxLength={100}
              placeholder={busy ? "Generando…" : "Título del vídeo"}
              onChange={(e) => {
                setTitle(e.target.value);
                setEdited(true);
              }}
            />
            <p className="hint mt-1 text-right tabular-nums">{title.length}/100</p>
          </div>

          <div>
            <label className="label" htmlFor="desc">
              Descripción SEO
            </label>
            <textarea
              id="desc"
              rows={5}
              className="input resize-y"
              value={description}
              placeholder={busy ? "Generando…" : "Escribe o genera la descripción"}
              onChange={(e) => {
                setDescription(e.target.value);
                setEdited(true);
              }}
            />
          </div>

          <div>
            <label className="label" htmlFor="tag-input">
              Hashtags
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {hashtags.map((h) => (
                <span key={h} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pr-1 pl-2.5 text-sm text-accent">
                  #{h}
                  <button
                    type="button"
                    aria-label={`Quitar #${h}`}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent/15"
                    onClick={() => {
                      setHashtags(hashtags.filter((x) => x !== h));
                      setEdited(true);
                    }}
                  >
                    <X size={12} aria-hidden />
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                className="input w-44"
                placeholder="Añadir y pulsar Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onBlur={addTag}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
            </div>
          </div>

          {!!media?.ai?.keywords?.length && (
            <div>
              <span className="label">Palabras clave detectadas</span>
              <p className="text-sm text-muted">{media.ai.keywords.join(" · ")}</p>
            </div>
          )}

          {platforms.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs" aria-label="Longitud por red">
              {platforms.map((p) => (
                <li key={p} className={`tabular-nums ${caption.length > CAPTION_LIMIT[p] ? "font-medium text-bad" : "text-muted"}`}>
                  {PLATFORM[p].label}: {caption.length}/{CAPTION_LIMIT[p]}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Dónde publicar</h2>
          {accounts.length === 0 && <p className="text-sm text-muted">No hay cuentas conectadas.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {accounts.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  selected.includes(a.id) ? "border-accent bg-accent-soft/60" : "border-line hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(a.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, a.id] : selected.filter((x) => x !== a.id))}
                />
                <PlatformDot platform={a.platform} />
                <span className="truncate">{a.name}</span>
              </label>
            ))}
          </div>
          {selectedAccounts
            .filter((a) => (FORMATS[a.platform]?.length ?? 0) > 1)
            .map((a) => {
              const current = formatOf(a);
              const def = formatDef(a.platform, current);
              const problem = formatProblem(a.platform, current, durationS, PLATFORM[a.platform].label, shape);
              return (
                <div key={a.id} className="rounded-lg border border-line p-3 text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <PlatformDot platform={a.platform} />
                    <span className="truncate font-medium">{a.name}</span>
                    <span className="text-muted">· publicar como</span>
                  </div>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Formato en ${PLATFORM[a.platform].label}`}>
                    {FORMATS[a.platform]!.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        role="radio"
                        aria-checked={current === f.id}
                        onClick={() => setFormats((x) => ({ ...x, [a.id]: f.id }))}
                        className={`btn-sm ${current === f.id ? "btn-primary" : "btn-ghost"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  {def?.hint && <p className="hint mt-2">{def.hint}</p>}
                  {problem && <p className="mt-1 text-bad">{problem}</p>}
                </div>
              );
            })}
          {selectedTiktok.map((a) => (
            <TikTokPanel
              key={a.id}
              accountId={a.id}
              value={tiktok[a.id] ?? EMPTY_TIKTOK_OPTIONS}
              onChange={(o) => setTiktok((t) => ({ ...t, [a.id]: o }))}
              onState={(state) => onCreatorState(a.id, state)}
              durationS={media?.durationS ?? null}
            />
          ))}
        </section>

        {preview && (usesImage.length > 0 || usesFrame.length > 0) && (
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Portada</h2>
            <CoverPicker
              videoUrl={preview}
              value={cover}
              onChange={setCover}
              onBusy={setCoverBusy}
              usesImage={usesImage}
              usesFrame={usesFrame}
            />
          </section>
        )}

        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Cuándo</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cuándo publicar">
            <button type="button" role="radio" aria-checked={mode === "now"} onClick={() => setMode("now")} className={mode === "now" ? "btn-primary" : "btn-ghost"}>
              Publicar ahora
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "schedule"}
              disabled={scheduleBlocked}
              onClick={() => setMode("schedule")}
              className={mode === "schedule" ? "btn-primary" : "btn-ghost"}
            >
              Programar
            </button>
          </div>
          {scheduleBlocked && <p className="hint">TikTok solo permite publicar al momento. Para programar, quita TikTok de las redes.</p>}
          {mode === "schedule" && (
            <div>
              <label className="label" htmlFor="when">
                Fecha y hora <span className="font-normal text-muted">(hora de tu dispositivo)</span>
              </label>
              <input id="when" type="datetime-local" className="input max-w-xs" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
            </div>
          )}
        </section>

        {hasTiktok && (
          <p className="text-right text-xs text-muted">{tiktokConsentText(tiktok[selectedTiktok[0].id] ?? EMPTY_TIKTOK_OPTIONS)}</p>
        )}

        {error && media && (
          <p role="alert" className="rounded-lg bg-bad-soft p-3 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {blocker && !sending && <p className="text-sm text-muted">{blocker}</p>}
          <button onClick={submit} disabled={!!blocker || sending} className="btn-primary px-5">
            {sending && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
            {sending ? "Guardando…" : mode === "now" ? `Publicar en ${selected.length} ${selected.length === 1 ? "red" : "redes"}` : "Programar publicación"}
          </button>
        </div>
      </div>
    </div>
  );
}
