"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { textos, projects } from "@/content";
import { ease, Media, useCaso } from "./comun";

const N = projects.length;
const DESKTOP = "(min-width: 768px)";

// A film strip: the section pins and vertical scroll slides the projects past sideways.
// On phones it is a plain swipeable row with snap points instead.
export function VarianteCarrete() {
  const { open, sheet } = useCaso();
  const section = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const distance = useRef(0);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] });
  // A short hold at each end, so the first and last projects sit still for a moment.
  const x = useTransform(p, (v) => -Math.min(1, Math.max(0, (v - 0.06) / 0.88)) * distance.current);
  // The progress rule trails the scroll slightly, so it reads as motion rather than a readout.
  const bar = useSpring(p, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const measure = () => {
      const el = row.current;
      distance.current = el && matchMedia(DESKTOP).matches ? Math.max(0, el.scrollWidth - window.innerWidth) : 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (row.current) ro.observe(row.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useMotionValueEvent(p, "change", (v) => {
    const i = Math.min(N, Math.floor(v * N) + 1);
    if (counter.current) counter.current.textContent = String(i).padStart(2, "0");
  });

  return (
    <section
      ref={section}
      id="proyectos"
      data-bg="#050816"
      className="relative py-[12vh] text-mist md:h-[var(--alto)] md:py-0"
      style={{ "--alto": `${N * 90}vh` } as React.CSSProperties}
    >
      <div className="md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-center md:overflow-hidden md:pt-10">
        <div className="flex items-end justify-between gap-6 px-5 md:px-16">
          <h2 className="font-display text-[clamp(3rem,8vw,6rem)] font-extrabold md:text-[clamp(2.5rem,5vw,4.5rem)] uppercase leading-[0.88] tracking-[-0.04em]">
            {textos.proyectos.titulo}
          </h2>
          <p className="hidden pb-2 font-mono text-sm tabular-nums text-haze md:block">
            <span ref={counter} className="text-mist">
              01
            </span>{" "}
            / {String(N).padStart(2, "0")}
          </p>
        </div>

        <motion.div
          ref={row}
          style={{ x }}
          className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:mt-12 md:w-max md:snap-none md:gap-8 md:overflow-visible md:px-16 md:pb-0"
        >
          {projects.map((project, i) => (
            <motion.article
              key={project.slug}
              id={`caso-${project.slug}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-5% 0px" }}
              transition={{ duration: 0.8, delay: Math.min(i, 3) * 0.06, ease }}
              className="w-[84vw] shrink-0 snap-center md:w-[min(56vw,calc((100svh-23rem)*16/9))]"
            >
              <div
                onClick={() => open(project)}
                className="group relative grid aspect-[4/3] cursor-zoom-in place-items-center overflow-hidden rounded-[1.25rem] border border-mist/10 p-[6%] md:aspect-[16/9]"
                style={{
                  background: `radial-gradient(ellipse 80% 70% at 60% 40%,color-mix(in oklab,${project.accent} 30%,transparent),transparent 75%),linear-gradient(160deg,color-mix(in oklab,${project.accent} 14%,#0b1030),#070b1f 60%)`,
                }}
              >
                <div className="w-full max-w-[640px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
                  <Media project={project} />
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                <div>
                  <h3 className="font-serif text-4xl leading-none md:text-6xl">{project.title}</h3>
                  <p className="mt-3 max-w-[48ch] text-sm text-mist/70 md:text-base">{project.summary}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 md:flex-col md:items-end md:pt-1">
                  <p className="text-sm text-haze md:text-right">
                    {project.kind}
                    <br className="hidden md:block" />
                    <span className="md:hidden"> · </span>
                    <span className="tabular-nums">{project.year}</span>
                  </p>
                  <button
                    onClick={() => open(project)}
                    aria-label={`${textos.proyectos.verCaso}: ${project.title}`}
                    className="grid size-11 place-items-center rounded-full border border-mist/20 transition-[background-color,color,transform] duration-200 ease-out hover:bg-mist hover:text-ink active:scale-[0.96]"
                  >
                    <ArrowUpRight className="size-5" />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <div className="mx-16 mt-10 hidden h-px bg-mist/10 md:block">
          <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-amber" />
        </div>
      </div>
      {sheet}
    </section>
  );
}
