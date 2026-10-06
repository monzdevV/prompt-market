"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, LoaderCircle, Search } from "lucide-react";
import { api } from "@/lib/client-api";
import { compact, duration } from "@/lib/manny/format";
import type { VideoMeta } from "@/lib/manny/social";
import { SaveIdeaButton } from "./idea-actions";
import { Thumb } from "./thumb";
import { analyzeHref } from "@/lib/manny/format";

/** Búsqueda de vídeos en YouTube para sacar ideas. */
export function YtSearch() {
  const [q, setQ] = useState("");
  const [short, setShort] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ query: string; short: boolean; videos: VideoMeta[] } | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (busy || q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const { videos } = await api<{ videos: VideoMeta[] }>(`/api/manny/search?${new URLSearchParams({ q: q.trim(), short: short ? "1" : "0" })}`);
      setResults({ query: q.trim(), short, videos });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No he podido buscar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={search} aria-busy={busy}>
        <label htmlFor="yt-q" className="label">
          Qué quieres buscar
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="yt-q" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} maxLength={120} placeholder="Por ejemplo: rutina de espalda, mitos de creatina" className="input h-11 flex-1" />
          <button type="submit" disabled={busy || q.trim().length < 2} className="btn-primary h-11 px-5">
            {busy ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Search size={15} aria-hidden />} {busy ? "Buscando…" : "Buscar"}
          </button>
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={short} disabled={busy} onChange={(e) => setShort(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>
            Solo Shorts
            <span className="hint block">Con esto salen pocos resultados: la mayoría de lo que hay en YouTube son vídeos largos.</span>
          </span>
        </label>
        <p className="hint mt-3 max-w-xl text-pretty">TikTok no deja buscar desde fuera, por eso busco en YouTube. Para TikTok usa el radar con las cuentas que sigues.</p>
      </form>

      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-bad/40 bg-bad-soft p-4 text-sm text-bad text-pretty">
          {error}
        </p>
      )}

      {results && (
        <div className="mt-6" aria-live="polite">
          {results.videos.length === 0 ? (
            <p className="card p-5 text-sm text-pretty text-muted">{results.short ? `No he encontrado Shorts para «${results.query}». Prueba a quitar «Solo Shorts» o a cambiar las palabras.` : `No he encontrado nada para «${results.query}».`}</p>
          ) : (
            <ul className="card divide-y divide-line">
              {results.videos.map((v) => (
                <li key={v.id} className="flex items-start gap-3 px-4 py-3.5">
                  <Thumb src={v.thumb} className="h-[4.5rem] w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-pretty">{v.caption || "(sin título)"}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-line-strong underline-offset-4 hover:text-accent">
                        {v.handle || "YouTube"} <ExternalLink size={11} aria-hidden />
                      </a>
                      <span className="font-mono tabular-nums">{compact(v.views)} visitas</span>
                      <span className="font-mono tabular-nums">{duration(v.duration)}</span>
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <Link href={analyzeHref(v.url)} className="btn-primary btn-sm">
                        Copiar este
                      </Link>
                      <SaveIdeaButton titulo={v.caption.slice(0, 100) || `Vídeo de ${v.handle}`} basadoEn={`${v.handle} en YouTube · ${compact(v.views)} visitas`} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
