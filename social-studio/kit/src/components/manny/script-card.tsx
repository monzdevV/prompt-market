"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";
import { captionText, plainHook, scriptToText, splitEmphasis } from "@/lib/manny/format";
import type { PlanScript, ScriptStatus } from "@/lib/manny/types";
import { CopyButton } from "./copy-button";

export type ScriptItem = { id: string; source: "plan" | "manny"; status: ScriptStatus; script: PlanScript };

/** El texto grande del primer segundo, como se verá en el vídeo: la palabra clave en amarillo. */
export function Hook({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p aria-label={plainHook(text)} className={`rounded-xl bg-black px-4 py-6 text-center text-[clamp(1.35rem,4.2vw,2rem)] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-white uppercase [text-shadow:0_2px_0_#000] ${className}`}>
      {splitEmphasis(text).map((p, i) => (
        <span key={i} className={p.em ? "text-sub" : ""}>
          {p.text}
        </span>
      ))}
    </p>
  );
}

const Block = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="min-w-0">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted uppercase">{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

/** Lleva «R2» a su receta en la biblioteca. */
function withRecipeLinks(line: string) {
  return line.split(/\b(R[1-8])\b/g).map((t, i) =>
    i % 2 ? (
      <Link key={i} href={`/manny/biblioteca?v=edicion#${t.toLowerCase()}`} className="rounded bg-surface-3 px-1 font-mono text-[12px] text-accent underline-offset-2 hover:underline">
        {t}
      </Link>
    ) : (
      t
    ),
  );
}

