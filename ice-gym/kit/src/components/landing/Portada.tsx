"use client";

import { ArrowDown, ArrowRight } from "@phosphor-icons/react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import type { DatosLanding } from "@/lib/datos/publico";
import { codigoCentro } from "@/design/tokens";
import { cantidadEnLetra, capitalizar, dineroExacto, listaNatural } from "@/lib/formato";
import { ciudadesUnicas, columnas, COLUMNAS_CENTROS, lugaresDeCentros } from "@/lib/centros";
import { MARCA } from "@/marca";
import { curva, TituloPartido } from "./Movimiento";
import { irA } from "./ScrollSuave";

/** "L-V 6:30-23:30 · S-D 8:00-22:00" → tramo de hoy (hora local de los centros). */
function horarioHoy(horario: string | null) {
  if (!horario) return null;
  const dia = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: MARCA.zonaHoraria }).format(new Date());
  const finde = dia === "Sat" || dia === "Sun";
  const tramo = horario.match(finde ? /S-D\s*([\d:]+)\s*-\s*([\d:]+)/ : /L-V\s*([\d:]+)\s*-\s*([\d:]+)/);
  return tramo ? `${tramo[1]}–${tramo[2]}` : horario;
}

const MOVIL_CURSOR = 10; // px máximos que la foto sigue al cursor

