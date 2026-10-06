import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Thumb } from "@/components/manny/thumb";
import { DeleteRemix, VersionTabs } from "@/components/manny/version-tabs";
import { ApiError } from "@/lib/errors";
import { compact, duration, pct, since } from "@/lib/manny/format";
import { getRemix } from "@/lib/manny/remix";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Tus versiones" };

const LEVEL = ["Fácil", "Media", "Difícil"];

export default async function RemixPage({ params }: PageProps<"/manny/copiar/[id]">) {
  const s = await requireSession();
  const { id } = await params;
  let remix;
  try {
    remix = getRemix(s.workspaceId, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { video, result } = remix;
  const a = result.analisis;
  const rate = (n: number | null) => (video?.views && n !== null ? pct(n / video.views) : "—");

  return (
    <>
      <Link href="/manny/copiar" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft size={14} aria-hidden /> Copiar un vídeo
      </Link>

      <header className="rise mb-10 flex items-start gap-4">
        <Thumb src={video?.thumb ?? null} className="h-24 w-14" />
        <div className="min-w-0">
          <h1 className="display line-clamp-3 text-3xl leading-[1.1] text-balance md:text-4xl">{remix.title}</h1>
          {video ? (
            <>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg underline decoration-line-strong underline-offset-4 hover:text-accent">
                  @{video.handle} <ExternalLink size={12} aria-hidden />
                </a>
                <span>{since(video.postedAt)}</span>
                {video.music && <span className="line-clamp-1">{video.music}</span>}
              </p>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {[
                  ["Visitas", compact(video.views)],
                  ["Duración", duration(video.duration)],
                  ["Likes", rate(video.likes)],
                  ["Guardados", rate(video.saves)],
                  ["Compartidos", rate(video.shares)],
                  ["Comentarios", compact(video.comments)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-mono tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Trabajado con el texto que pegaste, sin leer el vídeo.</p>
          )}
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="order-2 min-w-0 space-y-8 lg:order-1">
          <section aria-labelledby="porque">
            <h2 id="porque" className="display text-2xl">
              Por qué funciona
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-pretty">{a.resumen}</p>
            {a.ganchoOriginal && (
              <p className="mt-4 rounded-xl bg-surface-2 p-3.5 text-sm text-pretty">
                <span className="block text-xs text-muted">Su gancho{a.tipoGancho ? ` · ${a.tipoGancho}` : ""}</span>
                {a.ganchoOriginal}
              </p>
            )}
            <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm marker:text-accent">
              {a.porQueFunciona.map((m, i) => (
                <li key={i} className="pl-1 text-pretty">
                  {m}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="estructura">
            <h2 id="estructura" className="display text-2xl">
              Cómo está montado
            </h2>
            <ol className="mt-3 grid gap-2.5 text-sm">
              {a.estructura.map((e, i) => {
                const m = e.match(/^([\d–\-.,]+\s?s?\s?[:·-]?)\s*(.*)$/);
                return (
                  <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-2">
                    <span className="font-mono text-xs leading-5 text-accent tabular-nums">{m && m[2] ? m[1].replace(/[:·-]\s*$/, "") : ""}</span>
                    <span className="text-pretty">{m && m[2] ? m[2] : e}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="necesitas">
            <h2 id="necesitas" className="display text-2xl">
              Para grabarlo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Dificultad: <span className="text-fg">{LEVEL[a.dificultad - 1]}</span>
            </p>
            {a.necesitas.length > 0 && (
              <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm marker:text-faint">
                {a.necesitas.map((n, i) => (
                  <li key={i} className="pl-1 text-pretty">
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(video?.transcript || remix.manualText) && (
            <details className="group text-sm">
              <summary className="cursor-pointer list-none text-muted transition-colors select-none hover:text-fg [&::-webkit-details-marker]:hidden">Lo que dice el original ({video?.transcript ? "transcrito en tu ordenador" : "texto que pegaste"})</summary>
              <p className="mt-3 rounded-xl bg-surface-2 p-3.5 leading-relaxed text-pretty text-muted">{video?.transcript ?? remix.manualText}</p>
            </details>
          )}
          {video && !video.transcript && <p className="text-xs text-muted text-pretty">No he podido oír el vídeo (puede que no hable nadie o no se haya podido transcribir). Las versiones salen de su descripción y sus cifras: no veo las imágenes.</p>}
          <DeleteRemix id={remix.id} />
        </aside>

        <section aria-label="Tus versiones" className="order-1 min-w-0 lg:order-2">
          <h2 className="display mb-4 text-3xl">Tus versiones</h2>
          <VersionTabs remixId={remix.id} versions={result.versiones} />
        </section>
      </div>
    </>
  );
}
