"use client";

import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { projects, type Project, type Shot } from "@/content";
import { cn } from "@/lib/utils";
import { CaseSheet } from "@/components/ui/case-sheet";
import { Framed } from "@/components/ui/frames";

export const ease = [0.22, 1, 0.36, 1] as const;
const noop = () => () => {};

/** True only on the client; lets a variant portal or read matchMedia without a hydration mismatch. */
export function useClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// Every variant opens the same case sheet, portaled to <body> so it sits above the nav and the starfield.
export function useCaso() {
  const [selected, setSelected] = useState<Project | null>(null);
  const client = useClient();
  const close = useCallback(() => setSelected(null), []);
  const i = selected ? projects.findIndex((p) => p.slug === selected.slug) : -1;
  const next = projects[(i + 1) % projects.length];

  const sheet =
    client &&
    createPortal(
      <AnimatePresence>
        {selected && (
          <CaseSheet key="case-sheet" project={selected} next={next} onClose={close} onNext={() => setSelected(next)} />
        )}
      </AnimatePresence>,
      document.body,
    );

  return { open: setSelected, sheet };
}

// ---------------------------------------------------------------------------------------------
// Card compositions: each kind of work is shown the way it is actually used.

function Layer({
  shot,
  p,
  depth,
  className,
  sizes,
  rotate = 0,
}: {
  shot: Shot;
  p: MotionValue<number>;
  depth: number;
  className: string;
  sizes: string;
  rotate?: number;
}) {
  // Nearer layers drift further while the card passes, which reads as depth without any 3D.
  const y = useTransform(p, [0, 1], [`${depth * 6}%`, `${depth * -6}%`]);
  return (
    <motion.div style={{ y, rotate }} className={cn("absolute will-change-transform", className)}>
      <Framed shot={shot} sizes={sizes} />
    </motion.div>
  );
}

export function Media({ project, p: scroll }: { project: Project; p?: MotionValue<number> }) {
  // Without a scroll source the layers simply sit still at their resting offset.
  const still = useMotionValue(0.5);
  const p = scroll ?? still;
  const [a, b, c] = project.cover;

  if (project.layout === "mobile" && a && b && c) {
    return (
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[640px]">
        <Layer shot={b} p={p} depth={0.4} rotate={-7} className="left-[4%] top-[12%] w-[29%]" sizes="(min-width: 768px) 190px, 30vw" />
        <Layer shot={c} p={p} depth={0.6} rotate={7} className="right-[4%] top-[12%] w-[29%]" sizes="(min-width: 768px) 190px, 30vw" />
        <Layer shot={a} p={p} depth={1} className="left-1/2 top-0 w-[33%] -translate-x-1/2" sizes="(min-width: 768px) 220px, 34vw" />
      </div>
    );
  }

  if (project.layout === "print" && a && b && c) {
    return (
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[640px]">
        <Layer shot={c} p={p} depth={0.3} rotate={8} className="right-[6%] top-[10%] w-[40%]" sizes="(min-width: 768px) 260px, 40vw" />
        <Layer shot={b} p={p} depth={0.6} rotate={-9} className="left-[6%] top-[12%] w-[40%]" sizes="(min-width: 768px) 260px, 40vw" />
        <Layer shot={a} p={p} depth={1} rotate={-1.5} className="left-1/2 top-0 w-[44%] -translate-x-1/2" sizes="(min-width: 768px) 290px, 44vw" />
      </div>
    );
  }

  if (project.layout === "brand" && a) {
    return (
      <div className="relative mx-auto grid aspect-[5/4] w-full max-w-[640px] place-items-center">
        <div
          aria-hidden
          className="motion-safe-only absolute aspect-square w-[70%] rounded-full opacity-60 blur-2xl"
          style={{
            background: `conic-gradient(from 0deg,${project.accent},#ff5ca8,#3aa0ff,#ffb35c,${project.accent})`,
            animation: "drift 14s linear infinite",
          }}
        />
        <Layer shot={a} p={p} depth={0.6} className="w-[46%] [&>div]:rounded-[22%] [&>div]:border-0" sizes="(min-width: 768px) 300px, 46vw" />
      </div>
    );
  }

  if (!a) return null;

  // Web: the site in a browser window, with a photo or the phone version overlapping its corner.
  const side = b?.frame === "phone";
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[680px]">
      <Layer shot={a} p={p} depth={0.35} className="left-0 top-[4%] w-[88%]" sizes="(min-width: 768px) 600px, 88vw" />
      {b && (
        <Layer
          shot={b}
          p={p}
          depth={1}
          className={side ? "bottom-[2%] right-0 w-[22%]" : "bottom-[4%] right-0 w-[46%]"}
          sizes={side ? "(min-width: 768px) 150px, 22vw" : "(min-width: 768px) 320px, 46vw"}
        />
      )}
    </div>
  );
}
