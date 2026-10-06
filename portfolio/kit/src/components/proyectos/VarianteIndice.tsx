"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { scrollToId } from "@/components/SmoothScroll";
import { textos, projects, type Project } from "@/content";
import { cn } from "@/lib/utils";
import { Framed } from "@/components/ui/frames";
import { ease, useCaso } from "./comun";

// Editorial: the list stays pinned on the left and follows the reader, the right column is all pictures.

function Fotos({ project }: { project: Project }) {
  const phones = project.gallery.filter((s) => s.frame === "phone");
  const rest = project.gallery.filter((s) => s.frame !== "phone");
  const [first, ...others] = rest;

  return (
    <div className="space-y-5 md:space-y-6">
      {first && (
        <motion.div
          initial={{ opacity: 0, clipPath: "inset(12% 6% 12% 6% round 16px)" }}
          whileInView={{ opacity: 1, clipPath: "inset(0% 0% 0% 0% round 16px)" }}
          viewport={{ once: true, margin: "-15% 0px" }}
          transition={{ duration: 0.9, ease }}
        >
          <Framed shot={first} sizes="(min-width: 768px) 60vw, 92vw" />
        </motion.div>
      )}
      {phones.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 md:grid-cols-5 md:gap-4">
          {phones.map((s, i) => (
            <motion.li
              key={s.src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, delay: i * 0.04, ease }}
              className={cn(i > 2 && "hidden md:block")}
            >
              <Framed shot={s} sizes="(min-width: 768px) 12vw, 30vw" />
            </motion.li>
          ))}
        </ul>
      )}
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {others.slice(0, 4).map((s) => (
            <motion.div
              key={s.src}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.7, ease }}
              className={cn(s.frame === "phone" && "mx-auto w-1/2")}
            >
              <Framed shot={s} sizes="(min-width: 768px) 30vw, 46vw" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VarianteIndice() {
  const { open, sheet } = useCaso();
  const [active, setActive] = useState(0);
  const blocks = useRef<(HTMLElement | null)[]>([]);
  const current = projects[active];

  useEffect(() => {
    // The block crossing the middle band of the screen is the one being read.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    blocks.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="proyectos" data-bg="#050816" className="relative px-5 py-[14vh] text-mist md:px-16">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12">
        <aside className="md:col-span-4">
          <div className="md:sticky md:top-24 md:flex md:h-[calc(100svh-8rem)] md:flex-col">
            <h2 className="font-display text-[clamp(3rem,7vw,5.5rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.04em]">
              {textos.proyectos.titulo}
            </h2>

            <ol className="mt-10 hidden space-y-1 md:block">
              {projects.map((p, i) => (
                <li key={p.slug}>
                  <button
                    onClick={() => scrollToId(`caso-${p.slug}`)}
                    className={cn(
                      "flex items-center gap-3 py-1 text-left font-serif text-3xl leading-tight transition-[color,transform] duration-300 ease-out lg:text-4xl",
                      i === active ? "translate-x-2 text-mist" : "text-mist/30 hover:text-mist/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-px w-6 origin-left transition-transform duration-300 ease-out",
                        i === active ? "scale-x-100" : "scale-x-0",
                      )}
                      style={{ backgroundColor: p.accent }}
                    />
                    {p.title}
                  </button>
                </li>
              ))}
            </ol>

            <div className="relative mt-auto hidden min-h-56 md:block">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={current.slug}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.32, ease }}
                  className="absolute inset-x-0 bottom-0"
                >
                  <p className="text-sm text-haze">
                    {current.kind} · <span className="tabular-nums">{current.year}</span>
                  </p>
                  <p className="mt-3 max-w-[38ch] text-pretty text-lg leading-snug text-mist/85">{current.summary}</p>
                  <p className="mt-3 text-sm text-mist/60">{current.tags.join(" · ")}</p>
                  <button
                    onClick={() => open(current)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-mist px-5 py-2.5 text-sm font-medium text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    {textos.proyectos.verCaso} <ArrowUpRight className="size-4" />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </aside>

        <div className="space-y-[18vh] md:col-span-8 md:pt-[30vh]">
          {projects.map((p, i) => (
            <article
              key={p.slug}
              id={`caso-${p.slug}`}
              data-i={i}
              ref={(el) => {
                blocks.current[i] = el;
              }}
            >
              <header className="mb-6 md:hidden">
                <p className="text-sm text-haze">
                  {p.kind} · {p.year}
                </p>
                <h3 className="mt-2 font-serif text-5xl leading-none">{p.title}</h3>
                <p className="mt-3 text-mist/75">{p.summary}</p>
                <button
                  onClick={() => open(p)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-mist px-5 py-2.5 text-sm font-medium text-ink transition-transform duration-150 ease-out active:scale-[0.97]"
                >
                  {textos.proyectos.verCaso} <ArrowUpRight className="size-4" />
                </button>
              </header>
              {/* Pictures open the case too; the buttons are the accessible way in. */}
              <div onClick={() => open(p)} className="cursor-zoom-in">
                <Fotos project={p} />
              </div>
            </article>
          ))}
        </div>
      </div>
      {sheet}
    </section>
  );
}
