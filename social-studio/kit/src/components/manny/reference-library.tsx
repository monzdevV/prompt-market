"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { compact, splitEmphasis, times } from "@/lib/manny/format";
import { STYLE_LABEL, type Reference, type StyleKey } from "@/lib/manny/types";

// Igual que analyzeHref de video-row.tsx; no se importa de allí porque arrastraría la base de datos al navegador
const analyzeHref = (url: string) => `/manny/copiar?url=${encodeURIComponent(url)}&go=1`;

const NET = { tt: "TikTok", yt: "YouTube", ig: "Instagram" } as const;
const LEVEL = ["Fácil", "Media", "Difícil"];
type Sort = "ratio" | "views" | "small";
const SORTS: { key: Sort; label: string }[] = [
  { key: "ratio", label: "Más viral para su tamaño" },
  { key: "views", label: "Más visitas" },
  { key: "small", label: "Cuentas más pequeñas" },
];

const ratio = (r: Reference) => r.visitas / Math.max(r.seguidores, 1);

function Chips<T extends string | number>({ label, value, options, onChange }: { label: string; value: T | null; options: { key: T; label: string }[]; onChange: (v: T | null) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 w-20 text-xs text-muted">{label}</span>
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={value === null ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
        Todos
      </button>
      {options.map((o) => (
        <button key={String(o.key)} type="button" aria-pressed={value === o.key} onClick={() => onChange(value === o.key ? null : o.key)} className={value === o.key ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ReferenceLibrary({ references }: { references: Reference[] }) {
  const [style, setStyle] = useState<StyleKey | null>(null);
  const [net, setNet] = useState<Reference["plataforma"] | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [lang, setLang] = useState<"es" | "en" | null>(null);
  const [sort, setSort] = useState<Sort>("ratio");

  const list = useMemo(() => {
    const f = references.filter((r) => (!style || r.estilo === style) && (!net || r.plataforma === net) && (!level || r.dificultad === level) && (!lang || r.idioma === lang));
    const key = { ratio: (r: Reference) => ratio(r), views: (r: Reference) => r.visitas, small: (r: Reference) => -r.seguidores }[sort];
    return [...f].sort((a, b) => key(b) - key(a));
  }, [references, style, net, level, lang, sort]);

  const used = new Set(references.map((r) => r.estilo));

  return (
    <div>
      <div className="mb-6 grid gap-3">
        <Chips label="Estilo" value={style} onChange={setStyle} options={(Object.keys(STYLE_LABEL) as StyleKey[]).filter((k) => used.has(k)).map((k) => ({ key: k, label: STYLE_LABEL[k] }))} />
        <Chips label="Red" value={net} onChange={setNet} options={(Object.keys(NET) as (keyof typeof NET)[]).map((k) => ({ key: k, label: NET[k] }))} />
        <Chips label="Dificultad" value={level} onChange={setLevel} options={LEVEL.map((l, i) => ({ key: (i + 1) as 1 | 2 | 3, label: l }))} />
        <Chips label="Idioma" value={lang} onChange={setLang} options={[{ key: "es" as const, label: "Español" }, { key: "en" as const, label: "Inglés" }]} />
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="lib-sort" className="w-20 text-xs text-muted">
            Ordenar
          </label>
          <select id="lib-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input w-auto pr-8">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <p aria-live="polite" className="font-mono text-xs text-muted tabular-nums">
            {list.length} de {references.length} vídeos
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Ningún vídeo cumple esos filtros. Quita alguno para ver más.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => (
            <li key={r.url} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">@{r.cuenta}</p>
                  <p className="text-xs text-muted">
                    {NET[r.plataforma]} · <span className="tabular-nums">{compact(r.seguidores)}</span> seguidores · {r.idioma === "es" ? "Español" : "Inglés"}
                  </p>
                </div>
                <div className="shrink-0 text-right" title="Visitas entre seguidores">
                  <p className="font-serif text-3xl leading-none text-accent tabular-nums">{times(ratio(r))}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted tabular-nums">{compact(r.visitas)} visitas</p>
                </div>
              </div>
              <p className="mt-3 text-[15px] font-medium text-balance">{r.titulo}</p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                <span className="rounded-full border border-line px-2 py-px">{STYLE_LABEL[r.estilo]}</span>
                <span>
                  <span aria-hidden className="mr-1 inline-flex gap-0.5 align-middle">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= r.dificultad ? "bg-accent" : "bg-line-strong"}`} />
                    ))}
                  </span>
                  {LEVEL[r.dificultad - 1]}
                </span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-pretty text-muted">
                {splitEmphasis(r.queCopiar).map((p, i) =>
                  p.em ? (
                    <strong key={i} className="font-semibold text-fg">
                      {p.text}
                    </strong>
                  ) : (
                    <span key={i}>{p.text}</span>
                  ),
                )}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {r.plataforma !== "ig" && (
                  <Link href={analyzeHref(r.url)} className="btn-primary btn-sm">
                    Analizar con Manny
                  </Link>
                )}
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                  Ver original <ExternalLink size={12} aria-hidden />
                </a>
              </div>
              {r.plataforma === "ig" && <p className="hint mt-2">Instagram no se puede leer sin sesión: míralo allí y descríbeselo a Manny.</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
