"use client";

import { motion, useScroll, type MotionValue } from "motion/react";
import { useRef } from "react";
import { profile, textos } from "@/content";
import { useFade } from "@/lib/useFade";

// Everything in this section arrives as a plain fade: no slides, no glows.
const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 1.2, delay, ease: "easeOut" as const },
});

function Word({
  children,
  p,
  range,
  mark,
}: {
  children: string;
  p: MotionValue<number>;
  range: [number, number];
  mark: boolean;
}) {
  const opacity = useFade(p, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className={mark ? "dna-text pr-[0.05em] italic" : undefined}>
      {children}{" "}
    </motion.span>
  );
}

// *Marked* phrases in the copy are set in italics.
function parse(text: string) {
  let on = false;
  return text.split(" ").map((raw) => {
    const opens = raw.startsWith("*");
    const closes = raw.endsWith("*") || raw.endsWith("*:") || raw.endsWith("*.");
    if (opens) on = true;
    const word = { text: raw.replaceAll("*", ""), mark: on };
    if (closes) on = false;
    return word;
  });
}

export function About() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = parse(profile.about);

  return (
    // Pulled up under the hero's last screen, so this rises in while the statement and the nebula fade out.
    <section id="sobre-mi" data-bg="#050816" className="relative -mt-[45vh] px-6 pb-[10vh] pt-[12vh] text-mist md:px-16">
      <div className="grid gap-12 md:grid-cols-12 md:gap-10">
        <motion.aside {...fadeIn()} className="md:col-span-4">
          <div className="md:sticky md:top-28">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-haze">{textos.sobreMi.titulo}</p>
            <dl className="mt-10 space-y-5 text-sm">
              <div>
                <dt className="text-haze">{textos.sobreMi.nombre}</dt>
                <dd className="mt-1">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-haze">{textos.sobreMi.rol}</dt>
                <dd className="mt-1">{profile.role}</dd>
              </div>
              <div>
                <dt className="text-haze">{textos.sobreMi.lugar}</dt>
                <dd className="mt-1">{profile.location}</dd>
              </div>
              {profile.now && (
                <div>
                  <dt className="text-haze">{textos.sobreMi.ahora}</dt>
                  <dd className="mt-1 first-letter:uppercase">{profile.now}</dd>
                </div>
              )}
            </dl>
          </div>
        </motion.aside>

        <div className="md:col-span-8">
          <p ref={ref} className="font-serif text-4xl leading-[1.1] md:text-6xl">
            {words.map((w, i) => (
              <Word key={i} p={p} range={[i / words.length, (i + 1) / words.length]} mark={w.mark}>
                {w.text}
              </Word>
            ))}
          </p>

          <motion.p {...fadeIn()} className="mb-6 mt-[14vh] font-mono text-xs uppercase tracking-[0.3em] text-haze">
            {textos.sobreMi.servicios}
          </motion.p>
          <ul className="border-t border-mist/10">
            {profile.services.map((s, i) => (
              <motion.li
                key={s.title}
                {...fadeIn(i * 0.15)}
                className="grid gap-3 border-b border-mist/10 py-8 md:grid-cols-[3rem_1fr_1.2fr] md:gap-8"
              >
                <span className="font-mono text-xs text-haze">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display text-2xl font-medium uppercase leading-none tracking-[-0.02em]">{s.title}</h3>
                <p className="text-sm leading-relaxed text-mist/70">{s.text}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
