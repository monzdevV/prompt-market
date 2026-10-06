"use client";

import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { setScrollLocked } from "@/components/SmoothScroll";
import { textos, type Project } from "@/content";
import { Framed } from "./frames";

const drawer = [0.32, 0.72, 0, 1] as const;

// The full case: a sheet that rises over the page with every shot of the project, big enough to read.
export function CaseSheet({
  project,
  next,
  onClose,
  onNext,
}: {
  project: Project;
  next: Project;
  onClose: () => void;
  onNext: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const titleId = `caso-${project.slug}`;
  const phones = project.gallery.filter((s) => s.frame === "phone");
  const rest = project.gallery.filter((s) => s.frame !== "phone");

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      setScrollLocked(false);
      window.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  // Switching to the next case reuses the sheet, so start it back at the top with focus on close.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
  }, [project.slug]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] bg-[#02030a]/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%", transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
        transition={{ duration: 0.55, ease: drawer }}
        className="absolute inset-x-0 bottom-0 top-3 overflow-hidden rounded-t-[1.75rem] border-t border-mist/15 text-mist md:inset-x-3 md:top-6"
        style={{
          background: `linear-gradient(180deg,color-mix(in oklab,${project.accent} 16%,#0a0f2a) 0%,#070b1f 38%,#050816 100%)`,
        }}
      >
        <div ref={scroller} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-gradient-to-b from-[#070b1f] via-[#070b1f]/80 to-transparent px-5 pb-6 pt-4 md:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-haze">
              {project.kind} · {project.year}
            </p>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label={textos.caso.cerrar}
              className="grid size-10 place-items-center rounded-full border border-mist/15 bg-[#070b1f]/80 text-mist backdrop-blur-md transition-[background-color,transform] duration-150 ease-out hover:bg-mist/10 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mx-auto max-w-6xl px-5 pb-24 md:px-10">
            <header className="grid gap-10 pb-14 pt-6 md:grid-cols-12 md:gap-12 md:pt-10">
              <div className="md:col-span-7">
                <h2 id={titleId} className="text-balance font-serif text-6xl leading-[0.95] md:text-8xl">
                  {project.title}
                </h2>
                <p className="mt-6 max-w-[60ch] text-pretty text-base leading-relaxed text-mist/80 md:text-lg">
                  {project.description}
                </p>
              </div>
              <dl className="grid content-start gap-5 text-sm md:col-span-4 md:col-start-9 md:pt-3">
                <div>
                  <dt className="text-haze">{textos.caso.papel}</dt>
                  <dd className="mt-1">{project.role}</dd>
                </div>
                <div>
                  <dt className="text-haze">{textos.caso.año}</dt>
                  <dd className="mt-1 tabular-nums">{project.year}</dd>
                </div>
                <div>
                  <dt className="text-haze">{textos.caso.conQue}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {project.tags.map((t) => (
                      <span key={t} className="rounded-full border border-mist/15 px-2.5 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </dd>
                </div>
                {project.href && (
                  <a
                    href={project.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-full bg-mist px-4 py-2 text-sm text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    {textos.caso.enVivo} <ArrowUpRight className="size-4" />
                  </a>
                )}
              </dl>
            </header>

            {phones.length > 0 && (
              <div className="-mx-5 overflow-x-auto px-5 pb-4 md:mx-0 md:overflow-visible md:px-0">
                <ul className="flex w-max gap-4 md:grid md:w-auto md:grid-cols-5 md:gap-5">
                  {phones.map((s) => (
                    <li key={s.src} className="w-[44vw] max-w-[220px] md:w-auto md:max-w-none">
                      <Framed shot={s} sizes="(min-width: 768px) 20vw, 44vw" />
                    </li>
                  ))}
                </ul>
                {phones[0].caption && <p className="mt-4 text-sm text-haze">{phones[0].caption}</p>}
              </div>
            )}

            {rest.length > 0 && (
              <ul className="columns-1 gap-6 md:columns-2 [&>li]:mb-8">
                {rest.map((s, i) => (
                  <li key={s.src} className="break-inside-avoid">
                    <Framed
                      shot={s}
                      sizes="(min-width: 768px) 560px, 92vw"
                      preload={i === 0}
                      className={s.frame === "phone" ? "mx-auto max-w-[260px]" : undefined}
                    />
                    {s.caption && <p className="mt-3 text-sm text-haze">{s.caption}</p>}
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-16 grid gap-8 border-t border-mist/10 pt-10 md:grid-cols-12">
              <h3 className="font-display text-2xl font-medium uppercase leading-none tracking-[-0.02em] md:col-span-4">
                {textos.caso.loQueHace}
              </h3>
              <ul className="space-y-4 md:col-span-8">
                {project.highlights.map((h) => (
                  <li key={h} className="flex gap-4 text-base leading-relaxed md:text-lg">
                    <span className="mt-[0.7em] h-px w-5 shrink-0" style={{ backgroundColor: project.accent }} />
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            <button
              onClick={onNext}
              className="group mt-20 flex w-full items-end justify-between gap-6 border-t border-mist/10 pt-8 text-left"
            >
              <span>
                <span className="block text-sm text-haze">{textos.caso.siguiente}</span>
                <span className="mt-2 block font-serif text-4xl leading-none md:text-6xl">{next.title}</span>
              </span>
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-mist/20 transition-[background-color,color,transform] duration-200 ease-out group-hover:bg-mist group-hover:text-ink group-active:scale-[0.96]">
                <ArrowRight className="size-5" />
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
