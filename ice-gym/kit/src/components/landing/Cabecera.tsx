"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useState } from "react";
import type { DatosLanding } from "@/lib/datos/publico";
import { MARCA } from "@/marca";
import { Logotipo } from "@/components/marca/Logotipo";
import { curva } from "./Movimiento";
import { bloquearScroll, irA } from "./ScrollSuave";

const enlaces = [
  { id: "instalaciones", texto: "Instalaciones" },
  { id: "tarifas", texto: "Tarifas" },
  { id: "centros", texto: "Centros" },
  { id: "clases", texto: "Clases" },
];

/** Barra fija mínima: se esconde al bajar, vuelve al subir; menú móvil a pantalla completa. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- misma firma que el resto de secciones
export function Cabecera(_: { datos: DatosLanding }) {
  const { scrollY } = useScroll();
  const [oculta, setOculta] = useState(false);
  const [arriba, setArriba] = useState(true);
  const [abierto, setAbierto] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previo = scrollY.getPrevious() ?? 0;
    setArriba(y < 24);
    if (y < 120) setOculta(false);
    else if (y > previo + 4) setOculta(true);
    else if (y < previo - 4) setOculta(false);
  });

  useEffect(() => {
    bloquearScroll(abierto);
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  useEffect(() => () => bloquearScroll(false), []);

  function ir(e: React.MouseEvent, id: string) {
    e.preventDefault();
    if (abierto) {
      setAbierto(false);
      bloquearScroll(false);
      requestAnimationFrame(() => irA(id));
    } else irA(id);
  }

  return (
    <>
      <motion.header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          arriba && !abierto ? "border-transparent bg-transparent" : "border-linea bg-fondo"
        }`}
        animate={{ y: oculta && !abierto ? "-100%" : "0%" }}
        transition={{ duration: 0.32, ease: curva }}
      >
        <div className="flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
          <a
            href="#portada"
            onClick={(e) => ir(e, "portada")}
            className="-my-2 flex min-h-11 items-center py-2 text-[1.7rem]"
            aria-label={`${MARCA.nombre}, volver arriba`}
          >
            <Logotipo />
          </a>

          <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
            {enlaces.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={(e) => ir(e, l.id)}
                className="condensada group relative py-3 text-[0.95rem] tracking-[0.12em] text-tinta-2 transition-colors duration-150 hover:text-tinta"
              >
                {l.texto}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-2 h-px origin-left scale-x-0 bg-acento transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-x-100"
                />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#visita"
              onClick={(e) => ir(e, "visita")}
              className="condensada corte-d hidden min-h-11 items-center bg-acento pl-4 pr-7 text-[0.95rem] tracking-[0.1em] text-sobre-campo transition-transform duration-150 active:scale-[0.97] sm:inline-flex"
            >
              Reserva tu visita
            </a>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
              className="relative -mr-2 flex size-11 items-center justify-center md:hidden"
            >
              <motion.span
                aria-hidden
                className="absolute h-0.5 w-6 bg-tinta"
                animate={abierto ? { y: 0, rotate: 45 } : { y: -4, rotate: 0 }}
                transition={{ duration: 0.32, ease: curva }}
              />
              <motion.span
                aria-hidden
                className="absolute h-0.5 w-6 bg-tinta"
                animate={abierto ? { y: 0, rotate: -45, width: 24 } : { y: 4, rotate: 0, width: 16 }}
                transition={{ duration: 0.32, ease: curva }}
              />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id="menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-0 z-40 flex flex-col bg-fondo px-4 pb-8 pt-24 sm:px-6 md:hidden"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: curva }}
          >
            <nav aria-label="Menú móvil" className="flex flex-1 flex-col justify-center">
              <ul className="flex flex-col gap-1">
                {[...enlaces, { id: "visita", texto: "Visita" }].map((l, i) => (
                  <li key={l.id} className="overflow-hidden">
                    <motion.a
                      href={`#${l.id}`}
                      onClick={(e) => ir(e, l.id)}
                      className="rotulo flex items-baseline gap-4 py-1 text-[clamp(3.2rem,17vw,6rem)] text-tinta active:text-acento-tinta"
                      initial={{ y: "105%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "105%", transition: { duration: 0.16 } }}
                      transition={{ duration: 0.7, ease: curva, delay: 0.18 + i * 0.05 }}
                    >
                      <span className="cifra not-italic text-base text-acento-tinta">0{i + 1}</span>
                      {l.texto}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </nav>
            <motion.a
              href="#visita"
              onClick={(e) => ir(e, "visita")}
              className="condensada corte-d flex min-h-14 items-center justify-between bg-acento pl-5 pr-10 text-lg tracking-[0.1em] text-sobre-campo active:scale-[0.97]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.16 } }}
              transition={{ duration: 0.32, ease: curva, delay: 0.45 }}
            >
              Reserva tu visita
              <ArrowRight aria-hidden size={22} weight="bold" />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
