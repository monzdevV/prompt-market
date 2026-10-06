"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import { introProyectos, projects, textos, type Project } from "@/content";
import { useFade } from "@/lib/useFade";
import { Media, useCaso } from "./comun";

// Each project opens like a curtain: a small window onto the work grows until it fills the screen.

function Telon({ project, onOpen }: { project: Project; onOpen: (p: Project) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const y = useTransform(p, [0, 0.55], [22, 0]);
  const x = useTransform(p, [0, 0.55], [20, 0]);
  const r = useTransform(p, [0, 0.55], [28, 0]);
  const clip = useMotionTemplate`inset(${y}% ${x}% ${y}% ${x}% round ${r}px)`;
  const zoom = useTransform(p, [0, 0.6], [1.18, 1]);
  const title = useFade(p, [0.3, 0.55], [0, 1]);
  const titleY = useTransform(p, [0.3, 0.6], ["30%", "0%"]);
  const peek = useFade(p, [0, 0.2], [1, 0]);

  return (
    <div ref={ref} id={`caso-${project.slug}`} className="relative h-[210vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* Before the curtain opens, the name waits small beside the window. */}
        <motion.p
          style={{ opacity: peek }}
          className="absolute inset-x-5 top-[10%] flex justify-between font-mono text-xs uppercase tracking-[0.2em] text-haze md:inset-x-16"
        >
          <span>{project.title}</span>
          <span className="tabular-nums">{project.year}</span>
        </motion.p>

        <motion.div style={{ clipPath: clip }} className="absolute inset-0 will-change-[clip-path]">
          {project.fondo ? (
            <motion.div style={{ scale: zoom }} className="absolute inset-0">
              <Image
                src={project.fondo.src}
                alt={project.fondo.alt}
                fill
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          ) : (
            <div
              className="absolute inset-0 grid place-items-center px-6 pb-[22vh] pt-[8vh] md:pb-[18vh]"
              style={{
                background: `radial-gradient(ellipse 60% 60% at 50% 40%,color-mix(in oklab,${project.accent} 38%,transparent),transparent 75%),linear-gradient(180deg,color-mix(in oklab,${project.accent} 20%,#0b1030),#050816)`,
              }}
            >
              <motion.div style={{ scale: zoom }} className="w-full max-w-[min(720px,70vh)]">
                <Media project={project} />
              </motion.div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,13,0.15)_0%,transparent_35%,rgba(3,5,13,0.55)_68%,rgba(3,5,13,0.92)_100%)]" />
        </motion.div>

        <motion.div
          style={{ opacity: title, y: titleY }}
          className="absolute inset-x-5 bottom-8 grid gap-6 md:inset-x-16 md:bottom-14 md:grid-cols-12 md:items-end"
        >
          <h3 className="font-display text-[clamp(2.6rem,8.5vw,7.5rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.04em] text-glow md:col-span-8">
            {project.title}
          </h3>
          <div className="md:col-span-4 md:pb-2">
            <p className="text-sm text-mist/80">
              {project.kind} · <span className="tabular-nums">{project.year}</span>
            </p>
            <p className="mt-2 max-w-[40ch] text-pretty text-mist">{project.summary}</p>
            <button
              onClick={() => onOpen(project)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-mist px-5 py-2.5 text-sm font-medium text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {textos.proyectos.verCaso} <ArrowUpRight className="size-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function VarianteCortina() {
  const { open, sheet } = useCaso();

  return (
    <section id="proyectos" data-bg="#050816" className="relative text-mist">
      <div className="px-5 pb-[6vh] pt-[16vh] md:px-16">
        <h2 className="font-display text-[clamp(3rem,10vw,9rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.045em]">
          {textos.proyectos.titulo}
        </h2>
        <p className="mt-4 max-w-[46ch] text-lg text-mist/70">
          {introProyectos()}
        </p>
      </div>
      {projects.map((p) => (
        <Telon key={p.slug} project={p} onOpen={open} />
      ))}
      {sheet}
    </section>
  );
}
