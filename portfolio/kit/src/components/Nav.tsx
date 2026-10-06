"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { profile, textos } from "@/content";
import { useFade } from "@/lib/useFade";
import { scrollToId } from "./SmoothScroll";

const links = textos.nav.links;

export function Nav() {
  const [active, setActive] = useState("inicio");
  const { scrollY } = useScroll();
  const opacity = useFade(scrollY, [120, 420], [0, 1]);
  const y = useTransform(scrollY, [120, 420], [-12, 0]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <motion.header
      style={{ opacity, y }}
      className="fixed inset-x-0 top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 text-sm text-white mix-blend-difference"
    >
      <nav className="hidden gap-6 md:flex">
        {links.map((l) => (
          <button key={l.id} onClick={() => scrollToId(l.id)} className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
            {active === l.id && <motion.span layoutId="dot" className="size-2 rounded-full bg-white" />}
            {l.label}
          </button>
        ))}
      </nav>
      <button onClick={() => scrollToId("inicio")} className="col-start-2 font-serif text-2xl leading-none">
        {profile.name}
        <em className="text-base"> {textos.nav.marca}</em>
      </button>
      <button
        onClick={() => scrollToId("contacto")}
        className="justify-self-end rounded-full border border-white px-4 py-1.5 transition-colors hover:bg-white hover:text-black"
      >
        {textos.nav.cta}
      </button>
    </motion.header>
  );
}
