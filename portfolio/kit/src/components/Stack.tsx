"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";
import { stack, textos } from "@/content";

const wrap = (min: number, max: number, v: number) => ((((v - min) % (max - min)) + (max - min)) % (max - min)) + min;

function Row({ items, dir }: { items: string[]; dir: 1 | -1 }) {
  const base = useMotionValue(0);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(velocity, [-1000, 0, 1000], [-5, 0, 5], { clamp: false });
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const direction = useRef<number>(dir);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const b = boost.get();
    if (b < 0) direction.current = -dir;
    else if (b > 0) direction.current = dir;
    const move = direction.current * -2.2 * (delta / 1000);
    base.set(base.get() + move + move * Math.abs(b));
  });

  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div style={{ x }} className="flex w-max">
        {[0, 1].map((k) => (
          <span key={k} aria-hidden={k === 1} className="flex items-center">
            {items.concat(items).map((t, i) => (
              <span key={i} className="flex items-center font-serif text-[16vw] leading-[1.05] md:text-[10vw]">
                <span className={i % 2 ? "dna-text pr-[0.06em] italic" : ""}>{t}</span>
                <span className="mx-[3vw] inline-block size-[1vw] rounded-full bg-mist/25 md:size-[0.6vw]" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Stack() {
  return (
    <section id="stack" data-bg="#050816" className="py-[16vh] text-mist">
      <p className="mb-8 px-6 font-mono text-xs uppercase tracking-[0.3em] text-haze md:px-16">{textos.stack.titulo}</p>
      <Row items={stack[0]} dir={1} />
      <Row items={stack[1]} dir={-1} />
    </section>
  );
}
