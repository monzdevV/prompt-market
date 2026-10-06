"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ExternalLink, LoaderCircle, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PlatformDot, StatusPill } from "@/components/ui";
import { api } from "@/lib/client-api";
import type { Platform } from "@/lib/db";

export type CalendarPost = {
  id: number;
  title: string;
  scheduledAt: number;
  status: string;
  targets: { id: number; platform: Platform; account: string; status: string; url: string | null }[];
};

export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  day: number;
  inMonth: boolean;
  today: boolean;
  /** Anterior a hoy: no se puede programar */
  past: boolean;
  posts: CalendarPost[];
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const EDGE: Record<string, string> = {
  scheduled: "border-l-accent",
  publishing: "border-l-warn",
  done: "border-l-ok",
  partial: "border-l-warn",
  failed: "border-l-bad",
};

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
function toLocalInput(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Open = { kind: "day"; day: CalendarDay } | { kind: "post"; post: CalendarPost } | null;

/** Cuadrícula del mes: pasar el ratón resalta el día; un clic en un día abre «Programar»; en un vídeo, su menú. */
export function CalendarGrid({ days }: { days: CalendarDay[] }) {
  const [open, setOpen] = useState<Open>(null);
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <div className="grid min-w-[720px] grid-cols-7">
          {DAYS.map((d) => (
            <div key={d} className="eyebrow border-b border-line px-3 py-2.5">
              {d}
            </div>
          ))}
          {days.map((d) => (
            <div
              key={d.date}
              role={d.past ? undefined : "button"}
              tabIndex={d.past ? undefined : 0}
              aria-label={d.past ? undefined : `Programar el ${longDate(d.date)}`}
              onClick={() => !d.past && setOpen({ kind: "day", day: d })}
              onKeyDown={(e) => {
                if (!d.past && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setOpen({ kind: "day", day: d });
                }
              }}
              className={`group relative min-h-28 border-r border-b border-line p-1.5 transition-colors duration-150 [&:nth-child(7n)]:border-r-0 ${
                d.inMonth ? "" : "bg-bg-2/60"
              } ${d.past ? "" : "cursor-pointer hover:bg-surface-2"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-grid h-6 min-w-6 place-items-center rounded-full px-1 font-mono text-xs ${
                    d.today ? "bg-primary text-primary-fg" : d.inMonth ? "text-fg" : "text-faint"
                  }`}
                >
                  {d.day}
                </span>
                {!d.past && (
                  <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    <Plus size={13} />
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {d.posts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen({ kind: "post", post: p });
                    }}
                    className={`block w-full rounded-md border-l-2 bg-surface-3/70 px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-3 ${EDGE[p.status] ?? "border-l-line-strong"}`}
                  >
                    <span className="font-mono text-[11px] text-muted tabular-nums">{hhmm(p.scheduledAt)}</span>{" "}
                    <span className="line-clamp-1">{p.title}</span>
                    <span className="mt-0.5 flex gap-0.5">
                      {p.targets.map((t) => (
                        <PlatformDot key={t.id} platform={t.platform} size={14} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {open && <Menu open={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Ventana pequeña: programar en un día, o editar un vídeo programado. Se cierra con Escape o fuera. */
function Menu({ open, onClose }: { open: NonNullable<Open>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("a, button, input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const title = open.kind === "day" ? longDate(open.day.date) : open.post.title;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-sm rounded-2xl border border-line-strong bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="display text-2xl leading-tight first-letter:uppercase">{title}</p>
          <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg" aria-label="Cerrar">
            <X size={16} aria-hidden />
          </button>
        </div>
        {open.kind === "day" ? <DayMenu day={open.day} /> : <PostMenu post={open.post} onDone={onClose} />}
      </div>
    </div>
  );
}

function DayMenu({ day }: { day: CalendarDay }) {
  return (
    <div className="space-y-3">
      {day.posts.length > 0 && (
        <p className="text-sm text-muted">
          Ya tienes {day.posts.length} {day.posts.length === 1 ? "publicación" : "publicaciones"} este día.
        </p>
      )}
      <Link href={`/nuevo?fecha=${day.date}`} className="btn-primary w-full">
        <CalendarClock size={15} aria-hidden /> Programar un vídeo este día
      </Link>
      <p className="hint text-center">Eliges la hora exacta en el siguiente paso.</p>
    </div>
  );
}

function PostMenu({ post, onDone }: { post: CalendarPost; onDone: () => void }) {
  const router = useRouter();
  const [when, setWhen] = useState(() => toLocalInput(post.scheduledAt));
  // Mínimo del selector: el momento en que se abrió el menú (no se recalcula en cada render)
  const [minWhen] = useState(() => toLocalInput(Date.now()));
  const [busy, setBusy] = useState<null | "save" | "now" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editable = post.status === "scheduled";

  async function run(kind: "save" | "now" | "delete", fn: () => Promise<unknown>, ok: string) {
    setBusy(kind);
    try {
      await fn();
      toast.success(ok);
      onDone();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo hacer");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <StatusPill status={post.status} />
        <span className="font-mono text-xs text-muted">{hhmm(post.scheduledAt)}</span>
      </div>
      <ul className="space-y-1.5">
        {post.targets.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <PlatformDot platform={t.platform} size={18} />
            <span className="min-w-0 flex-1 truncate">{t.account}</span>
            {t.url ? (
              <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Ver <ExternalLink size={11} aria-hidden />
              </a>
            ) : (
              <StatusPill status={t.status} />
            )}
          </li>
        ))}
      </ul>

      {editable ? (
        <>
          <div>
            <label className="label" htmlFor="cal-when">
              Fecha y hora
            </label>
            <input
              id="cal-when"
              type="datetime-local"
              className="input"
              value={when}
              min={minWhen}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!!busy || toLocalInput(post.scheduledAt) === when}
              onClick={() => {
                const at = new Date(when).getTime();
                if (Number.isNaN(at) || at < Date.now()) return toast.error("Elige una fecha y hora futuras");
                run("save", () => api(`/api/posts/${post.id}`, { body: { action: "reschedule", scheduledAt: at } }), "Hora cambiada");
              }}
            >
              {busy === "save" && <LoaderCircle size={14} className="animate-spin" aria-hidden />} Guardar hora
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!!busy}
              onClick={() => run("now", () => api(`/api/posts/${post.id}`, { body: { action: "publish-now" } }), "Publicando…")}
            >
              {busy === "now" ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />} Publicar ya
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">Esta publicación ya no está programada, así que no se puede cambiar su hora.</p>
      )}

      <div className="flex items-center justify-between border-t border-line pt-3">
        <Link href="/publicaciones" className="text-sm text-muted hover:text-fg">
          Ver en Publicaciones
        </Link>
        {confirmDelete ? (
          <button
            type="button"
            className="btn-danger btn-sm border border-bad/40"
            disabled={!!busy}
            onClick={() => run("delete", () => api(`/api/posts/${post.id}`, { method: "DELETE" }), "Publicación borrada de la app")}
          >
            {busy === "delete" && <LoaderCircle size={12} className="animate-spin" aria-hidden />} Sí, borrar
          </button>
        ) : (
          <button type="button" className="btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={12} aria-hidden /> Borrar
          </button>
        )}
      </div>
    </div>
  );
}
