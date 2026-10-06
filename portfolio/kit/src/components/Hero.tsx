"use client";

import { motion, useScroll, useSpring, useTransform, useVelocity, type MotionStyle } from "motion/react";
import { useRef } from "react";
import { DnaName } from "@/components/DnaName";
import { HeroCanvas } from "@/components/HeroCanvas";
import { FallWords, HeroHud, Rotator } from "@/components/HeroHud";
import { profile, textos } from "@/content";
import { useFade } from "@/lib/useFade";

const ease = [0.22, 1, 0.36, 1] as const;

const rand = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

// Rounded so the server-rendered inline styles match what the browser reports on hydration.
const round = (v: number) => Math.round(v * 100) / 100;

// Unbounded 800 is very wide (~0.92em per capital, measured). The name keeps its original
// 17vw up to 5 letters and shrinks with the longest word beyond that (~85vw of text), so it never overflows.
// Several words wrap onto separate lines, so they are also capped by height to leave room for the rest.
const NAME_WORDS = profile.name.trim().split(/\s+/);
// Width of a word in "average capitals": W and M run wider, I and J narrower.
const units = (w: string) =>
  [...w.toUpperCase()].reduce((n, c) => n + (c === "W" ? 1.5 : c === "M" ? 1.15 : c === "I" || c === "J" ? 0.5 : 1), 0);
const LONGEST = Math.max(...NAME_WORDS.map(units));
const NAME_VW = round(Math.min(17, 92 / LONGEST));
const NAME_SIZE = `min(15rem, ${NAME_VW}vw${NAME_WORDS.length > 1 ? ", 21svh" : ""})`;

const EMBERS = Array.from({ length: 9 }, (_, i) => ({
  dx: `${round((rand(i + 7) - 0.5) * 7)}vw`,
  s: round(2 + rand(i + 17) * 3),
  d: round(rand(i + 27) * 2.4),
  t: round(1.6 + rand(i + 37) * 1.4),
}));

