"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/confirm-button";
import { api } from "@/lib/client-api";
import type { IdeaRow, IdeaStatus } from "@/lib/manny/ideas";
import { Hook } from "./script-card";

const TOPICS = ["Espalda", "Pierna", "Mitos", "Físico", "Reto con un colega", "Creatina"];
const COUNTS = [3, 6, 10];

/** Pide ideas nuevas. Tarda: se muestra cuánto lleva, sin inventar fases. */
export function IdeasGenerator({ hasRadar }: { hasRadar: boolean }) {
  const router = useRouter();
  const [tema, setTema] = useState("");
  const [cuantas, setCuantas] = useState(6);
  const [desdeRadar, setDesdeRadar] = useState(hasRadar);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSecs(0);
    setError(null);
    try {
      await api("/api/manny/ideas", { body: { tema, cuantas, desdeRadar } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No he podido escribir las ideas");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} aria-busy={busy}>
      <label htmlFor="idea-tema" className="label">
        ¿De qué quieres ideas?
      </label>
      <input id="idea-tema" value={tema} onChange={(e) => setTema(e.target.value)} disabled={busy} maxLength={300} placeholder="Déjalo vacío y elijo yo lo que más te conviene" className="input h-12 text-[15px]" />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Temas sugeridos">
        {TOPICS.map((t) => (
          <button key={t} type="button" disabled={busy} aria-pressed={tema === t} onClick={() => setTema(tema === t ? "" : t)} className={tema === t ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <fieldset className="flex items-center gap-2" disabled={busy}>
          <legend className="sr-only">Cuántas ideas</legend>
          <span className="text-sm text-muted" aria-hidden>
            Cuántas
          </span>
          <div className="inline-flex rounded-full border border-line-strong bg-bg-2 p-0.5">
            {COUNTS.map((n) => (
              <button key={n} type="button" aria-pressed={cuantas === n} onClick={() => setCuantas(n)} className={`rounded-full px-3 py-1 text-sm tabular-nums transition-[background-color,color] duration-200 ${cuantas === n ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"}`}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <label className={`flex items-start gap-2.5 text-sm ${hasRadar ? "cursor-pointer" : "opacity-60"}`}>
          <input type="checkbox" checked={desdeRadar} disabled={busy || !hasRadar} onChange={(e) => setDesdeRadar(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>
            Basarme en el radar
            <span className="hint block">{hasRadar ? "Parto de los vídeos que más están reventando." : "Aún no hay vídeos que revienten en tu radar."}</span>
          </span>
        </label>
        <button type="submit" disabled={busy} className="btn-primary h-11 px-5 sm:ml-auto">
          {busy ? (
            <>
              <LoaderCircle size={16} aria-hidden className="animate-spin" /> Escribiendo…
            </>
          ) : (
            <>
              <Wand2 size={16} aria-hidden /> Dame ideas
            </>
          )}
        </button>
      </div>

      {busy && (
        <div role="status" className="mt-5 rounded-xl border border-line bg-surface-2/60 p-4">
          <p className="text-sm font-medium">Escribiendo tus ideas. Suele tardar entre 30 y 90 segundos.</p>
          <p className="mt-1 font-mono text-xs text-muted tabular-nums">Llevo {secs} s · no cierres esta pestaña</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-bad/40 bg-bad-soft p-4 text-sm text-bad text-pretty">
          {error}
        </p>
      )}
    </form>
  );
}

const FILTERS: { key: IdeaStatus; label: string }[] = [
  { key: "nueva", label: "Nuevas" },
  { key: "guardada", label: "Guardadas" },
  { key: "guion", label: "En guion" },
  { key: "descartada", label: "Descartadas" },
];
const LEVEL = ["Fácil", "Media", "Difícil"];
const WHERE = { gym: "Se graba en el gym", casa: "Se graba en casa", fotos: "Fotos", cualquier: "Se graba donde sea" } as const;

/** Banco de ideas con filtro por estado (en el navegador) y sus acciones. */
export function IdeasBoard({ ideas }: { ideas: IdeaRow[] }) {
  const router = useRouter();
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, ideas.filter((i) => i.status === f.key).length])) as Record<IdeaStatus, number>;
  const [filter, setFilter] = useState<IdeaStatus>(counts.nueva ? "nueva" : counts.guardada ? "guardada" : "nueva");
  const [busy, setBusy] = useState<string | null>(null);
  const list = ideas.filter((i) => i.status === filter);

  async function setStatus(id: string, status: IdeaStatus) {
    setBusy(id);
    try {
      await api(`/api/manny/ideas/${id}`, { body: { status } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar");
    } finally {
      setBusy(null);
    }
  }

  async function toScript(id: string) {
    setBusy(id);
    try {
      const { id: scriptId } = await api<{ id: string }>(`/api/manny/ideas/${id}/script`, { method: "POST" });
      toast.success("Guion escrito", { action: { label: "Verlo", onClick: () => router.push(`/manny/guiones#${scriptId}`) } });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo escribir el guion");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/manny/ideas/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  return (
    <div>
      <div role="group" aria-label="Estado de las ideas" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className={filter === f.key ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
            {f.label} <span className="font-mono tabular-nums opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="card p-5 text-sm text-pretty text-muted">{ideas.length === 0 ? "Todavía no hay ideas. Pídeselas a Manny arriba o guarda alguna desde el radar o la búsqueda." : "No hay ideas en este estado."}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {list.map((r) => {
            const i = r.idea;
            const working = busy === r.id;
            return (
              <li key={r.id} className="grid gap-4 p-4 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-6 md:p-5">
                <Hook text={i.gancho} className="self-start !px-3 !py-4 !text-[1.05rem]" />
                <div className="min-w-0">
                  <p className="font-medium text-balance">{i.titulo}</p>
                  <p className="mt-1 text-xs text-muted">
                    {i.formato} · {LEVEL[i.dificultad - 1]} · {WHERE[i.grabacion]}
                  </p>
                  {i.angulo && <p className="mt-2 text-sm text-pretty">{i.angulo}</p>}
                  {i.basadoEn && <p className="mt-1.5 text-xs text-muted text-pretty">Inspirada en: {i.basadoEn}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.status !== "guion" && r.status !== "descartada" && (
                      <button type="button" disabled={working} onClick={() => toScript(r.id)} className="btn-primary btn-sm">
                        {working ? (
                          <>
                            <LoaderCircle size={13} aria-hidden className="animate-spin" /> Escribiendo guion (30–60 s)
                          </>
                        ) : (
                          "Convertir en guion"
                        )}
                      </button>
                    )}
                    {r.status === "nueva" && (
                      <button type="button" disabled={working} onClick={() => setStatus(r.id, "guardada")} className="btn-ghost btn-sm">
                        Guardar
                      </button>
                    )}
                    {r.status === "descartada" ? (
                      <button type="button" disabled={working} onClick={() => setStatus(r.id, "guardada")} className="btn-ghost btn-sm">
                        Recuperar
                      </button>
                    ) : (
                      r.status !== "guion" && (
                        <button type="button" disabled={working} onClick={() => setStatus(r.id, "descartada")} className="btn-ghost btn-sm">
                          Descartar
                        </button>
                      )
                    )}
                    <ConfirmButton disabled={working} onConfirm={() => remove(r.id)}>
                      Borrar
                    </ConfirmButton>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
