"use client";

import Lenis from "lenis";
import { cancelFrame, frame, MotionConfig } from "motion/react";
import { useEffect } from "react";

let lenis: Lenis | null = null;

/** Desplaza a una sección con la misma inercia que la rueda. */
export function irA(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function bloquearScroll(bloqueado: boolean) {
  if (bloqueado) lenis?.stop();
  else lenis?.start();
  document.body.style.overflow = bloqueado ? "hidden" : "";
}

export function ScrollSuave({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
    // Lenis va en el mismo bucle que Motion: scroll y valores ligados al scroll pintan en el mismo frame.
    const actualizar = ({ timestamp }: { timestamp: number }) => lenis?.raf(timestamp);
    frame.update(actualizar, true);
    return () => {
      cancelFrame(actualizar);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
