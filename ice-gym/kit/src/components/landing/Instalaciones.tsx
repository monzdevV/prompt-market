"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cantidadEnLetra, capitalizar } from "@/lib/formato";
import { Antetitulo, TituloPartido, curva } from "./Movimiento";

type Sala = {
  nombre: string;
  foto: string;
  texto: string;
  alt: string;
  /** Encuadre para que no se lean rótulos de otras marcas. */
  encuadre?: { escala: number; origen: string };
};

const SALAS: Sala[] = [
  {
    nombre: "Poleas",
    foto: "/landing/sala-poleas.jpg",
    texto: "Torres de polea doble a cada lado del pasillo para trabajar cada ángulo con carga guiada.",
    alt: "Pasillo con torres de poleas, bancos y mancuernas bajo luz azul",
  },
  {
    nombre: "Peso libre",
    foto: "/landing/sala-peso-libre.jpg",
    texto: "Racks de mancuernas, discos, jaulas de sentadilla y bancos regulables en la misma sala.",
    alt: "Racks de mancuernas y discos en la sala de peso libre",
    encuadre: { escala: 1.9, origen: "0% 100%" },
  },
  {
    nombre: "Cardio",
    foto: "/landing/sala-cardio.jpg",
    texto: "Cintas con pantalla en fila frente al espejo para calentar, caminar o rodar a tu ritmo.",
    alt: "Fila de cintas de correr con pantalla frente a un espejo",
  },
  {
    nombre: "Ciclo",
    foto: "/landing/sala-ciclo.jpg",
    texto: "Sala de ciclo indoor en semicírculo, con bici de instructor en escenario y luz de estudio.",
    alt: "Bicicletas de ciclo indoor en la sala de ciclo",
    encuadre: { escala: 1.9, origen: "0% 100%" },
  },
  {
    nombre: "Funcional",
    foto: "/landing/sala-funcional.jpg",
    texto: "Pista de césped para arrastres, kettlebells, balones medicinales y zona de esterillas.",
    alt: "Zona funcional con pista de césped, kettlebells y esterillas",
  },
];

const n2 = (i: number) => String(i + 1).padStart(2, "0");

/* Geometría de la pista en vw (sin medir el DOM). */
const ANCHO_INTRO = 40;
const ANCHO_PANEL = 62;
const HUECO = 5;
const ANCHO_PISTA = HUECO + ANCHO_INTRO + SALAS.length * (HUECO + ANCHO_PANEL) + HUECO;
const RECORRIDO = ANCHO_PISTA - 100;
/** Altura del tramo fijado: 84vh de scroll por sala (420vh con cinco). */
const ALTO_GALERIA = `${SALAS.length * 84}vh`;

export function Instalaciones() {
  const reducido = useReducedMotion();

  return (
    <section id="instalaciones" aria-label="Instalaciones" className="relative bg-fondo">
      {reducido ? (
        <ListaVertical animada={false} />
      ) : (
        <>
          <div className="md:hidden">
            <ListaVertical animada />
          </div>
          <div className="hidden md:block">
            <GaleriaFijada />
          </div>
        </>
      )}
    </section>
  );
}

function Intro({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Antetitulo n="02">Instalaciones</Antetitulo>
      <TituloPartido
        texto={`${capitalizar(cantidadEnLetra(SALAS.length, "zona", "zonas", "f"))}.\nTodo a mano.`}
        className="rotulo mt-6 text-[clamp(3.2rem,7vw,8rem)] text-tinta"
      />
      <p className="mt-6 max-w-sm text-base text-tinta-2 md:text-lg">
        De la polea al ciclo sin cambiar de edificio. Recorre las salas.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   Escritorio: galería horizontal fijada al scroll
   --------------------------------------------------------------- */

function GaleriaFijada() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, (p) => `${-p * RECORRIDO}vw`);

  return (
    <div ref={ref} className="relative" style={{ height: ALTO_GALERIA }}>
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <motion.div
          className="flex h-full items-center will-change-transform"
          style={{ x, width: `${ANCHO_PISTA}vw`, paddingLeft: `${HUECO}vw`, gap: `${HUECO}vw` }}
        >
          <div className="shrink-0" style={{ width: `${ANCHO_INTRO}vw` }}>
            <Intro />
          </div>
          {SALAS.map((sala, i) => (
            <PanelSala key={sala.nombre} sala={sala} i={i} progreso={scrollYProgress} />
          ))}
        </motion.div>

        <div className="absolute inset-x-[5vw] bottom-8 flex items-center gap-5">
          <span className="condensada text-xs uppercase tracking-[0.2em] text-tinta-2">Recorrido</span>
          <div className="relative h-px flex-1 bg-linea">
            <motion.div
              className="absolute inset-0 origin-left bg-acento"
              style={{ scaleX: scrollYProgress }}
            />
          </div>
          <span className="cifra text-sm text-tinta-2">{n2(SALAS.length - 1)}</span>
        </div>
      </div>
    </div>
  );
}

