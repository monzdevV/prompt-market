"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import { useFade } from "@/lib/useFade";

const SPREAD = 1.35;
const STACK_OFFSET = 0.12;
const SCALE_STEP = 0.08;

// `invert` is for dark logos that would vanish against the dark tile.
type Social = { label: string; href: string; icon: string; invert?: boolean };

function Logo({
  social,
  index,
  count,
  progress,
  side,
}: {
  social: Social;
  index: number;
  count: number;
  progress: MotionValue<number>;
  side: "left" | "right";
}) {
  const start = 0.28 + index * 0.05;
  const end = start + 0.22;
  const centered = index - (count - 1) / 2;

  const y = useTransform(progress, [start, end], [`${index * STACK_OFFSET * 100}%`, `${centered * SPREAD * 100}%`]);
  const scale = useTransform(progress, [start, end], [1 + (count - 1 - index) * SCALE_STEP, 1]);
  const opacity = useFade(progress, [start, start + 0.12], [0, 1]);

  return (
    <motion.a
      href={social.href}
      target="_blank"
      rel="noreferrer"
      aria-label={social.label}
      style={{ y, scale, opacity, zIndex: index }}
      className="group pointer-events-auto absolute inset-x-0 aspect-square overflow-hidden rounded-2xl border border-mist/15 bg-void/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:!scale-110"
    >
      <Image
        src={social.icon}
        alt=""
        width={160}
        height={160}
        className={`h-full w-full object-cover opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 ${
          social.invert ? "invert" : ""
        }`}
      />
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-mist opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
          side === "left" ? "left-[115%]" : "right-[115%]"
        }`}
      >
        {social.label}
      </span>
    </motion.a>
  );
}

export function SocialStack({
  socials,
  progress,
  side,
}: {
  socials: Social[];
  progress: MotionValue<number>;
  side: "left" | "right";
}) {
  if (!socials.length) return null;

  return (
    <div
      className={`pointer-events-none absolute top-1/2 z-20 w-[clamp(3.5rem,6vw,5.5rem)] -translate-y-1/2 ${
        side === "left" ? "left-[5vw]" : "right-[5vw]"
      }`}
    >
      <div className="relative aspect-square">
        {socials.map((social, i) => (
          <Logo key={social.label} social={social} index={i} count={socials.length} progress={progress} side={side} />
        ))}
      </div>
    </div>
  );
}
