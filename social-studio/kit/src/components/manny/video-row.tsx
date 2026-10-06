import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { compact, duration, pct, since, times } from "@/lib/manny/format";
import { OUTLIER_RATIO, type RadarVideo } from "@/lib/manny/radar";
import { Thumb } from "./thumb";

/** Fila de un vídeo de una cuenta que se sigue: cuánto ha reventado para su tamaño y las cifras que importan. */
export function VideoRow({ v, actions, dense = false }: { v: RadarVideo; actions?: React.ReactNode; dense?: boolean }) {
  const hot = v.vsMedian !== null && v.vsMedian >= OUTLIER_RATIO;
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <Thumb src={v.thumb} className={dense ? "h-14 w-8" : "h-[4.5rem] w-10"} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-fg underline decoration-line-strong underline-offset-4 hover:text-accent">
            @{v.handle} <ExternalLink size={11} aria-hidden />
          </a>
          {v.followers !== null && <span className="tabular-nums">{compact(v.followers)} seg.</span>}
          <span>{since(v.postedAt)}</span>
        </p>
        <p className={`mt-1 text-sm text-pretty ${dense ? "line-clamp-1" : "line-clamp-2"}`}>{v.caption.replace(/#[\p{L}\p{N}_]+/gu, "").trim() || "(sin descripción)"}</p>
        {!dense && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted tabular-nums">
            <span>{compact(v.views)} visitas</span>
            <span>{duration(v.duration)}</span>
            <span title="Guardados entre visitas">{pct(v.saveRate)} guardados</span>
            <span title="Compartidos entre visitas">{pct(v.shareRate)} compartidos</span>
          </p>
        )}
        {actions && <div className="mt-2.5 flex flex-wrap gap-1.5">{actions}</div>}
      </div>
      <div className="shrink-0 text-right" title={v.vsMedian !== null ? `${v.vsMedian.toFixed(1)} veces las visitas habituales de esta cuenta` : "Hacen falta más vídeos de la cuenta para comparar"}>
        <p className={`font-serif text-3xl leading-none tabular-nums ${hot ? "text-accent" : "text-muted"}`}>{times(v.vsMedian)}</p>
        <p className="mt-1 font-mono text-[11px] text-muted tabular-nums">{dense ? `${compact(v.views)}` : "su media"}</p>
      </div>
    </li>
  );
}

export function SeeAll({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent">
      {children}
    </Link>
  );
}
