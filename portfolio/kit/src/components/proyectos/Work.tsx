"use client";

import { ArrowUpRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { scrollToId, scrollToY } from "@/components/SmoothScroll";
import { año, contarProyectos, projects, textos, type Project } from "@/content";
import { useFade } from "@/lib/useFade";
import { cn } from "@/lib/utils";
import { Media, useCaso } from "./comun";

const N = projects.length;
// Extra scroll after the last card lands, in screens, so it holds before the section moves on.
const TAIL = 0.3;
const SPAN = N - 1 + TAIL;
const ease = [0.22, 1, 0.36, 1] as const;
const FINE = "(hover: hover) and (pointer: fine)";
const noop = () => () => {};

// ---------------------------------------------------------------------------------------------
// Index: every project on one screen, with the cover trailing the cursor on hover.

function Index() {
  const [hovered, setHovered] = useState<Project | null>(null);
  const fine = useSyncExternalStore(noop, () => matchMedia(FINE).matches, () => false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  const preview = hovered?.cover[0];

  // Pinned cards report their stuck position, so on desktop jump by screens from the top of the stack.
  const goTo = (i: number) => {
    const list = document.getElementById("casos");
    if (!list) return;
    if (!matchMedia("(min-width: 768px)").matches) return scrollToId(`caso-${projects[i].slug}`);
    scrollToY(list.getBoundingClientRect().top + window.scrollY + i * window.innerHeight);
  };

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        x.set(e.clientX);
        y.set(e.clientY);
      }}
      onPointerLeave={() => setHovered(null)}
    >
      <ul className="border-t border-mist/10">
        {projects.map((p, i) => (
          <motion.li
            key={p.slug}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-8% 0px" }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
            className="border-b border-mist/10"
          >
            <button
              onClick={() => goTo(i)}
              onPointerEnter={() => setHovered(p)}
              onFocus={() => setHovered(null)}
              className={cn(
                "group grid w-full grid-cols-1 items-baseline gap-x-6 gap-y-1.5 py-5 text-left transition-opacity duration-300 md:grid-cols-[1.4fr_1fr_4rem] md:py-7",
                hovered && hovered.slug !== p.slug && "opacity-40",
              )}
            >
              <span className="flex items-center gap-4 font-serif text-4xl leading-none md:text-6xl">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 scale-50 rounded-full opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
                  style={{ backgroundColor: p.accent, boxShadow: `0 0 14px ${p.accent}` }}
                />
                {p.title}
              </span>
              <span className="text-sm text-haze md:text-base">{p.kind}</span>
              <span className="max-w-[52ch] text-sm text-mist/60 md:hidden">{p.summary}</span>
              <span className="hidden text-right font-mono text-xs tabular-nums text-haze md:block">{p.year}</span>
            </button>
          </motion.li>
        ))}
      </ul>

      {fine && (
        <motion.div
          aria-hidden
          style={{ x: sx, y: sy }}
          className="pointer-events-none fixed left-0 top-0 z-40 hidden md:block"
        >
          <AnimatePresence>
            {preview && hovered && (
              <motion.div
                key={hovered.slug}
                initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease }}
                className="absolute left-6 top-6 w-[300px] origin-top-left overflow-hidden rounded-xl border border-mist/15 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)]"
                style={{ backgroundColor: hovered.accent }}
              >
                <Image
                  src={preview.src}
                  alt=""
                  width={preview.width}
                  height={preview.height}
                  sizes="300px"
                  className={cn(
                    "block w-full object-cover object-top",
                    preview.frame === "phone" || preview.frame === "page" ? "aspect-[4/3]" : "h-auto",
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Stacked case cards: each one pins, and the next slides over it while it sinks back.

function CaseCard({
  project,
  index,
  stack,
  onOpen,
}: {
  project: Project;
  index: number;
  stack: MotionValue<number>;
  onOpen: (p: Project) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // The container scrolls (N - 1) screens plus the tail, so card i pins at i / SPAN of the way through.
  const start = index / SPAN;
  const scale = useTransform(stack, [start, 1], [1, 1 - (N - 1 - index) * 0.04]);
  const dim = useFade(stack, [start, Math.min(1, (index + 1) / SPAN)], [0, index === N - 1 ? 0 : 0.55]);

  return (
    // Every card is a sibling sticky in one container, so each new card slides up over the pinned ones.
    <div
      ref={ref}
      id={`caso-${project.slug}`}
      className="md:sticky md:top-0 md:flex md:h-svh md:items-center md:pt-[calc(var(--i)*14px)]"
      style={{ "--i": index } as React.CSSProperties}
    >
        <motion.article
          style={{
            scale,
            background: `radial-gradient(ellipse 70% 60% at 75% 45%,color-mix(in oklab,${project.accent} 26%,transparent) 0%,transparent 70%),linear-gradient(160deg,color-mix(in oklab,${project.accent} 14%,#0b1030) 0%,#070b1f 55%)`,
          }}
          className="relative w-full origin-top overflow-hidden rounded-[1.75rem] border border-mist/10 md:h-[86svh]"
        >
          <div className="grid h-full gap-10 p-6 md:grid-cols-12 md:items-center md:gap-8 md:p-12">
            <div className="flex flex-col md:col-span-5">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-haze">
                <span className="size-2 rounded-full" style={{ backgroundColor: project.accent }} />
                {project.kind}
                <span className="tabular-nums text-haze/70">{project.year}</span>
              </p>
              <h3 className="mt-5 text-balance font-serif text-5xl leading-[0.95] md:text-7xl">{project.title}</h3>
              <p className="mt-5 max-w-[42ch] text-pretty text-base leading-relaxed text-mist/75 md:text-lg">
                {project.summary}
              </p>
              <ul className="mt-6 flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <li key={t} className="rounded-full border border-mist/15 px-2.5 py-0.5 text-xs text-mist/80">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onOpen(project)}
                  className="inline-flex items-center gap-2 rounded-full bg-mist px-5 py-2.5 text-sm font-medium text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                >
                  {textos.proyectos.verCaso}
                  <ArrowUpRight className="size-4" />
                </button>
                {project.gallery.length > 0 && (
                  <span className="text-sm text-haze">
                    {project.gallery.length} {textos.proyectos.imagen[project.gallery.length === 1 ? 0 : 1]}
                  </span>
                )}
              </div>
            </div>

            {/* The composition opens the case too; the button above is the accessible way in. */}
            <div onClick={() => onOpen(project)} className="relative cursor-zoom-in md:col-span-7">
              <Media project={project} p={pass} />
            </div>
          </div>

          {/* Darkens the card as the next one slides over, so the stack reads front to back. */}
          <motion.div aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 bg-[#03050d]" />
        </motion.article>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export function Work() {
  const cards = useRef<HTMLDivElement>(null);
  const { open, sheet } = useCaso();
  const { scrollYProgress: stack } = useScroll({ target: cards, offset: ["start start", "end end"] });

  return (
    <section id="proyectos" data-bg="#050816" className="relative px-4 pb-[12vh] pt-[14vh] text-mist md:px-10">
      <div className="grid gap-12 px-2 md:grid-cols-12 md:gap-10 md:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.1, ease }}
          className="font-display text-[clamp(3rem,9vw,6rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.04em] md:col-span-5"
        >
          {textos.proyectos.titulo}
          <span className="block font-serif text-[0.5em] font-normal normal-case italic tracking-normal text-ember">
            {contarProyectos()}, {año}
          </span>
        </motion.h2>
        <div className="md:col-span-7 md:pt-4">
          <Index />
        </div>
      </div>

      <div ref={cards} id="casos" className="mt-[16vh] flex flex-col gap-6 md:block md:pb-[30svh]">
        {projects.map((p, idx) => (
          <CaseCard key={p.slug} project={p} index={idx} stack={stack} onOpen={open} />
        ))}
      </div>

      {sheet}
    </section>
  );
}