function PanelSala({ sala, i, progreso }: { sala: Sala; i: number; progreso: MotionValue<number> }) {
  // Borde izquierdo del panel dentro de la pista (vw).
  const izquierda = HUECO + ANCHO_INTRO + HUECO + i * (ANCHO_PANEL + HUECO);
  // Progreso en el que el panel entra por la derecha, queda a 35vw y sale por la izquierda.
  const entra = (izquierda - 100) / RECORRIDO;
  const asentado = (izquierda - 35) / RECORRIDO;
  const sale = (izquierda + ANCHO_PANEL) / RECORRIDO;

  const revelado = useTransform(progreso, [entra, asentado], [0, 1]);
  const recorte = useTransform(
    revelado,
    (v) => `polygon(0 0, ${v * 118}% 0, ${v * 118 - 18}% 100%, 0 100%)`,
  );
  // La imagen se desplaza a contracorriente: va más despacio que el panel.
  const paralaje = useTransform(progreso, [entra, sale], ["-7%", "7%"]);
  const rotuloX = useTransform(progreso, [entra, sale], ["12%", "-12%"]);

  return (
    <article className="relative flex h-[78vh] shrink-0 flex-col" style={{ width: `${ANCHO_PANEL}vw` }}>
      <div className="flex items-baseline justify-between border-b border-linea pb-3">
        <span className="cifra text-[clamp(2.5rem,4vw,4.5rem)] text-acento-tinta">{n2(i)}</span>
        <span className="condensada text-xs uppercase tracking-[0.2em] text-tinta-2">Zona {n2(i)} / {n2(SALAS.length - 1)}</span>
      </div>

      <motion.div className="relative mt-5 flex-1 overflow-hidden bg-placa" style={{ clipPath: recorte }}>
        <motion.div className="absolute inset-y-0 -inset-x-[10%]" style={{ x: paralaje }}>
          <Foto sala={sala} sizes="(min-width: 768px) 80vw, 100vw" />
        </motion.div>
        <div className="absolute inset-0 bg-fondo/25" aria-hidden />
      </motion.div>

      <motion.h3
        className="rotulo pointer-events-none absolute bottom-[4.5rem] left-[-0.04em] z-10 text-[clamp(4.5rem,10vw,11rem)] text-tinta"
        style={{ x: rotuloX }}
      >
        {sala.nombre}
      </motion.h3>

      <p className="mt-4 max-w-xl text-base text-tinta-2 lg:text-lg">{sala.texto}</p>
    </article>
  );
}

function Foto({ sala, sizes }: { sala: Sala; sizes: string }) {
  const e = sala.encuadre;
  return (
    <Image
      src={sala.foto}
      alt={sala.alt}
      fill
      sizes={sizes}
      className="object-cover"
      style={
        e
          ? { objectPosition: e.origen, transform: `scale(${e.escala})`, transformOrigin: e.origen }
          : undefined
      }
    />
  );
}

/* ---------------------------------------------------------------
   Móvil y movimiento reducido: lista vertical
   --------------------------------------------------------------- */

const OCULTO = "polygon(0 0, 0% 0, -18% 100%, 0 100%)";
const VISIBLE = "polygon(0 0, 118% 0, 100% 100%, 0 100%)";

function ListaVertical({ animada }: { animada: boolean }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-24 md:px-10 md:py-36">
      <Intro />
      <ol className="mt-16 grid gap-16 md:mt-24 md:grid-cols-2 md:gap-x-10 md:gap-y-20">
        {SALAS.map((sala, i) => (
          <li key={sala.nombre}>
            <div className="flex items-baseline gap-4 border-b border-linea pb-3">
              <span className="cifra text-4xl text-acento-tinta">{n2(i)}</span>
              <h3 className="rotulo text-[clamp(3rem,14vw,5.5rem)] text-tinta">{sala.nombre}</h3>
            </div>
            <motion.div
              className="relative mt-4 aspect-[4/3] overflow-hidden bg-placa"
              initial={animada ? { clipPath: OCULTO } : false}
              whileInView={animada ? { clipPath: VISIBLE } : undefined}
              viewport={{ once: true, margin: "0px 0px -15% 0px" }}
              transition={{ duration: 0.9, ease: curva }}
            >
              <Foto sala={sala} sizes="(min-width: 768px) 50vw, 100vw" />
            </motion.div>
            <p className="mt-4 text-base text-tinta-2">{sala.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
