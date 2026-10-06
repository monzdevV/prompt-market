"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, CircleAlert, CircleCheck, LoaderCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM, PlatformDot } from "@/components/ui";
import { api } from "@/lib/client-api";
import { buildCaption, CAPTION_LIMIT, normalizeHashtags } from "@/lib/core/caption";
import { assignTimes, isoDay, parseSlots, toLocalInput } from "@/lib/core/schedule";
import type { TikTokOptions } from "@/lib/core/tiktok-options";
import type { MediaStatus, Platform } from "@/lib/db";
import { EMPTY_TIKTOK_OPTIONS, TikTokPanel, tiktokProblem, type CreatorState } from "../tiktok-panel";

type AccountLite = { id: number; platform: Platform; name: string; avatar: string | null };
type MediaState = {
  id: string;
  status: MediaStatus;
  durationS: number | null;
  error: string | null;
  ai: { title: string; description: string; hashtags: string[] } | null;
};
type Phase = "waiting" | "uploading" | "processing" | "ready" | "failed" | "scheduled";
type Item = {
  key: string;
  name: string;
  size: number;
  progress: number;
  phase: Phase;
  mediaId: string | null;
  durationS: number | null;
  title: string;
  description: string;
  tags: string;
  /** El usuario ya tocó el texto: la IA no lo pisa */
  edited: boolean;
  /** Hora elegida a mano (si no, la del reparto automático) */
  when: string | null;
  error: string | null;
};

const ACCEPT = ".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm";
const POLL_MS = 3000;


/** Hora actual para comprobar al programar (en el manejador del clic, no durante el render). */
const nowMs = () => Date.now();

