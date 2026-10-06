"use client";

import { motion, transform, useMotionValue, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef } from "react";

type Map = { bg: (y: number) => string; fg: (y: number) => string };

// Sections are transparent and declare data-bg / data-fg; this one fixed layer blends between them,
// so the page fades from color to color instead of cutting at section edges.
export function Backdrop() {
  const { scrollY } = useScroll();
  const bg = useMotionValue("#050816");
  const map = useRef<Map | null>(null);
  const fg = useRef("");

  const paint = (y: number) => {
    if (!map.current) return;
    bg.set(map.current.bg(y));
    const next = map.current.fg(y);
    if (next !== fg.current) {
      fg.current = next;
      document.documentElement.style.setProperty("--fg", next);
    }
  };

  useMotionValueEvent(scrollY, "change", paint);

  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight;
      const input: number[] = [];
      const bgs: string[] = [];
      const fgs: string[] = [];
      document.querySelectorAll<HTMLElement>("[data-bg]").forEach((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const color = el.dataset.bg!;
        const text = el.dataset.fg ?? "#e3e7ff";
        if (!input.length) {
          input.push(top);
        } else {
          // Blend while the section rises from 80% to 20% of the viewport height.
          const from = Math.max(top - vh * 0.8, input.at(-1)! + 1);
          input.push(from, Math.max(top - vh * 0.2, from + 1));
          bgs.push(bgs.at(-1)!);
          fgs.push(fgs.at(-1)!);
        }
        bgs.push(color);
        fgs.push(text);
      });
      if (input.length < 2) return;
      map.current = { bg: transform(input, bgs), fg: transform(input, fgs) };
      paint(window.scrollY);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => {
      ro.disconnect();
      fg.current = "";
      document.documentElement.style.removeProperty("--fg");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <motion.div aria-hidden style={{ backgroundColor: bg }} className="fixed inset-0 -z-10" />;
}
