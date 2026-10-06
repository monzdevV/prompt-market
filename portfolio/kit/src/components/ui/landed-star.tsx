"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const rand = (n: number) => {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
};
const round = (v: number) => Math.round(v * 100) / 100;

const EMBERS = Array.from({ length: 7 }, (_, i) => ({
  dx: `${round((rand(i + 3) - 0.5) * 9)}vmin`,
  s: round(2 + rand(i + 13) * 2.5),
  d: round(rand(i + 23) * 3),
  t: round(2 + rand(i + 33) * 1.6),
}));

// Built-in alternative to the Spline robot: the star from the hero, landed and resting in two orbits.
// No external scene, no extra download. It leans gently toward the pointer, like the robot looks at it.
export function LandedStar({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 60, damping: 18 });
  const y = useSpring(py, { stiffness: 60, damping: 18 });
  const tilt = useTransform(x, (v) => v * 0.25);

  useEffect(() => {
    if (reduce || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * 36);
      py.set((e.clientY / window.innerHeight - 0.5) * 18);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [px, py, reduce]);

  return (
    <div aria-hidden className={cn("pointer-events-none relative h-full w-full overflow-hidden", className)}>
      {/* The warm pool of light where it touched down, same as the hero's landing. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[70%]"
        style={{
          background:
            "radial-gradient(ellipse 42% 60% at 50% 100%,rgba(255,170,90,0.32) 0%,rgba(255,120,40,0.08) 45%,transparent 75%)",
        }}
      />

      <motion.div style={{ x, y }} className="absolute left-1/2 top-[56%] size-0">
        {/* Two orbits, tilted into the screen: dotted rings that spin read as beads circling the star. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [perspective:900px]">
          <motion.div style={{ rotateY: tilt }} className="relative size-[min(62vmin,520px)] [transform-style:preserve-3d]">
            <div className="absolute inset-0 [transform:rotateX(74deg)]">
              <div
                className="motion-safe-only size-full rounded-full border-[3px] border-dotted border-[#8f96ff]/55"
                style={{ animation: "drift 26s linear infinite" }}
              />
            </div>
            <div className="absolute inset-[18%] [transform:rotateX(66deg)]">
              <div
                className="motion-safe-only size-full rounded-full border-[3px] border-dotted border-[#ffb35c]/55"
                style={{ animation: "drift 17s linear infinite reverse" }}
              />
            </div>
          </motion.div>
        </div>

        {/* The star itself: halo, flare cross and a white-hot core. */}
        <div
          className="motion-safe-only absolute left-1/2 top-1/2 size-[58vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle,rgba(255,179,92,0.42) 0%,rgba(255,179,92,0.14) 28%,rgba(143,150,255,0.06) 50%,transparent 68%)",
            animation: "halo 3.6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[1.5px] w-[40vmin] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[20vmin] w-[1.5px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.9),transparent)" }}
        />
        <div
          className="absolute left-1/2 top-1/2 size-[3vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{
            boxShadow:
              "0 0 12px 4px #fff,0 0 40px 12px rgba(255,179,92,0.7),0 0 110px 34px rgba(255,179,92,0.35)",
          }}
        />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="motion-safe-only absolute left-1/2 top-1/2 rounded-full bg-[#ffb35c]"
            style={
              {
                width: e.s,
                height: e.s,
                "--dx": e.dx,
                boxShadow: "0 0 6px 1px #ffb35c",
                opacity: 0,
                animation: `shed ${e.t}s ease-out ${e.d}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
