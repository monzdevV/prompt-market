import type { Metadata } from "next";
import Link from "next/link";
import { NewScript } from "@/components/manny/new-script";
import { ScriptCard, type ScriptItem } from "@/components/manny/script-card";
import { PageHeader } from "@/components/ui";
import { listScripts } from "@/lib/manny/scripts";
import type { ScriptStatus } from "@/lib/manny/types";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Guiones" };

type Filter = "todos" | ScriptStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendiente", label: "Pendientes" },
  { key: "grabado", label: "Grabados" },
  { key: "publicado", label: "Publicados" },
  { key: "descartado", label: "Descartados" },
];

export default async function GuionesPage({ searchParams }: PageProps<"/manny/guiones">) {
  const s = await requireSession();
  const sp = await searchParams;
  const estado = FILTERS.find((f) => f.key === sp.estado)?.key ?? "todos";
  const rows = listScripts(s.workspaceId);
  const count = (k: Filter) => (k === "todos" ? rows.filter((r) => r.status !== "descartado").length : rows.filter((r) => r.status === k).length);
  const visible = rows.filter((r) => (estado === "todos" ? r.status !== "descartado" : r.status === estado));
  const toItem = (r: (typeof rows)[number]): ScriptItem => ({ id: r.id, source: r.source, status: r.status, script: r.script });
  const plan = visible.filter((r) => r.source === "plan");
  const manny = visible.filter((r) => r.source === "manny");

  return (
    <>
      <PageHeader title="Guiones" sub="Todo lo que tienes para grabar: el plan de la semana y lo que Manny te ha escrito. Abre uno para copiar el gancho, los planos o la descripción." />

      <section className="card mb-10 p-5 md:p-7">
        <NewScript />
      </section>

      <nav aria-label="Filtrar por estado" className="mb-8 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f.key} href={f.key === "todos" ? "/manny/guiones" : `/manny/guiones?estado=${f.key}`} aria-current={f.key === estado ? "true" : undefined} className={f.key === estado ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
            {f.label} <span className="font-mono tabular-nums opacity-70">{count(f.key)}</span>
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="card p-5 text-sm text-muted">No hay guiones en este estado.</p>
      ) : (
        <div className="space-y-12">
          {plan.length > 0 && (
            <section aria-labelledby="plan">
              <h2 id="plan" className="display mb-4 text-3xl">
                Plan de la semana
              </h2>
              <div className="space-y-3">
                {plan.map((r) => (
                  <ScriptCard key={r.id} item={toItem(r)} />
                ))}
              </div>
            </section>
          )}
          {manny.length > 0 && (
            <section aria-labelledby="manny">
              <h2 id="manny" className="display mb-4 text-3xl">
                Escritos por Manny
              </h2>
              <div className="space-y-3">
                {manny.map((r) => (
                  <ScriptCard key={r.id} item={toItem(r)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
