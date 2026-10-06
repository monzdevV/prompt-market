"use client";

import Lenis from "lenis";
import { cancelFrame, frame, MotionConfig } from "motion/react";
import { useEffect } from "react";

let lenis: Lenis | null = null;

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export function setScrollLocked(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.body.style.overflow = locked ? "hidden" : "";
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
    // Driving Lenis from motion's frame loop keeps scroll and every scroll-linked value on the same frame.
    const update = ({ timestamp }: { timestamp: number }) => lenis?.raf(timestamp);
    frame.update(update, true);
    return () => {
      cancelFrame(update);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