/** Cuerpo de un guion: gancho, qué dices, planos, edición y descripción, cada cosa con su botón de copiar. */
export function ScriptBody({ script }: { script: Omit<PlanScript, "id"> & { id?: string } }) {
  return (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <Hook text={script.gancho} />
        <div className="mt-2 flex justify-end">
          <CopyButton text={plainHook(script.gancho)} label="Copiar gancho" className="btn-ghost btn-sm" />
        </div>
      </div>
      <Block title="Qué dices">
        <div className="grid gap-2 border-l border-line-strong pl-3.5 text-[15px] leading-relaxed text-pretty">
          {script.voz.map((v, i) => (
            <p key={i}>{v}</p>
          ))}
        </div>
      </Block>
      <Block title="Planos">
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm marker:text-faint">
          {script.planos.map((p, i) => (
            <li key={i} className="pl-1 text-pretty">
              {p}
            </li>
          ))}
        </ol>
      </Block>
      <Block title="Edición en CapCut">
        <ul className="grid list-disc gap-1.5 pl-5 text-sm marker:text-faint">
          {script.edicion.map((e, i) => (
            <li key={i} className="pl-1 text-pretty">
              {withRecipeLinks(e)}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Descripción" action={<CopyButton text={captionText(script)} label="Copiar" />}>
        <div className="rounded-xl bg-surface-2 p-3.5 text-sm leading-relaxed text-pretty">
          <p>{script.descripcion}</p>
          <p className="mt-2 text-accent">{script.hashtags}</p>
        </div>
      </Block>
      {script.referencia && (
        <p className="text-sm text-muted md:col-span-2">
          Referencia:{" "}
          <a href={script.referencia.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg underline decoration-line-strong underline-offset-4 hover:text-accent">
            {script.referencia.texto} <ExternalLink size={12} aria-hidden />
          </a>
        </p>
      )}
    </div>
  );
}

const STATES: { key: ScriptStatus; label: string }[] = [
  { key: "pendiente", label: "Pendiente" },
  { key: "grabado", label: "Grabado" },
  { key: "publicado", label: "Publicado" },
];

/** Estado del guion: pendiente → grabado → publicado. Cambia al instante y se guarda detrás. */
export function StatusSwitch({ id, status, size = "sm" }: { id: string; status: ScriptStatus; size?: "sm" | "md" }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [last, setLast] = useState(status);
  if (status !== last) {
    // La página se ha refrescado con otro valor (por ejemplo, desde otra pestaña)
    setLast(status);
    setValue(status);
  }

  async function set(next: ScriptStatus) {
    if (next === value) return;
    const prev = value;
    setValue(next);
    try {
      await api(`/api/manny/scripts/${id}`, { body: { status: next } });
      router.refresh();
    } catch (e) {
      setValue(prev);
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    }
  }

  return (
    <div role="group" aria-label="Estado del guion" className="inline-flex rounded-full border border-line-strong bg-bg-2 p-0.5">
      {STATES.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-pressed={value === s.key}
          onClick={() => set(s.key)}
          className={`rounded-full ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} transition-[background-color,color,transform] duration-200 [transition-timing-function:var(--ease)] active:scale-[0.97] ${
            value === s.key ? (s.key === "publicado" ? "bg-ok-soft text-ok" : s.key === "grabado" ? "bg-accent-soft text-accent" : "bg-surface-3 text-fg") : "text-muted hover:text-fg"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Guion plegable con su estado y sus botones. Se usa en «Hoy» y en «Guiones». */
export function ScriptCard({ item, defaultOpen = false }: { item: ScriptItem; defaultOpen?: boolean }) {
  const router = useRouter();
  const { script, status } = item;
  const discarded = status === "descartado";
  const ref = useRef<HTMLDetailsElement>(null);

  // Llegar con #g7 en la dirección abre ese guion y lo deja a la vista
  useEffect(() => {
    const openIfTarget = () => {
      if (window.location.hash === `#${item.id}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: "start" });
      }
    };
    openIfTarget();
    window.addEventListener("hashchange", openIfTarget);
    return () => window.removeEventListener("hashchange", openIfTarget);
  }, [item.id]);

  async function discard(next: ScriptStatus) {
    try {
      await api(`/api/manny/scripts/${item.id}`, { body: { status: next } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    }
  }

  async function remove() {
    try {
      await api(`/api/manny/scripts/${item.id}`, { method: "DELETE" });
      toast.success("Guion borrado");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  return (
    <details ref={ref} id={item.id} open={defaultOpen} className={`group card scroll-mt-24 ${discarded ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none items-center gap-4 p-4 select-none [&::-webkit-details-marker]:hidden">
        <div className="w-14 shrink-0 text-center">
          {script.dia ? (
            <>
              <p className="font-serif text-2xl leading-none">{script.dia}</p>
              <p className="mt-1 font-mono text-[11px] text-muted tabular-nums">{script.hora}</p>
            </>
          ) : (
            <p className="text-xs leading-tight text-faint">Sin día</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-balance group-hover:text-accent">{script.titulo}</p>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
            <span>{script.formato}</span>
            {script.etiquetas.map((t) => (
              <span key={t} className="rounded-full border border-line px-2 py-px">
                {t}
              </span>
            ))}
          </p>
        </div>
        <span className="hidden shrink-0 sm:block" onClick={(e) => e.preventDefault()}>
          {discarded ? <span className="text-xs text-muted">Descartado</span> : <StatusSwitch id={item.id} status={status} />}
        </span>
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 [transition-timing-function:var(--ease)] group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t border-line p-4 pt-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 sm:hidden">{discarded ? <span className="text-xs text-muted">Descartado</span> : <StatusSwitch id={item.id} status={status} />}</div>
        <ScriptBody script={script} />
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <CopyButton text={() => scriptToText(script)} label="Copiar guion entero" className="btn-primary btn-sm" />
          {discarded ? (
            <button type="button" className="btn-ghost btn-sm" onClick={() => discard("pendiente")}>
              Recuperar
            </button>
          ) : (
            <button type="button" className="btn-ghost btn-sm" onClick={() => discard("descartado")}>
              Descartar
            </button>
          )}
          {item.source === "manny" && <ConfirmButton onConfirm={remove}>Borrar</ConfirmButton>}
        </div>
      </div>
    </details>
  );
}
