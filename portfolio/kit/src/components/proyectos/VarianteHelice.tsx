"use client";

import { motion, useScroll } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { projects, textos } from "@/content";
import { useFade } from "@/lib/useFade";
import { cn } from "@/lib/utils";
import { useCaso } from "./comun";

const loadGallery = () => import("./galeria-helice");
// The loader lives in this component instead, so it can cross-fade out once the canvas is actually up.
const Gallery = dynamic(loadGallery, { ssr: false, loading: () => null });

function HelixLoader({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-1000 ease-out",
        hidden && "opacity-0",
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="helix-loader flex gap-2.5">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-haze">{textos.proyectos.cargando}</p>
      </div>
    </div>
  );
}

// The original DNA helix gallery, now fed with the real projects and their screenshots.
export function VarianteHelice() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  // The canvas measures itself on mount, so it must not mount while the section is still off-screen.
  // After that it stays mounted and only pauses, since remounting WebGL mid-scroll causes a hitch.
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const { open, sheet } = useCaso();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Measured across the whole pass (enter to exit), so the helix fades in on arrival and out on leaving.
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const stageOpacity = useFade<number>(pass, [0.02, 0.15, 0.85, 0.97], [0, 1, 1, 0]);
  const onReady = useCallback(() => setReady(true), []);

  // Keyboard users tabbing onto a card that isn't in view get scrolled to where the camera frames it.
  const focusCard = useCallback((i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (range * i) / Math.max(1, projects.length - 1) });
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setActive(e.isIntersecting);
        if (e.isIntersecting) setMounted(true);
      },
      { rootMargin: "10% 0px" },
    );
    // Fetch the three.js chunk well before the stage arrives, so mounting doesn't wait on the network.
    const early = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        loadGallery();
        early.disconnect();
      },
      { rootMargin: "150% 0px" },
    );
    io.observe(el);
    early.observe(el);
    return () => {
      io.disconnect();
      early.disconnect();
    };
  }, []);

  return (
    <section ref={ref} id="proyectos" data-bg="#050816" style={{ height: `${projects.length * 110}vh` }} className="relative">
      <div
        ref={stage}
        className="sticky top-0 h-svh overflow-hidden"
      >
        <HelixLoader hidden={ready} />
        {!ready && <p role="status" className="sr-only">{textos.proyectos.cargando}…</p>}
        {/* The mask softens the top and bottom edges, so the helix never shows a hard cut while the stage scrolls. */}
        <motion.div
          style={{
            opacity: stageOpacity,
            maskImage: "linear-gradient(180deg,transparent 0%,#000 14%,#000 86%,transparent 100%)",
          }}
          className="absolute inset-0 will-change-[opacity]"
        >
          {mounted && <Gallery progress={p} active={active} onOpen={open} onFocusCard={focusCard} onReady={onReady} />}
        </motion.div>
        <motion.p style={{ opacity: stageOpacity }} className="pointer-events-none absolute left-6 top-20 font-mono text-xs uppercase tracking-[0.3em] text-haze md:left-16">
          {textos.proyectos.etiqueta}
        </motion.p>
        <motion.p style={{ opacity: stageOpacity }} className="pointer-events-none absolute inset-x-0 bottom-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-haze">
          {textos.proyectos.ayuda}
        </motion.p>
      </div>

      {sheet}
    </section>
  );
}
