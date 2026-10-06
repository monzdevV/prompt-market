"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { codigoCentro, movimiento } from "@/design/tokens";
import type { ClasePublica, DatosLanding } from "@/lib/datos/publico";
import { MARCA } from "@/marca";
import { Antetitulo, curva, Revelar, TituloPartido } from "./Movimiento";

/* PERSONALIZAR: foto lateral de la sección de clases (en /public/landing), su texto alternativo y su pie. */
const FOTO_CLASES = {
  src: "/landing/sala-ciclo.jpg",
  alt: "Sala de ciclo indoor con las bicis en penumbra y luz azul",
  pie: "Sala de ciclo",
  /** Encuadre (object-position). */
  posicion: "4% 60%",
};

const ZONA = MARCA.zonaHoraria;
const VISIBLES = 8;

// Formateadores con zona fija: servidor y navegador pintan lo mismo (sin desajustes de hidratación).
const fHora = new Intl.DateTimeFormat(MARCA.locale, { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fClaveDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const fDiaSemana = new Intl.DateTimeFormat(MARCA.locale, { timeZone: ZONA, weekday: "long" });
const fDiaMes = new Intl.DateTimeFormat(MARCA.locale, { timeZone: ZONA, day: "numeric", month: "short" });

type Fila = { clase: ClasePublica; indice: number };
type Grupo = { clave: string; semana: string; fecha: string; filas: Fila[] };

function agrupar(clases: ClasePublica[]): Grupo[] {
  const grupos: Grupo[] = [];
  clases.forEach((clase, indice) => {
    const d = new Date(clase.inicio);
    const clave = fClaveDia.format(d);
    let g = grupos[grupos.length - 1];
    if (!g || g.clave !== clave) {
      g = { clave, semana: fDiaSemana.format(d), fecha: fDiaMes.format(d).replace(".", ""), filas: [] };
      grupos.push(g);
    }
    g.filas.push({ clase, indice });
  });
  return grupos;
}

/** "Hoy" / "Mañana" solo tras montar: depende del reloj de quien mira. */
function useRelativos() {
  const clave = useSyncExternalStore(
    suscribirNada,
    () => {
      const ahora = Date.now();
      return `${fClaveDia.format(new Date(ahora))}|${fClaveDia.format(new Date(ahora + 86_400_000))}`;
    },
    () => null,
  );
  if (!clave) return null;
  const [hoy, manana] = clave.split("|");
  return { hoy, manana };
}

const suscribirNada = () => () => {};

const COLUMNAS = "md:grid-cols-[6.5rem_minmax(0,2.2fr)_4.5rem_minmax(0,1fr)_minmax(0,1.2fr)_4.5rem_4.5rem]";

export function Clases({ datos }: { datos: DatosLanding }) {
  const { clases, centros } = datos;
  const reducido = useReducedMotion();
  const seccion = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: seccion, offset: ["start end", "end start"] });
  const yFoto = useTransform(scrollYProgress, [0, 1], reducido ? ["0%", "0%"] : ["-7%", "7%"]);

  const [filtro, setFiltro] = useState<string>("todos");
  const [verTodo, setVerTodo] = useState(false);
  const relativos = useRelativos();

  const porId = useMemo(() => new Map(centros.map((c) => [c.id, c])), [centros]);
  const pestanas = useMemo(
    () => [
      { id: "todos", etiqueta: "Todos", total: clases.length },
      ...centros.map((c) => ({
        id: c.id,
        etiqueta: codigoCentro(c.slug),
        total: clases.filter((x) => x.centro_id === c.id).length,
      })),
    ],
    [centros, clases],
  );

  const filtradas = useMemo(
    () => (filtro === "todos" ? clases : clases.filter((c) => c.centro_id === filtro)),
    [clases, filtro],
  );
  const visibles = verTodo ? filtradas : filtradas.slice(0, VISIBLES);
  const grupos = useMemo(() => agrupar(visibles), [visibles]);
  const ocultas = filtradas.length - visibles.length;
  const centroFiltro = porId.get(filtro);

  const cambiarFiltro = (id: string) => {
    setFiltro(id);
    setVerTodo(false);
  };

  return (
    <section
      ref={seccion}
      id="clases"
      aria-label="Clases"
      className="relative overflow-hidden px-4 py-24 sm:px-8 md:py-36 lg:px-12"
    >
      <div className="mx-auto grid max-w-[96rem] gap-12 lg:grid-cols-12 lg:gap-12">
        {/* Columna de la foto: acompaña con un parallax corto. */}
        <div className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24">
            <div className="corte-d relative aspect-[3/5] overflow-hidden bg-placa">
              <motion.div className="absolute inset-[-8%_0]" style={{ y: yFoto }}>
                <Image
                  src={FOTO_CLASES.src}
                  alt={FOTO_CLASES.alt}
                  fill
                  sizes="25vw"
                  className="object-cover"
                  style={{ objectPosition: FOTO_CLASES.posicion }}
                />
              </motion.div>
            </div>
            <p className="condensada mt-4 text-sm tracking-[0.14em] text-tinta-2">{FOTO_CLASES.pie}</p>
          </div>
        </div>

        <div className="lg:col-span-9">
          <Antetitulo n="05">Clases</Antetitulo>
          <TituloPartido texto={"Próximas\nsalidas."} className="rotulo mt-6 text-[clamp(3rem,10vw,9.5rem)] text-tinta" />

          {clases.length === 0 ? (
            <SinClases centros={centros} />
          ) : (
            <>
              {centros.length > 1 ? (
                <div
                  role="group"
                  aria-label="Filtrar por centro"
                  className="mt-12 flex flex-wrap gap-1 border-b border-linea"
                >
                  {pestanas.map((p) => {
                    const activa = p.id === filtro;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => cambiarFiltro(p.id)}
                        className={`condensada relative min-h-11 px-4 text-sm tracking-[0.14em] transition-colors active:scale-[0.97] ${
                          activa ? "text-sobre-campo" : "text-tinta-2 hover:text-tinta"
                        }`}
                      >
                        {activa ? (
                          <motion.span
                            layoutId="clases-pestana"
                            aria-hidden
                            className="corte-a absolute inset-0 bg-acento"
                            transition={{ duration: movimiento.normal, ease: curva }}
                          />
                        ) : null}
                        <span className="relative flex items-center gap-2">
                          {p.etiqueta}
                          <span className="cifra text-xs opacity-70">{p.total}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Cabecera del panel de salidas */}
              <div
                aria-hidden
                className={`dato mt-8 hidden gap-4 border-b border-linea pb-3 md:grid ${COLUMNAS}`}
              >
                <span>Hora</span>
                <span>Clase</span>
                <span>Centro</span>
                <span>Sala</span>
                <span>Monitor</span>
                <span className="text-right">Dura</span>
                <span className="text-right">Plazas</span>
              </div>

              <div aria-live="polite" className="mt-4 md:mt-0">
                {filtradas.length === 0 ? (
                  <p className="border-b border-linea py-10 text-tinta-2">
                    <span className="condensada text-tinta">Sin clases publicadas en {centroFiltro?.ciudad ?? "este centro"}.</span>{" "}
                    El horario completo está en recepción.
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    {grupos.map((g) => {
                      const relativo =
                        relativos?.hoy === g.clave ? "Hoy" : relativos?.manana === g.clave ? "Mañana" : null;
                      return (
                        <motion.section
                          key={g.clave}
                          layout={!reducido}
                          aria-label={`${g.semana} ${g.fecha}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: movimiento.normal, ease: curva }}
                        >
                          <h3 className="condensada flex items-baseline gap-3 border-b border-linea pb-2 pt-8 text-base tracking-[0.12em] text-tinta">
                            {relativo ? <span className="text-acento-tinta">{relativo}</span> : null}
                            <span className="capitalize">{g.semana}</span>
                            <span className="cifra text-tinta-2">{g.fecha}</span>
                          </h3>
                          <ul>
                            <AnimatePresence initial={false}>
                              {g.filas.map(({ clase }, n) => (
                                <FilaClase
                                  key={clase.id}
                                  clase={clase}
                                  codigo={codigoCentro(porId.get(clase.centro_id)?.slug)}
                                  filtro={filtro}
                                  orden={n}
                                  reducido={!!reducido}
                                />
                              ))}
                            </AnimatePresence>
                          </ul>
                        </motion.section>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {filtradas.length > VISIBLES ? (
                  <button
                    type="button"
                    onClick={() => setVerTodo((v) => !v)}
                    aria-expanded={verTodo}
                    className="condensada corte-d mt-8 inline-flex min-h-11 items-center gap-3 border border-linea bg-placa pl-5 pr-8 text-sm tracking-[0.14em] text-tinta transition-colors hover:border-tinta active:scale-[0.97]"
                  >
                    {verTodo ? "Ver menos" : "Ver más"}
                    {!verTodo ? <span className="cifra text-acento-tinta">+{ocultas}</span> : null}
                  </button>
              ) : null}

              <Revelar retraso={0.1}>
                <p className="mt-10 max-w-xl text-sm text-tinta-2">
                  Plazas limitadas por clase: pregunta en recepción o llama a tu centro. Horas en horario peninsular.
                </p>
              </Revelar>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FilaClase({
  clase,
  codigo,
  filtro,
  orden,
  reducido,
}: {
  clase: ClasePublica;
  codigo: string;
  filtro: string;
  orden: number;
  reducido: boolean;
}) {
  const hora = fHora.format(new Date(clase.inicio));
  const retraso = reducido ? 0 : Math.min(orden, 8) * 0.05;
  const detalle = [clase.disciplina !== clase.nombre ? clase.disciplina : null, clase.nivel].filter(Boolean).join(" · ");

  return (
    <motion.li
      layout={!reducido}
      initial={{ opacity: 0, y: reducido ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: movimiento.rapido } }}
      transition={{ duration: movimiento.normal, ease: curva, delay: retraso }}
      className={`grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-linea py-4 md:gap-4 md:py-5 ${COLUMNAS}`}
    >
      {/* La hora cae como una lama de panel de salidas cada vez que cambia el filtro. */}
      <span className="row-span-2 [perspective:400px] md:row-span-1">
        <motion.time
          key={`${filtro}-${clase.id}`}
          dateTime={clase.inicio}
          className="cifra block origin-top text-[2.5rem] text-tinta md:text-5xl"
          initial={reducido ? false : { rotateX: -90, opacity: 0.2 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: movimiento.lento, ease: curva, delay: retraso + 0.05 }}
        >
          {hora}
        </motion.time>
      </span>

      <span className="min-w-0">
        <span className="rotulo block truncate text-2xl text-tinta md:text-3xl">{clase.nombre}</span>
        {detalle ? <span className="dato mt-1 block truncate">{detalle}</span> : null}
      </span>

      {/* Móvil: los datos secundarios en una línea bajo el nombre. */}
      <span className="condensada col-start-2 flex flex-wrap gap-x-3 text-xs tracking-[0.08em] text-tinta-2 md:hidden">
        <span className="text-acento-tinta">{codigo}</span>
        {clase.sala ? <span>{clase.sala}</span> : null}
        {clase.monitor ? <span>{clase.monitor}</span> : null}
        <span className="cifra">{clase.duracion_min} min</span>
        <span className="cifra">{clase.plazas} plazas</span>
      </span>

      <span className="cifra hidden text-2xl text-acento-tinta md:block">{codigo}</span>
      <span className="hidden truncate text-tinta-2 md:block">{clase.sala ?? "—"}</span>
      <span className="hidden truncate text-tinta-2 md:block">{clase.monitor ?? "—"}</span>
      <span className="hidden text-right md:block">
        <span className="cifra text-2xl text-tinta">{clase.duracion_min}</span>
        <span className="text-xs text-tinta-2"> min</span>
      </span>
      <span className="hidden text-right md:block">
        <span className="cifra text-2xl text-tinta">{clase.plazas}</span>
        <span className="sr-only"> plazas</span>
      </span>
    </motion.li>
  );
}

function SinClases({ centros }: { centros: DatosLanding["centros"] }) {
  return (
    <Revelar className="mt-12 border-y border-linea py-10 md:py-14">
      <p className="cifra text-[clamp(3rem,9vw,7rem)] text-tinta-2" aria-hidden>
        --:--
      </p>
      <p className="rotulo mt-6 text-[clamp(1.75rem,4vw,3rem)] text-tinta">Horario de la semana en recepción.</p>
      <p className="mt-4 max-w-xl text-tinta-2">
        Todavía no hay clases publicadas aquí. Pregunta en tu centro o llama y te decimos qué hay esta semana.
      </p>
      {centros.length ? (
        <ul className="mt-8 flex flex-wrap gap-3">
          {centros
            .filter((c) => c.telefono)
            .map((c) => (
              <li key={c.id}>
                <a
                  href={`tel:${c.telefono!.replace(/\s+/g, "")}`}
                  className="condensada inline-flex min-h-11 items-center gap-3 border border-linea px-4 text-sm text-tinta transition-colors hover:border-tinta active:scale-[0.97]"
                >
                  <span className="cifra text-acento-tinta">{codigoCentro(c.slug)}</span>
                  <span className="cifra text-base">{c.telefono}</span>
                </a>
              </li>
            ))}
        </ul>
      ) : null}
    </Revelar>
  );
}
