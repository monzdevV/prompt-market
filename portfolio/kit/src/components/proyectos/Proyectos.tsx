"use client";

import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { scrollToId } from "@/components/SmoothScroll";
import { cn } from "@/lib/utils";
import { Work } from "./Work";
import { VarianteCarrete } from "./VarianteCarrete";
import { VarianteCortina } from "./VarianteCortina";
import { VarianteHelice } from "./VarianteHelice";
import { VarianteIndice } from "./VarianteIndice";
import { VarianteRejilla } from "./VarianteRejilla";
import { VARIANTES, type VarianteId } from "./variantes";

const COMPONENTES: Record<VarianteId, () => React.JSX.Element> = {
  apilado: Work,
  indice: VarianteIndice,
  carrete: VarianteCarrete,
  cortina: VarianteCortina,
  rejilla: VarianteRejilla,
  helice: VarianteHelice,
};

// Floating switcher to compare the project layouts in place. It only shows while the section is on screen.
function Selector({ actual }: { actual: VarianteId }) {
  const router = useRouter();
  const path = usePathname();
  const [visible, setVisible] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    const el = document.getElementById("proyectos");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "-20% 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [actual]);

  const elegir = (id: VarianteId) => {
    if (id === actual) return;
    start(() => router.replace(`${path}?proyectos=${id}`, { scroll: false }));
  };

  // After a switch the section changes height, so bring its top back into view (not on first load).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollToId("proyectos");
  }, [actual]);

  return (
    <motion.nav
      aria-label="Versiones de la sección de proyectos"
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 bottom-5 z-50 mx-auto flex w-max max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-full border border-mist/15 bg-[#070b1f]/90 p-1 text-sm text-mist shadow-[0_18px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-md [scrollbar-width:none]",
        !visible && "pointer-events-none",
      )}
    >
      {VARIANTES.map((v) => (
        <button
          key={v.id}
          onClick={() => elegir(v.id)}
          aria-current={v.id === actual ? "true" : undefined}
          className={cn(
            "relative shrink-0 rounded-full px-3.5 py-1.5 transition-colors duration-200 active:scale-[0.97]",
            v.id === actual ? "text-ink" : "text-mist/70 hover:text-mist",
          )}
        >
          {v.id === actual && (
            <motion.span
              layoutId="variante-activa"
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="absolute inset-0 rounded-full bg-mist"
            />
          )}
          <span className="relative">{v.nombre}</span>
        </button>
      ))}
    </motion.nav>
  );
}

export function Proyectos({ variante, selector = true }: { variante: VarianteId; selector?: boolean }) {
  const Componente = COMPONENTES[variante];
  return (
    <>
      <Componente key={variante} />
      {selector && <Selector actual={variante} />}
    </>
  );
}
