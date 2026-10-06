"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { movimiento } from "@/design/tokens";

/** Primitivas de animación compartidas por todas las secciones de la landing. */

export const curva = movimiento.curva;
export const curvaMovimiento = movimiento.curvaMovimiento;

/** Sube y aparece al entrar en pantalla, una sola vez. */
export function Revelar({
  children,
  retraso = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  retraso?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "p" | "span";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: movimiento.lento, ease: curva, delay: retraso }}
    >
      {children}
    </Comp>
  );
}

/**
 * Titular que entra palabra a palabra desde detrás de una máscara.
 * El texto completo queda en aria-label para lectores de pantalla.
 */
export function TituloPartido({
  texto,
  className,
  retraso = 0,
  escalon = 0.06,
  as = "h2",
  alMontar = false,
}: {
  texto: string;
  className?: string;
  retraso?: number;
  escalon?: number;
  as?: "h1" | "h2" | "h3" | "p";
  /** true: anima al montar (portada) en lugar de al entrar en pantalla. */
  alMontar?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const visto = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reducido = useReducedMotion();
  const activo = alMontar || visto;
  const Etiqueta = as;
  const lineas = texto.split("\n");
  let i = 0;

  return (
    <Etiqueta ref={ref} className={className} aria-label={texto.replace(/\n/g, " ")}>
      {lineas.map((linea, l) => (
        <span key={l} className="block" aria-hidden>
          {linea.split(" ").map((palabra, p) => {
            const n = i++;
            return (
              <span key={p} className="inline-block overflow-hidden pb-[0.06em] align-bottom">
                <motion.span
                  className="inline-block will-change-transform"
                  initial={reducido ? false : { y: "110%" }}
                  animate={activo ? { y: "0%" } : undefined}
                  transition={{ duration: 0.9, ease: curva, delay: retraso + n * escalon }}
                >
                  {palabra}
                  {p < linea.split(" ").length - 1 ? " " : ""}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </Etiqueta>
  );
}

/** Etiqueta de sección: código tipo marcador + línea. Ej.: <Antetitulo n="02">Instalaciones</Antetitulo> */
export function Antetitulo({ n, children, className = "" }: { n: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={`condensada flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-tinta-2 ${className}`}>
      <span className="cifra text-acento-tinta">{n}</span>
      <span className="h-px w-10 bg-linea" aria-hidden />
      {children}
    </p>
  );
}
