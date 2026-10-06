import type { Metadata } from "next";
import Link from "next/link";
import { PublishChecklist } from "@/components/manny/publish-checklist";
import { ReferenceLibrary } from "@/components/manny/reference-library";
import { PageHeader } from "@/components/ui";
import { CHECKLIST, LIVES_NO, LIVES_YES, RECIPES, RULES_NO, RULES_YES } from "@/lib/manny/plan-content";
import { REFERENCES } from "@/lib/manny/seed-data";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Biblioteca" };

const VIEWS = [
  { key: "videos", label: "Vídeos para copiar" },
  { key: "edicion", label: "Edición en CapCut" },
  { key: "reglas", label: "Reglas y directos" },
] as const;

function Marked({ items, tone, title }: { items: string[]; tone: "yes" | "no"; title: string }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <ul className={`grid list-disc gap-2.5 pl-5 text-sm ${tone === "yes" ? "marker:text-ok" : "marker:text-bad"}`}>
        {items.map((t, i) => (
          <li key={i} className="pl-1 text-pretty">
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function BibliotecaPage({ searchParams }: PageProps<"/manny/biblioteca">) {
  await requireSession();
  const sp = await searchParams;
  const view = VIEWS.find((v) => v.key === sp.v)?.key ?? "videos";

  return (
    <>
      <PageHeader title="Biblioteca" sub="Lo que salió de la investigación: vídeos que ya han funcionado, las recetas de edición y las reglas de TikTok para fitness." />

      <nav aria-label="Apartados de la biblioteca" className="mb-8 flex flex-wrap gap-1.5">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/manny/biblioteca?v=${v.key}`} aria-current={v.key === view ? "page" : undefined} className={v.key === view ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
            {v.label}
          </Link>
        ))}
      </nav>

      {view === "videos" && (
        <section aria-labelledby="videos">
          <h2 id="videos" className="display mb-1 text-3xl">
            Vídeos para copiar
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-pretty text-muted">
            Vídeos verticales de fitness con más visitas de lo normal para el tamaño de su cuenta. Las cifras se comprobaron en cada página el 29/09/2026. «×N» son visitas entre seguidores: cuanto más alto, más se hizo viral por el vídeo y no por la fama de la cuenta.
          </p>
          <ReferenceLibrary references={REFERENCES} />
        </section>
      )}

      {view === "edicion" && (
        <div className="space-y-14">
          <section aria-labelledby="recetas">
            <h2 id="recetas" className="display mb-1 text-3xl">
              Recetas de edición
            </h2>
            <p className="mb-8 max-w-2xl text-sm text-pretty text-muted">Hazlas una vez, guárdalas como preset o clip compuesto y después cada vídeo es duplicar el proyecto y cambiar los clips. Objetivo: 25 minutos por vídeo.</p>
            <ol className="grid gap-x-12 gap-y-9 md:grid-cols-2">
              {RECIPES.map((r) => (
                <li key={r.id} id={r.id.toLowerCase()} className="scroll-mt-24 target:[&_h3]:text-accent">
                  <h3 className="flex items-baseline gap-2.5 text-lg font-medium text-balance transition-colors">
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-accent">{r.id}</span>
                    {r.titulo}
                  </h3>
                  <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm marker:text-faint">
                    {r.pasos.map((p, i) => (
                      <li key={i} className="pl-1 text-pretty text-muted">
                        {p}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-xs text-muted text-pretty">Sonidos gratis: pixabay.com/sound-effects y mixkit.co. Músculos en PNG: vecteezy.com (revisa la licencia de cada archivo). Fuentes: Anton y Bebas Neue en Google Fonts.</p>
          </section>

          <section aria-labelledby="antes">
            <h2 id="antes" className="display mb-1 text-3xl">
              Antes de publicar
            </h2>
            <p className="mb-4 text-sm text-muted">Marca las casillas mientras repasas. Se quedan guardadas solo en este navegador.</p>
            <PublishChecklist items={CHECKLIST} />
          </section>
        </div>
      )}

      {view === "reglas" && (
        <div className="space-y-14">
          <section aria-labelledby="reglas">
            <h2 id="reglas" className="display mb-1 text-3xl">
              Reglas de TikTok para fitness
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-pretty text-muted">TikTok deja fuera del «Para ti» ciertos contenidos de fitness. Saltarse esto es lo que hace que un vídeo bueno se quede en 200 visitas.</p>
            <div className="grid gap-10 md:grid-cols-2">
              <Marked tone="no" title="Lo que no se hace" items={RULES_NO} />
              <Marked tone="yes" title="Lo que sí" items={RULES_YES} />
            </div>
          </section>

          <section aria-labelledby="directos">
            <h2 id="directos" className="display mb-1 text-3xl">
              Directos
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-pretty text-muted">Hiciste 38 directos entre julio y septiembre, casi todos de 5 a 25 minutos y sin relación con el gym. La constancia la tienes: ahora hay que convertirlos en seguidores.</p>
            <div className="grid gap-10 md:grid-cols-2">
              <Marked tone="yes" title="Cómo hacerlos" items={LIVES_YES} />
              <Marked tone="no" title="Lo que evitar" items={LIVES_NO} />
            </div>
          </section>

          <p className="text-xs text-muted text-pretty">Fuentes: TikTok Newsroom (cómo recomienda vídeos), estudio de Buffer sobre 11,4 millones de publicaciones (frecuencia), Metricool 2026 y Sprout Social (horarios), normas de la comunidad de TikTok (salud y cuerpo).</p>
        </div>
      )}
    </>
  );
}
