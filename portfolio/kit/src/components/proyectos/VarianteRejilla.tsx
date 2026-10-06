"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CATEGORIAS, projects, textos, type Categoria, type Project } from "@/content";
import { cn } from "@/lib/utils";
import { ease, Media, useCaso } from "./comun";

// "Todo" plus only the categories that actually have projects, so no filter ever shows an empty grid.
type Filtro = "todo" | Categoria;
const FILTROS: Filtro[] = ["todo", ...CATEGORIAS.filter((c) => projects.some((p) => p.categoria === c))];

// Tile widths on a 12-column grid, so rows alternate wide/narrow instead of repeating one card size.
const SPANS = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7", "md:col-span-6", "md:col-span-6"];

function Pieza({ project, span, onOpen }: { project: Project; span: string; onOpen: (p: Project) => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ duration: 0.32, ease }}
      className={cn("col-span-12", span)}
    >
      <button onClick={() => onOpen(project)} className="group block w-full text-left">
        <span
          className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[1.25rem] border border-mist/10 px-[8%] py-[6%] md:aspect-[16/11]"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 60% 35%,color-mix(in oklab,${project.accent} 32%,transparent),transparent 75%),linear-gradient(160deg,color-mix(in oklab,${project.accent} 14%,#0b1030),#070b1f 62%)`,
          }}
        >
          <span className="block w-full max-w-[560px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035]">
            <Media project={project} />
          </span>
          <span className="absolute right-4 top-4 grid size-10 translate-y-1 place-items-center rounded-full bg-mist text-ink opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
            <ArrowUpRight className="size-5" />
          </span>
        </span>
        <span className="mt-4 flex items-baseline justify-between gap-4">
          <span className="font-serif text-3xl leading-none md:text-4xl">{project.title}</span>
          <span className="shrink-0 text-sm text-haze">
            {project.kind} · <span className="tabular-nums">{project.year}</span>
          </span>
        </span>
        <span className="mt-2 block max-w-[52ch] text-sm text-mist/65">{project.summary}</span>
      </button>
    </motion.li>
  );
}

export function VarianteRejilla() {
  const { open, sheet } = useCaso();
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const visibles = projects.filter((p) => filtro === "todo" || p.categoria === filtro);

  return (
    <section id="proyectos" data-bg="#050816" className="relative px-5 py-[14vh] text-mist md:px-16">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <h2 className="font-display text-[clamp(3rem,9vw,7rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.045em]">
          {textos.proyectos.titulo}
        </h2>
        <div role="group" aria-label={textos.proyectos.filtrar} className="flex gap-1 rounded-full border border-mist/15 p-1">
          {FILTROS.map((f) => {
            const n = f === "todo" ? projects.length : projects.filter((p) => p.categoria === f).length;
            return (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm transition-colors duration-200",
                  filtro === f ? "text-ink" : "text-mist/70 hover:text-mist",
                )}
              >
                {filtro === f && (
                  <motion.span
                    layoutId="filtro-activo"
                    transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                    className="absolute inset-0 rounded-full bg-mist"
                  />
                )}
                <span className="relative">
                  {f === "todo" ? textos.proyectos.todo : f} <span className="tabular-nums opacity-60">{n}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.ul layout className="mt-12 grid grid-cols-12 gap-x-6 gap-y-14 md:mt-16">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibles.map((p, i) => (
            <Pieza
              key={p.slug}
              project={p}
              span={filtro === "todo" ? SPANS[i % SPANS.length] : visibles.length === 1 ? "md:col-span-8" : "md:col-span-6"}
              onOpen={open}
            />
          ))}
        </AnimatePresence>
      </motion.ul>
      {sheet}
    </section>
  );
}
