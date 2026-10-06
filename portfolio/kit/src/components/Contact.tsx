"use client";

import type { Application } from "@splinetool/runtime";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SocialStack } from "@/components/ui/social-stack";
import { LandedStar } from "@/components/ui/landed-star";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { año, contacto, profile, socials, textos } from "@/content";
import { useFade } from "@/lib/useFade";

// If the scene hasn't drawn after this long (slow network, removed scene), show the built-in star instead.
const SCENE_TIMEOUT = 20000;

export function Contact() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const showRobot = contacto.robot && Boolean(contacto.escena) && !failed;
  const app = useRef<Application | null>(null);
  const inView = useRef(false);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const color = "#e3e7ff";
  const robotOpacity = useFade(p, [0.25, 0.55], [0, 1]);
  const robotScale = useTransform(p, [0.25, 1], [1.15, 1]);
  const titleScale = useTransform(p, [0, 0.5], [0.85, 1]);
  const details = useFade(p, [0.45, 0.65], [0, 1]);
  const detailsY = useTransform(p, [0.45, 0.65], [30, 0]);

  useEffect(() => {
    const el = stage.current;
    if (!el || !contacto.robot) return;
    // The Spline scene is heavy to parse: load it while the visitor is idle on the hero instead of
    // mid-scroll, and only render it while this section is on screen.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const timer = window.setTimeout(() => idle(() => setLoad(true), { timeout: 3000 }), 2500);
    const io = new IntersectionObserver(
      ([e]) => {
        inView.current = e.isIntersecting;
        if (e.isIntersecting) setLoad(true);
        if (e.isIntersecting) app.current?.play();
        else app.current?.stop();
      },
      { rootMargin: "20% 0px" },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!load || !contacto.robot) return;
    const id = window.setTimeout(() => !loaded.current && setFailed(true), SCENE_TIMEOUT);
    return () => window.clearTimeout(id);
  }, [load]);

  const onLoad = (a: Application) => {
    loaded.current = true;
    app.current = a;
    if (!inView.current) a.stop();
  };

  return (
    <section ref={ref} id="contacto" className="relative h-[280vh]">
      <motion.div
        ref={stage}
        style={{ color }}
        className="sticky top-0 flex h-svh flex-col overflow-hidden"
      >
        <Spotlight className="-top-32 left-1/4" size={420} />

        {socials.length > 0 && (
          <>
            <SocialStack socials={socials.filter((_, i) => i % 2 === 0)} progress={p} side="left" />
            <SocialStack socials={socials.filter((_, i) => i % 2 === 1)} progress={p} side="right" />
          </>
        )}

        <motion.div
          style={{ opacity: robotOpacity, scale: robotScale }}
          className="absolute inset-x-0 bottom-0 mx-auto h-[62svh] w-full max-w-[820px]"
        >
          {showRobot ? (
            load && (
              <SplineScene
                scene={contacto.escena}
                className="h-full w-full"
                onLoad={onLoad}
                onError={() => setFailed(true)}
                loading={
                  <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-haze">
                    {textos.contacto.cargando}
                  </div>
                }
              />
            )
          ) : (
            <LandedStar />
          )}
        </motion.div>

        <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em]">{textos.contacto.etiqueta}</p>
          <motion.h2
            style={{ scale: titleScale }}
            className="font-display text-[clamp(2.8rem,11vw,8.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]"
          >
            <span className="dna-text pr-[0.04em]">{textos.contacto.titulo}</span><span className="text-amber">.</span>
          </motion.h2>
          <motion.div style={{ opacity: details, y: detailsY }} className="flex flex-col items-center gap-4">
            <a
              href={`mailto:${profile.email}`}
              className="pointer-events-auto font-serif text-[clamp(1.5rem,4vw,2.75rem)] underline decoration-1 underline-offset-8 decoration-amber/60 transition-colors hover:text-ember"
            >
              {profile.email}
            </a>
          </motion.div>
        </div>

        <motion.footer
          style={{ opacity: details }}
          className="pointer-events-none relative z-10 flex justify-between px-6 pb-6 font-mono text-[11px] uppercase tracking-[0.2em] md:px-16"
        >
          <span>
            © {año} {profile.name}
          </span>
          <span>{textos.contacto.pie}</span>
        </motion.footer>
      </motion.div>
    </section>
  );
}