function Spark() {
  return (
    <>
      <div
        className="absolute left-1/2 top-1/2 size-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle,color-mix(in srgb,var(--tint) 38%,transparent) 0%,color-mix(in srgb,var(--tint) 14%,transparent) 28%,color-mix(in srgb,var(--tint) 5%,transparent) 50%,transparent 68%)",
          animation: "halo 3.2s ease-in-out infinite",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[1.5px] w-[22vmin] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[12vmin] w-[1.5px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(180deg,transparent,rgba(255,255,255,0.9),transparent)",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 size-[1.8vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{
          boxShadow:
            "0 0 10px 3px #fff,0 0 34px 10px color-mix(in srgb,var(--tint) 70%,transparent),0 0 90px 28px color-mix(in srgb,var(--tint) 38%,transparent)",
        }}
      />
      {EMBERS.map((e, i) => (
        <span
          key={i}
          aria-hidden
          className="motion-safe-only absolute left-1/2 top-1/2 rounded-full"
          style={
            {
              width: e.s,
              height: e.s,
              "--dx": e.dx,
              background: "var(--tint)",
              boxShadow: "0 0 6px 1px var(--tint)",
              animation: `shed ${e.t}s ease-out ${e.d}s infinite`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // The trail stretches with scroll speed, so fast scrolling reads as a faster fall.
  const speed = useSpring(useVelocity(p), { stiffness: 180, damping: 30 });
  const trail = useTransform(speed, (v) => 0.3 + Math.min(Math.abs(v), 1.2) * 1.2);

  const sceneOpacity = useFade<number>(p, [0.84, 1], [1, 0]);
  const openingScale = useTransform(p, [0, 0.8], [1, 0.55]);
  const beamOpacity = useFade(p, [0, 0.8], [0.9, 0.35]);

  const sparkY = useTransform(p, [0, 0.8], ["10vh", "74vh"]);
  const sparkX = useTransform(p, [0, 0.3, 0.55, 0.8], ["0vw", "-2.5vw", "1.5vw", "0vw"]);
  const sparkScale = useTransform(p, [0, 0.78, 0.84], [0.6, 1.25, 0.2]);
  const sparkOpacity = useFade(p, [0.8, 0.85], [1, 0]);
  const floorOpacity = useFade(p, [0.35, 0.8, 0.95], [0, 0.7, 0.25]);

  // Cold at the top, warming to amber as the star nears the ground; the canvas follows the same drift.
  const tint = useFade(p, [0, 0.4, 0.8], ["#8fdcff", "#b7a6ff", "#ffb35c"]);

  const flashScale = useTransform(p, [0.78, 0.92], [0.1, 1.8]);
  const flashOpacity = useFade(p, [0.78, 0.81, 0.92], [0, 1, 0]);

  const nameY = useTransform(p, [0, 0.2], ["0vh", "-8vh"]);
  const nameOpacity = useFade(p, [0.07, 0.17], [1, 0]);
  const hint = useFade(p, [0, 0.04], [1, 0]);
  // The statement fades out with the scene, so the page dissolves into the next section instead of scrolling it away.
  const lineOpacity = useFade(p, [0.54, 0.66, 0.9, 0.99], [0, 1, 1, 0]);
  const lineY = useTransform(p, [0.54, 0.8, 0.9, 1], ["6vh", "0vh", "0vh", "-6vh"]);

  return (
    <section ref={ref} id="inicio" data-bg="#050816" className="relative h-[420vh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* On load the scene lights up first, then the star drops in and the text follows. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <motion.div style={{ opacity: sceneOpacity }} className="absolute inset-0 will-change-[opacity]">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 70% 90% at 50% 0%,#1b2466 0%,#0e1438 38%,#060a1c 70%,#03050d 100%)",
              }}
            />
            <HeroCanvas progress={p} />

            <motion.div
              style={{
                opacity: beamOpacity,
                background:
                  "conic-gradient(from 160deg at 50% 0%,transparent 0deg,rgba(170,200,255,0.03) 8deg,rgba(190,215,255,0.11) 20deg,rgba(170,200,255,0.03) 32deg,transparent 40deg)",
                maskImage: "linear-gradient(180deg,#000 0%,rgba(0,0,0,0.5) 55%,transparent 95%)",
              }}
              className="absolute inset-0 will-change-[opacity]"
            />

            <motion.div
              initial={{ scaleX: 0.2, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.8, delay: 0.2, ease }}
              className="absolute inset-0 origin-top"
            >
              <motion.div
                style={{
                  scale: openingScale,
                  background:
                    "radial-gradient(ellipse at 50% 50%,rgba(236,244,255,0.95) 0%,rgba(150,205,255,0.4) 24%,rgba(110,110,240,0.14) 48%,transparent 70%)",
                }}
                className="absolute left-1/2 top-0 -ml-[40vmin] -mt-[9vmin] h-[18vmin] w-[80vmin] will-change-transform"
              />
            </motion.div>

            <motion.div
              style={{
                opacity: floorOpacity,
                background:
                  "radial-gradient(ellipse 45% 100% at 50% 100%,rgba(255,170,90,0.3) 0%,rgba(255,120,40,0.08) 45%,transparent 75%)",
              }}
              className="absolute inset-x-0 bottom-0 h-[45vh] will-change-[opacity]"
            />

            <motion.div
              style={{ y: sparkY, x: sparkX, opacity: sparkOpacity, "--tint": tint } as MotionStyle}
              className="absolute left-1/2 top-0 size-0 will-change-transform"
            >
              <motion.div
                initial={{ y: "-30vh", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1.8, delay: 0.5, ease }}
                className="absolute inset-0"
              >
                <motion.div
                  style={{
                    scaleY: trail,
                    background:
                      "linear-gradient(0deg,rgba(255,255,255,0.85) 0%,color-mix(in srgb,var(--tint) 40%,transparent) 22%,color-mix(in srgb,var(--tint) 10%,transparent) 60%,transparent 100%)",
                  }}
                  className="absolute bottom-0 left-1/2 h-[34vh] w-[3px] -translate-x-1/2 origin-bottom rounded-full will-change-transform"
                />
                <motion.div
                  style={{
                    scaleY: trail,
                    background:
                      "linear-gradient(0deg,color-mix(in srgb,var(--tint) 22%,transparent) 0%,color-mix(in srgb,var(--tint) 6%,transparent) 40%,transparent 100%)",
                  }}
                  className="absolute bottom-0 left-1/2 h-[26vh] w-[3vmin] -translate-x-1/2 origin-bottom rounded-full will-change-transform"
                />
                <motion.div style={{ scale: sparkScale }} className="absolute inset-0 will-change-transform">
                  <Spark />
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              style={{
                scale: flashScale,
                opacity: flashOpacity,
                background:
                  "radial-gradient(ellipse at 50% 50%,rgba(255,236,210,0.75) 0%,rgba(255,160,70,0.26) 30%,transparent 66%)",
              }}
              className="absolute left-1/2 top-[74vh] -ml-[45vmin] -mt-[7vmin] h-[14vmin] w-[90vmin] will-change-transform"
            />

            {/* Keeps the name legible when a bright patch of nebula drifts behind it. */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_30%_at_50%_52%,rgba(3,5,13,0.35),transparent_75%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,transparent_0,rgba(3,5,13,0.55)_80%)]" />
          </motion.div>
        </motion.div>

        <HeroHud progress={p} fade={sceneOpacity} />
        <FallWords progress={p} />

        <motion.div
          style={{ y: nameY, opacity: nameOpacity }}
          className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 flex-col items-center text-center"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: "easeOut" }}
            className="mb-4 font-mono tracking-[0.35em] text-[10px] uppercase text-haze md:text-[11px]"
          >
            {textos.hero.saludo}
          </motion.p>
          <h1
            style={{ fontSize: NAME_SIZE }}
            className="max-w-full text-balance break-words font-display font-extrabold uppercase leading-[0.86] tracking-[-0.045em] text-mist"
          >
            <DnaName text={profile.name} delay={0.35} />
            <span className="sr-only">, {profile.role}</span>
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
            className="mt-6 flex flex-col items-center gap-3 md:mt-8"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mist/70 md:text-[11px]">
              {profile.role}
            </p>
            <p className="font-serif text-2xl text-mist/90 md:text-4xl">
              {profile.verb}{" "}
              <em className="text-ember">
                <Rotator words={profile.builds} />
              </em>
            </p>
          </motion.div>
        </motion.div>

        <motion.p
          style={{ opacity: lineOpacity, y: lineY }}
          className="absolute inset-x-6 top-[18vh] mx-auto max-w-4xl text-center font-display text-4xl font-light uppercase leading-[1.05] tracking-[-0.03em] text-mist md:text-7xl"
        >
          {profile.statement.split(" ").slice(0, -2).join(" ")}{" "}
          <em className="dna-text pr-[0.08em] font-extrabold not-italic">
            {profile.statement.split(" ").slice(-2).join(" ")}
          </em>
        </motion.p>

        <motion.div
          style={{ opacity: hint }}
          className="absolute bottom-16 right-6 flex flex-col items-center gap-3 text-[11px] tracking-wide text-haze md:right-16"
        >
          {textos.hero.pista}
          <span
            className="motion-safe-only size-2.5 rounded-full bg-[#ffb35c] shadow-[0_0_12px_rgba(255,179,92,0.8)]"
            style={{ animation: "bob 1.6s ease-in-out infinite" }}
          />
        </motion.div>
      </div>
    </section>
  );
}