const fmtWhen = (v: string) =>
  new Date(v).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function BulkScheduler({ accounts, ai, maxUploadMb }: { accounts: AccountLite[]; ai: boolean; maxUploadMb: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<number[]>(() => accounts.map((a) => a.id));
  const [tiktok, setTiktok] = useState<Record<number, TikTokOptions>>({});
  const [creators, setCreators] = useState<Record<number, CreatorState>>({});
  // Momento de abrir la página: no se recalcula en cada render (las horas pasadas se vuelven a comprobar al programar)
  const [openedAt] = useState(() => Date.now());
  const [start, setStart] = useState(() => isoDay(new Date(openedAt + 24 * 3600_000)));
  const [slotsText, setSlotsText] = useState("10:00, 15:00, 20:00");
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Subidas de una en una: cola de archivos pendientes fuera del estado (no se re-renderiza por ella)
  const files = useRef(new Map<string, File>());
  const queue = useRef<string[]>([]);
  const busy = useRef(false);

  const patch = useCallback((key: string, p: Partial<Item> | ((i: Item) => Partial<Item>)) => {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...(typeof p === "function" ? p(i) : p) } : i)));
  }, []);

  const pump = useCallback(() => {
    // Siguiente archivo de la cola; al terminar (bien o mal) pasa al siguiente
    function next(): void {
      if (busy.current) return;
      const key = queue.current.shift();
      if (!key) return;
      const file = files.current.get(key);
      if (!file) return next();
      busy.current = true;
      patch(key, { phase: "uploading", progress: 0, error: null });
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
      xhr.upload.onprogress = (e) => e.lengthComputable && patch(key, { progress: e.loaded / e.total });
      const done = () => {
        busy.current = false;
        next();
      };
      xhr.onload = () => {
        let body: { id?: string; error?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          // Respuesta sin JSON (p. ej. un proxy cortó la petición)
        }
        if (xhr.status !== 200 || !body.id) patch(key, { phase: "failed", error: body.error ?? `No se pudo subir (error ${xhr.status})` });
        else {
          files.current.delete(key);
          patch(key, { phase: "processing", mediaId: body.id, progress: 1 });
        }
        done();
      };
      xhr.onerror = () => {
        patch(key, { phase: "failed", error: "Se cortó la subida. Pulsa «Reintentar»." });
        done();
      };
      xhr.send(file);
    }
    next();
  }, [patch]);

  function addFiles(list: FileList | File[]) {
    const added: Item[] = [];
    for (const f of Array.from(list)) {
      if (!/\.(mp4|mov|m4v|webm)$/i.test(f.name) && !f.type.startsWith("video/")) {
        toast.error(`${f.name}: no es un vídeo MP4, MOV o WebM`);
        continue;
      }
      if (f.size > maxUploadMb * 1024 * 1024) {
        toast.error(`${f.name}: pesa más de ${maxUploadMb} MB`);
        continue;
      }
      const key = `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`;
      files.current.set(key, f);
      queue.current.push(key);
      added.push({
        key,
        name: f.name,
        size: f.size,
        progress: 0,
        phase: "waiting",
        mediaId: null,
        durationS: null,
        title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 100),
        description: "",
        tags: "",
        edited: false,
        when: null,
        error: null,
      });
    }
    if (!added.length) return;
    setItems((l) => [...l, ...added]);
    pump();
  }

  function retry(key: string) {
    if (!files.current.has(key)) return;
    queue.current.push(key);
    patch(key, { phase: "waiting", error: null });
    pump();
  }

  function remove(key: string) {
    files.current.delete(key);
    queue.current = queue.current.filter((k) => k !== key);
    setItems((l) => l.filter((i) => i.key !== key));
  }

  // Estado del procesado (duración, transcripción e IA) de los vídeos ya subidos
  const processing = items
    .filter((i) => i.phase === "processing" && i.mediaId)
    .map((i) => `${i.key}|${i.mediaId}`)
    .join(",");
  useEffect(() => {
    if (!processing) return;
    const pending = processing.split(",").map((s) => s.split("|") as [string, string]);
    const t = setInterval(async () => {
      for (const [key, id] of pending) {
        try {
          const m = await api<MediaState>(`/api/media/${id}`);
          if (m.status !== "ready" && m.status !== "error") {
            patch(key, { durationS: m.durationS });
            continue;
          }
          patch(key, (i) => {
            const fill = m.ai && !i.edited;
            return {
              phase: "ready",
              durationS: m.durationS,
              // Si la IA falló, el vídeo sirve igual: el texto se escribe a mano
              error: m.status === "error" && ai ? "No se pudo generar el texto: escríbelo tú" : null,
              ...(fill ? { title: m.ai!.title, description: m.ai!.description, tags: m.ai!.hashtags.join(" ") } : {}),
            };
          });
        } catch {
          // Fallo puntual de red: se reintenta en la siguiente vuelta
        }
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [processing, patch, ai]);

  const slots = parseSlots(slotsText);
  const pendingItems = items.filter((i) => i.phase !== "scheduled");
  const auto = assignTimes(pendingItems.length, start, slots, openedAt);
  const whenOf = (i: Item) => i.when ?? auto[pendingItems.indexOf(i)] ?? "";

  const chosen = accounts.filter((a) => selected.includes(a.id));
  const platforms = [...new Set(chosen.map((a) => a.platform))];
  const tiktokAccounts = chosen.filter((a) => a.platform === "tiktok");
  const tiktokIssue = tiktokAccounts
    .map((a) => tiktokProblem(tiktok[a.id] ?? EMPTY_TIKTOK_OPTIONS, creators[a.id] ?? { status: "loading" }, null))
    .find(Boolean);
  const onCreator = useCallback((id: number, s: CreatorState) => setCreators((c) => ({ ...c, [id]: s })), []);

  const rowIssue = (i: Item) => {
    if (i.phase === "waiting" || i.phase === "uploading") return "Subiendo…";
    if (i.phase === "processing") return ai ? "Escribiendo el texto…" : "Procesando…";
    if (i.phase === "failed") return i.error ?? "No se subió";
    if (!whenOf(i)) return "Sin hora: añade más horas o cambia la fecha de inicio";
    if (!i.description.trim()) return `Falta la descripción de «${i.title || i.name}»`;
    const caption = buildCaption(i.description, normalizeHashtags(i.tags.split(/[\s,]+/)));
    const long = platforms.filter((p) => caption.length > CAPTION_LIMIT[p]);
    if (long.length) return `Texto demasiado largo para ${long.map((p) => `${PLATFORM[p].label} (máx. ${CAPTION_LIMIT[p]})`).join(", ")}`;
    return null;
  };
  const blocker = !items.length
    ? "Añade los vídeos"
    : !chosen.length
      ? "Elige al menos una red"
      : !slots.length
        ? "Escribe al menos una hora, por ejemplo 10:00"
        : (tiktokIssue ?? pendingItems.map(rowIssue).find(Boolean) ?? null);

  async function submitAll() {
    if (blocker || sending) return;
    setSending(true);
    let ok = 0;
    for (const i of pendingItems) {
      const at = new Date(whenOf(i)).getTime();
      if (Number.isNaN(at) || at < nowMs()) {
        patch(i.key, { error: "Esa hora ya ha pasado: elige otra" });
        continue;
      }
      try {
        await api("/api/posts", {
          body: {
            mediaId: i.mediaId,
            title: i.title,
            description: i.description,
            hashtags: normalizeHashtags(i.tags.split(/[\s,]+/)),
            // Sin formato: el servidor elige el habitual en cada red según la duración del vídeo
            targets: chosen.map((a) => ({ accountId: a.id, options: a.platform === "tiktok" ? tiktok[a.id] : {} })),
            scheduledAt: at,
          },
        });
        patch(i.key, { phase: "scheduled", error: null, when: whenOf(i) });
        ok++;
      } catch (e) {
        patch(i.key, { error: e instanceof Error ? e.message : "No se pudo programar" });
      }
    }
    setSending(false);
    if (ok) toast.success(`${ok} ${ok === 1 ? "vídeo programado" : "vídeos programados"}`);
  }

  const scheduledCount = items.filter((i) => i.phase === "scheduled").length;

  return (
    <div className="space-y-6">
      <section className="card p-5" aria-labelledby="b-files">
        <h2 id="b-files" className="mb-3 font-semibold">
          1. Vídeos
        </h2>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${
            dragging ? "border-accent bg-surface-2" : "border-line-strong hover:bg-surface-2"
          }`}
        >
          <Upload size={20} className="text-accent" aria-hidden />
          <span className="font-medium">Arrastra aquí todos los vídeos o haz clic para elegirlos</span>
          <span className="hint">
            MP4, MOV o WebM, hasta {maxUploadMb} MB cada uno. {ai ? "La IA escribe el texto de cada uno." : "Escribe el texto de cada uno abajo."}
          </span>
          <input
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      <section className="card p-5" aria-labelledby="b-nets">
        <h2 id="b-nets" className="mb-3 font-semibold">
          2. Redes
        </h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted">
            No tienes redes conectadas que admitan programar.{" "}
            <Link href="/cuentas" className="text-accent underline">
              Conéctalas en Cuentas
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    on ? "border-accent/60 bg-surface-2" : "border-line text-muted hover:bg-surface-2"
                  }`}
                >
                  <PlatformDot platform={a.platform} size={18} />
                  {a.name}
                </button>
              );
            })}
          </div>
        )}
        {tiktokAccounts.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="hint">Las opciones de TikTok se aplican a todos los vídeos del lote.</p>
            {tiktokAccounts.map((a) => (
              <TikTokPanel
                key={a.id}
                accountId={a.id}
                value={tiktok[a.id] ?? EMPTY_TIKTOK_OPTIONS}
                onChange={(o) => setTiktok((t) => ({ ...t, [a.id]: o }))}
                onState={(s) => onCreator(a.id, s)}
                durationS={null}
              />
            ))}
          </div>
        )}
      </section>

      <section className="card p-5" aria-labelledby="b-when">
        <h2 id="b-when" className="mb-3 font-semibold">
          3. Horario
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="b-start">
              Empezar el día
            </label>
            <input id="b-start" type="date" className="input" value={start} min={isoDay(new Date(openedAt))} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="b-slots">
              Horas de cada día
            </label>
            <input id="b-slots" className="input" value={slotsText} onChange={(e) => setSlotsText(e.target.value)} placeholder="10:00, 15:00, 20:00" />
            <p className="hint mt-1">
              {slots.length
                ? `${slots.length} ${slots.length === 1 ? "vídeo" : "vídeos"} al día: ${slots.join(" · ")}`
                : "Escribe las horas separadas por comas"}
            </p>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section aria-labelledby="b-list" className="space-y-3">
          <h2 id="b-list" className="font-semibold">
            {items.length} {items.length === 1 ? "vídeo" : "vídeos"}
            {scheduledCount > 0 && <span className="ml-2 text-sm font-normal text-ok">· {scheduledCount} programados</span>}
          </h2>
          {items.map((i) => {
            const issue = i.phase === "scheduled" ? null : rowIssue(i);
            const busyRow = i.phase === "waiting" || i.phase === "uploading" || i.phase === "processing";
            const locked = i.phase === "scheduled";
            return (
              <article key={i.key} className={`card p-4 ${locked ? "opacity-70" : ""}`}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {locked ? (
                    <CircleCheck size={16} className="text-ok" aria-hidden />
                  ) : busyRow ? (
                    <LoaderCircle size={16} className="animate-spin text-muted" aria-hidden />
                  ) : i.phase === "failed" ? (
                    <CircleAlert size={16} className="text-bad" aria-hidden />
                  ) : (
                    <CalendarClock size={16} className="text-accent" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" title={i.name}>
                    {i.name}
                  </span>
                  {i.phase === "uploading" && <span className="font-mono text-xs text-muted">{Math.round(i.progress * 100)} %</span>}
                  {i.durationS !== null && <span className="font-mono text-xs text-muted">{Math.round(i.durationS)} s</span>}
                  {i.phase === "failed" && (
                    <button type="button" className="btn-ghost btn-sm" onClick={() => retry(i.key)}>
                      Reintentar
                    </button>
                  )}
                  {!locked && (
                    <button type="button" className="btn-danger btn-sm" onClick={() => remove(i.key)} aria-label={`Quitar ${i.name}`}>
                      <Trash2 size={12} aria-hidden />
                    </button>
                  )}
                </div>
                {i.phase === "uploading" && (
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full bg-accent transition-all" style={{ width: `${Math.round(i.progress * 100)}%` }} />
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_14rem]">
                  <div className="space-y-2">
                    <input
                      className="input"
                      aria-label="Título"
                      placeholder="Título"
                      value={i.title}
                      disabled={locked}
                      maxLength={100}
                      onChange={(e) => patch(i.key, { title: e.target.value, edited: true, error: null })}
                    />
                    <input
                      className="input"
                      aria-label="Hashtags"
                      placeholder="hashtags separados por espacios"
                      value={i.tags}
                      disabled={locked}
                      onChange={(e) => patch(i.key, { tags: e.target.value, edited: true, error: null })}
                    />
                  </div>
                  <textarea
                    className="input min-h-[5.5rem]"
                    aria-label="Descripción"
                    placeholder={i.phase === "processing" && ai ? "La IA está escribiendo el texto…" : "Descripción"}
                    value={i.description}
                    disabled={locked}
                    onChange={(e) => patch(i.key, { description: e.target.value, edited: true, error: null })}
                  />
                  <div>
                    <input
                      type="datetime-local"
                      className="input"
                      aria-label="Fecha y hora"
                      value={whenOf(i)}
                      disabled={locked}
                      min={toLocalInput(new Date(openedAt))}
                      onChange={(e) => patch(i.key, { when: e.target.value || null, error: null })}
                    />
                    <p className="hint mt-1">{whenOf(i) ? fmtWhen(whenOf(i)) : "Sin hora"}</p>
                  </div>
                </div>
                {(issue || i.error) && !busyRow && <p className="mt-2 text-xs text-warn">{i.error ?? issue}</p>}
              </article>
            );
          })}
        </section>
      )}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 p-3 backdrop-blur">
        {blocker && pendingItems.length > 0 && <span className="mr-auto text-sm text-muted">{blocker}</span>}
        {scheduledCount > 0 && (
          <Link href="/calendario" className="btn-ghost">
            Ver en el calendario
          </Link>
        )}
        <button type="button" className="btn-primary" disabled={!!blocker || sending || !pendingItems.length} onClick={submitAll}>
          {sending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <CalendarClock size={15} aria-hidden />}
          Programar {pendingItems.length || ""} {pendingItems.length === 1 ? "vídeo" : "vídeos"}
        </button>
      </div>
    </div>
  );
}
