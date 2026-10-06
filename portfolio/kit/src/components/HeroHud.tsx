"use client";

import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { año, profile, stack, textos } from "@/content";
import { useFade } from "@/lib/useFade";

const ease = [0.22, 1, 0.36, 1] as const;
const LANDING = 0.8;
const ALTITUDE = 1200;

// Enter-on-load helper: every HUD piece rises in on its own beat after the name.
const appear = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease },
});

const clock = new Intl.DateTimeFormat(profile.locale, {
  timeZone: profile.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
};

function Clock() {
  const time = useSyncExternalStore(
    subscribe,
    () => clock.format(Date.now()),
    () => "--:--:--",
  );
  return <span className="tabular-nums">{time}</span>;
}

export function Rotator({ words }: { words: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    // Skipped while the tab is hidden, so paused animations don't pile up words on top of each other.
    const id = window.setInterval(() => !document.hidden && setI((n) => (n + 1) % words.length), 2400);
    return () => window.clearInterval(id);
  }, [words.length]);

  return (
    <span className="inline-grid overflow-hidden align-bottom">
      <AnimatePresence initial={false}>
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="col-start-1 row-start-1 whitespace-nowrap"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Corners({ fade }: { fade: MotionValue<number> }) {
  const corner = "absolute size-5 border-mist/35";
  return (
    <motion.div style={{ opacity: fade }} className="pointer-events-none absolute inset-4 md:inset-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        className="absolute inset-0"
      >
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
      </motion.div>
    </motion.div>
  );
}

function Altimeter({ progress }: { progress: MotionValue<number> }) {
  const readout = useRef<HTMLSpanElement>(null);
  const marker = useTransform(progress, [0, LANDING], ["0%", "100%"]);
  const opacity = useFade(progress, [0.78, 0.86], [1, 0]);
  const tint = useFade(progress, [0, 0.4, LANDING], ["#8fdcff", "#b7a6ff", "#ffb35c"]);
  const tintGlow = useTransform(tint, (c) => `0 0 10px ${c}`);

  useMotionValueEvent(progress, "change", (v) => {
    const alt = Math.max(0, Math.round((1 - v / LANDING) * ALTITUDE));
    if (readout.current) readout.current.textContent = alt.toLocaleString(profile.locale).padStart(5, "0");
  });

  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none absolute right-6 top-[22vh] hidden h-[56vh] w-16 font-mono text-[10px] uppercase tracking-[0.2em] text-haze md:right-10 md:block"
    >
      <motion.div {...appear(1.5)} className="relative h-full">
        <div className="absolute right-0 top-0 h-full w-px bg-mist/15" />
        {Array.from({ length: 11 }, (_, i) => (
          <span
            key={i}
            className="absolute right-0 h-px bg-mist/25"
            style={{ top: `${i * 10}%`, width: i % 5 === 0 ? 14 : 7 }}
          />
        ))}
        <motion.div style={{ top: marker }} className="absolute right-0 flex -translate-y-1/2 items-center gap-2">
          <span className="whitespace-nowrap text-mist">
            <span ref={readout}>{ALTITUDE.toLocaleString(profile.locale)}</span> m
          </span>
          <motion.span
            style={{ backgroundColor: tint, boxShadow: tintGlow }}
            className="h-px w-5"
          />
        </motion.div>
        <span className="absolute -top-6 right-0">{textos.hero.altitud}</span>
      </motion.div>
    </motion.div>
  );
}

function Ticker() {
  const items = [...stack[0], ...stack[1]];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden border-t border-mist/10 bg-void/40 py-3">
      <div className="motion-safe-only flex w-max" style={{ animation: "ticker 45s linear infinite" }}>
        {[0, 1].map((k) => (
          <span key={k} aria-hidden={k === 1} className="flex">
            {items.map((t) => (
              <span
                key={t}
                className="flex items-center gap-6 pr-6 font-mono text-[10px] uppercase tracking-[0.3em] text-haze/80"
              >
                {t}
                <span className="text-amber/70">✦</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeroHud({ progress, fade }: { progress: MotionValue<number>; fade: MotionValue<number> }) {
  const topOpacity = useFade(progress, [0.01, 0.05], [1, 0]);
  const tickerOpacity = useFade(progress, [0.03, 0.08], [1, 0]);

  return (
    <>
      <Corners fade={fade} />

      <motion.div
        style={{ opacity: topOpacity }}
        className="pointer-events-none absolute inset-x-6 top-8 flex items-start justify-between gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-haze md:inset-x-16 md:text-[11px]"
      >
        <motion.p {...appear(1.1)} className="flex items-center gap-2 text-mist">
          <span className="relative flex size-2">
            <span className="motion-safe-only absolute inset-0 animate-ping rounded-full bg-amber opacity-60" />
            <span className="relative size-2 rounded-full bg-amber" />
          </span>
          {profile.available}
        </motion.p>
        <motion.p {...appear(1.2)} className="hidden md:block">
          {profile.location} — <Clock />
        </motion.p>
        <motion.p {...appear(1.3)} className="text-right">
          {textos.hero.copyright} {año}
        </motion.p>
      </motion.div>

      <Altimeter progress={progress} />

      <motion.div style={{ opacity: tickerOpacity }} className="absolute inset-x-0 bottom-0">
        <motion.div {...appear(1.9)}>
          <Ticker />
        </motion.div>
      </motion.div>
    </>
  );
}

function FallWord({
  text,
  index,
  total,
  progress,
}: {
  text: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const from = 0.15;
  const slot = (0.5 - from) / total;
  const start = from + index * slot;
  const opacity = useFade(progress, [start, start + slot * 0.25, start + slot * 0.75, start + slot], [0, 1, 1, 0]);
  const y = useTransform(progress, [start, start + slot], ["5vh", "-5vh"]);

  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-haze">
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
      <h2 className="mt-4 font-sans text-[11vw] font-medium uppercase leading-[0.9] tracking-tight text-mist md:text-[6.5vw]">
        {text}
      </h2>
    </motion.div>
  );
}

// The clean one-line-at-a-time sequence, played while the star falls.
export function FallWords({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[44%] -translate-y-1/2">
      {profile.fall.map((w, i) => (
        <FallWord key={w} text={w} index={i} total={profile.fall.length} progress={progress} />
      ))}
    </div>
  );
}