export function Portada({ datos }: { datos: DatosLanding }) {
  const seccion = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();

  // Parallax ligado al scroll: la foto baja más lenta que la página y el texto se aparta.
  const { scrollYProgress } = useScroll({ target: seccion, offset: ["start start", "end start"] });
  const fotoY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const textoY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const textoOpacidad = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Firma: la foto responde un poco al cursor.
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const muelle = { stiffness: 60, damping: 20, mass: 0.6 };
  const x = useSpring(cx, muelle);
  const y = useSpring(cy, muelle);

  function alMover(e: React.PointerEvent) {
    if (reducido || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    cx.set(((e.clientX - r.left) / r.width - 0.5) * -2 * MOVIL_CURSOR);
    cy.set(((e.clientY - r.top) / r.height - 0.5) * -2 * MOVIL_CURSOR);
  }

  const precios = datos.tarifas.map((t) => Number(t.cuota_mensual)).filter((n) => n > 0);
  const desde = precios.length ? Math.min(...precios) : null;
  const ciudades = ciudadesUnicas(datos.centros);
  const lugar = lugaresDeCentros(datos.centros);
  const lugares = [...new Set(datos.centros.map(lugar))];
  const nCentros = datos.centros.length;
  const pausaTitulo = 0.35;

  return (
    <section
      id="portada"
      ref={seccion}
      onPointerMove={alMover}
      onPointerLeave={() => {
        cx.set(0);
        cy.set(0);
      }}
      className="relative flex h-svh min-h-[600px] flex-col overflow-hidden bg-fondo"
    >
      {/* Foto a sangre: capa de scroll → zoom de entrada → cursor. */}
      <motion.div aria-hidden className="absolute inset-0" style={{ y: reducido ? 0 : fotoY }}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: curva }}
        >
          <motion.div className="absolute -inset-4" style={{ x, y }}>
            <Image
              src="/landing/sala-poleas.jpg"
              alt=""
              fill
              preload
              sizes="100vw"
              className="object-cover object-[50%_60%]"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Oscurecido sólido para que el texto se lea; más denso a la izquierda en escritorio. */}
      <div aria-hidden className="absolute inset-0 bg-fondo/60" />
      <div aria-hidden className="absolute inset-y-0 left-0 hidden w-[55%] bg-fondo/35 lg:block" />

      <motion.div
        className="relative z-10 flex flex-1 flex-col justify-end px-4 pb-8 pt-24 sm:px-6 lg:px-10 lg:pb-12"
        style={reducido ? undefined : { y: textoY, opacity: textoOpacidad }}
      >
        <motion.p
          className="condensada mb-5 flex items-center gap-3 text-sm tracking-[0.22em] text-tinta-2"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: curva, delay: 0.15 }}
        >
          <span className="h-px w-10 bg-acento" aria-hidden />
          {lugares.length ? lugares.join(" · ") : MARCA.nombre}
        </motion.p>

        <TituloPartido
          as="h1"
          alMontar
          retraso={pausaTitulo}
          escalon={0.08}
          texto={"Entrena\nen frío."}
          className="rotulo max-w-[12ch] text-[clamp(4.6rem,15.5vw,13rem)] leading-[0.84] text-tinta"
        />

        <motion.div
          className="mt-7 flex max-w-xl flex-col gap-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: curva, delay: pausaTitulo + 0.45 }}
        >
          <p className="text-[1.05rem] leading-relaxed text-tinta sm:text-lg">
            {nCentros > 0 && (
              <>
                {capitalizar(cantidadEnLetra(nCentros, "centro", "centros"))} en {listaNatural(ciudades)}.{" "}
              </>
            )}
            Acceso libre, clases colectivas y sin permanencia.
            {desde !== null && (
              <>
                {" "}
                Desde <span className="cifra text-[1.35em] text-acento-tinta">{dineroExacto(desde)}</span> al mes.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#visita"
              onClick={(e) => {
                e.preventDefault();
                irA("visita");
              }}
              className="condensada corte-d group inline-flex min-h-13 items-center gap-3 bg-acento pl-5 pr-10 text-lg tracking-[0.1em] text-sobre-campo transition-transform duration-150 active:scale-[0.97]"
            >
              Reserva tu visita
              <ArrowRight
                aria-hidden
                size={20}
                weight="bold"
                className="transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
              />
            </a>
            <a
              href="#tarifas"
              onClick={(e) => {
                e.preventDefault();
                irA("tarifas");
              }}
              className="condensada inline-flex min-h-13 items-center border-b border-linea px-1 text-lg tracking-[0.1em] text-tinta transition-colors duration-150 hover:border-acento active:scale-[0.97]"
            >
              Ver tarifas
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* Marcador de retransmisión: un centro por columna, con el horario de hoy. */}
      {nCentros > 0 && (
        <div className="relative z-10 border-t border-linea bg-fondo">
          <ul className={`grid ${columnas(COLUMNAS_CENTROS, nCentros)}`}>
            {datos.centros.map((c, i) => (
              <motion.li
                key={c.id}
                className="flex min-w-0 flex-col gap-1.5 border-l border-linea px-3 py-3 first:border-l-0 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-4 lg:px-10"
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: "0%" }}
                transition={{ duration: 0.7, ease: curva, delay: pausaTitulo + 0.7 + i * 0.06 }}
              >
                <span className="cifra corte-d bg-acento py-1 pl-2 pr-4 text-lg text-sobre-campo sm:text-xl">
                  {codigoCentro(c.slug || c.nombre)}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="condensada truncate text-sm tracking-[0.08em] text-tinta sm:text-base">
                    {lugar(c)}
                  </span>
                  <span className="cifra truncate text-sm text-tinta-2 sm:text-base" suppressHydrationWarning>
                    <span className="dato mr-1.5 text-[0.7rem]">Hoy</span>
                    {horarioHoy(c.horario) ?? "—"}
                  </span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Indicador de scroll */}
      <motion.button
        type="button"
        onClick={() => irA("instalaciones")}
        aria-label="Bajar a instalaciones"
        className="absolute bottom-24 right-4 z-10 hidden size-11 items-center justify-center text-tinta-2 transition-colors hover:text-tinta sm:right-6 md:flex lg:right-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: pausaTitulo + 1.1 }}
      >
        <motion.span
          className="flex"
          animate={reducido ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={22} weight="light" aria-hidden />
        </motion.span>
      </motion.button>
    </section>
  );
}
