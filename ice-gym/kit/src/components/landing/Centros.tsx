"use client";

import { ArrowUpRight, Phone } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { codigoCentro, movimiento } from "@/design/tokens";
import type { DatosLanding } from "@/lib/datos/publico";
import type { Centro } from "@/lib/tipos";
import { ciudadesUnicas } from "@/lib/centros";
import { cantidadEnLetra, capitalizar, listaNatural } from "@/lib/formato";
import { MARCA } from "@/marca";
import { Antetitulo, curva, Revelar, TituloPartido } from "./Movimiento";

/* ---------------------------------------------------------------
   Imagen de cada centro: asignación estable por código, con reserva por posición.
   PERSONALIZAR: fotos en /public/landing y, si quieres fijar qué foto lleva
   cada centro, su código de tres letras en FOTO_POR_CODIGO (índice de FOTOS).
   Un centro que no esté en el mapa recibe la foto de su posición (módulo FOTOS).
   --------------------------------------------------------------- */

type Foto = { src: string; alt: string; posicion: string };

const FOTOS: Foto[] = [
  { src: "/landing/fachada-frontal.jpg", alt: `Fachada de ${MARCA.nombre} de noche, con la entrada iluminada en azul`, posicion: "50% 50%" },
  { src: "/landing/fachada-esquina.jpg", alt: `Esquina del edificio de ${MARCA.nombre} iluminada de noche`, posicion: "50% 50%" },
  { src: "/landing/sala-funcional.jpg", alt: "Sala de entrenamiento funcional con kettlebells y balones medicinales", posicion: "22% 50%" },
];

const FOTO_POR_CODIGO: Record<string, number> = { CHA: 0, POB: 1, RUZ: 2 };

function fotoDe(centro: Centro, i: number): Foto {
  const n = FOTO_POR_CODIGO[codigoCentro(centro.slug || centro.nombre)];
  const indice = n !== undefined && n >= 0 && n < FOTOS.length ? n : i;
  return FOTOS[indice % FOTOS.length];
}

/* ---------------------------------------------------------------
   Horario: "L-V 6:30-23:30 · S-D 8:00-22:00" → abierto / cerrado en la zona horaria de la marca.
   --------------------------------------------------------------- */

const LETRAS = ["L", "M", "X", "J", "V", "S", "D"];
type Tramo = { dias: Set<number>; abre: number; cierra: number };

function leerHorario(horario: string | null): Tramo[] {
  if (!horario) return [];
  const tramos: Tramo[] = [];
  for (const parte of horario.split(/[·,;|]/)) {
    const m = parte.trim().match(/^([LMXJVSD])(?:\s*-\s*([LMXJVSD]))?\s+(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/i);
    if (!m) continue;
    const desde = LETRAS.indexOf(m[1].toUpperCase());
    const hasta = m[2] ? LETRAS.indexOf(m[2].toUpperCase()) : desde;
    const dias = new Set<number>();
    for (let d = desde; ; d = (d + 1) % 7) {
      dias.add(d);
      if (d === hasta) break;
    }
    tramos.push({ dias, abre: +m[3] * 60 + +m[4], cierra: +m[5] * 60 + +m[6] });
  }
  return tramos;
}

const DIAS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const relojMadrid = new Intl.DateTimeFormat("en-US", {
  timeZone: MARCA.zonaHoraria,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ahoraMadrid() {
  const partes = Object.fromEntries(relojMadrid.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { dia: DIAS_EN.indexOf(partes.weekday), minuto: (+partes.hour % 24) * 60 + +partes.minute };
}

const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const NOMBRE_DIA = ["el lunes", "el martes", "el miércoles", "el jueves", "el viernes", "el sábado", "el domingo"];

type Estado = { abierto: boolean; texto: string };

function estadoCentro(tramos: Tramo[]): Estado | null {
  if (!tramos.length) return null;
  const { dia, minuto } = ahoraMadrid();
  const hoy = tramos.find((t) => t.dias.has(dia));
  if (hoy && minuto >= hoy.abre && minuto < hoy.cierra) return { abierto: true, texto: `Abierto ahora · cierra a las ${hhmm(hoy.cierra)}` };
  if (hoy && minuto < hoy.abre) return { abierto: false, texto: `Cerrado · abre hoy a las ${hhmm(hoy.abre)}` };
  for (let s = 1; s <= 7; s++) {
    const d = (dia + s) % 7;
    const t = tramos.find((x) => x.dias.has(d));
    if (t) return { abierto: false, texto: `Cerrado · abre ${s === 1 ? "mañana" : NOMBRE_DIA[d]} a las ${hhmm(t.abre)}` };
  }
  return null;
}

/** Se calcula solo en cliente y tras montar: el servidor no sabe qué hora es en los centros para quien mira. */
function useEstados(centros: Centro[]) {
  const [estados, setEstados] = useState<(Estado | null)[] | null>(null);
  useEffect(() => {
    const calcular = () => setEstados(centros.map((c) => estadoCentro(leerHorario(c.horario))));
    calcular();
    const id = window.setInterval(calcular, 60_000);
    return () => window.clearInterval(id);
  }, [centros]);
  return estados;
}

function EstadoApertura({ estado, montado }: { estado: Estado | null | undefined; montado: boolean }) {
  return (
    <p className="condensada flex min-h-5 items-center gap-2 text-sm text-tinta-2" aria-live="polite">
      {montado && estado ? (
        <motion.span
          className="flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: movimiento.normal, ease: curva }}
        >
          <span
            aria-hidden
            className={`size-2 shrink-0 ${estado.abierto ? "bg-acento" : "border border-tinta-2"}`}
          />
          <span className={estado.abierto ? "text-tinta" : undefined}>{estado.texto}</span>
        </motion.span>
      ) : null}
    </p>
  );
}

/* ---------------------------------------------------------------
   Panel de imagen: cada foto entra con un barrido diagonal de clip-path.
   --------------------------------------------------------------- */

// Borde izquierdo inclinado (~70°): la foto entra de derecha a izquierda.
const OCULTA = "polygon(120% 0%, 140% 0%, 140% 100%, 100% 100%)";
const VISIBLE = "polygon(-20% 0%, 140% 0%, 140% 100%, -40% 100%)";

function PanelImagen({ centros, activo, previo }: { centros: Centro[]; activo: number; previo: number | null }) {
  const reducido = useReducedMotion();
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-placa">
      {centros.map((c, i) => {
        const foto = fotoDe(c, i);
        const estado = i === activo ? "visible" : i === previo ? "debajo" : "oculta";
        return (
          <motion.div
            key={c.id}
            className="absolute inset-0"
            initial={false}
            animate={estado}
            variants={{
              visible: { clipPath: VISIBLE, zIndex: 2, transition: { duration: reducido ? 0 : movimiento.lento, ease: curva } },
              debajo: { clipPath: VISIBLE, zIndex: 1, transition: { duration: 0 } },
              oculta: { clipPath: OCULTA, zIndex: 0, transition: { duration: 0 } },
            }}
            aria-hidden={i !== activo}
          >
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ scale: i === activo && !reducido ? 1 : 1.08 }}
              transition={{ duration: i === activo ? 1.1 : 0, ease: curva }}
            >
              <Image
                src={foto.src}
                alt={i === activo ? foto.alt : ""}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                style={{ objectPosition: foto.posicion }}
              />
            </motion.div>
          </motion.div>
        );
      })}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 bg-fondo/80 px-5 py-4">
        <span className="condensada text-sm tracking-[0.2em] text-tinta-2">Centro</span>
        <span className="cifra text-5xl text-tinta">{codigoCentro(centros[activo]?.slug)}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Sección
   --------------------------------------------------------------- */

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Búsqueda en Google Maps: marca + dirección, y la ciudad sólo si la dirección no la lleva ya. */
const mapa = (c: Centro) => {
  const ciudad = sinAcentos(c.ciudad ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const yaLleva = !ciudad || new RegExp(`(^|[^a-z])${ciudad}([^a-z]|$)`).test(sinAcentos(c.direccion));
  const consulta = `${MARCA.nombre} ${c.direccion}${yaLleva ? "" : `, ${c.ciudad}`}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
};

export function Centros({ datos }: { datos: DatosLanding }) {
  const centros = datos.centros;
  const [activo, setActivo] = useState(0);
  const [previo, setPrevio] = useState<number | null>(null);
  const estados = useEstados(centros);
  const montado = estados !== null;

  const activar = (i: number) => {
    if (i === activo) return;
    setPrevio(activo);
    setActivo(i);
  };

  if (!centros.length) return null;
  const ciudades = ciudadesUnicas(centros);

  return (
    <section id="centros" aria-label="Centros" className="relative px-4 py-24 sm:px-8 md:py-36 lg:px-12">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-12 grid gap-6 md:mb-20 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Antetitulo n="04">Centros</Antetitulo>
            <TituloPartido
              texto={`${capitalizar(cantidadEnLetra(ciudades.length, "ciudad", "ciudades", "f"))}.\nEl mismo hielo.`}
              className="rotulo mt-6 text-[clamp(3rem,10vw,9.5rem)] text-tinta"
            />
          </div>
          <Revelar retraso={0.2} className="lg:col-span-4">
            <p className="max-w-md text-base text-tinta-2 md:text-lg">
              {listaNatural(ciudades)}. Dirección, horario y teléfono de cada centro, sin rodeos.
            </p>
          </Revelar>
        </header>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <ol className="border-t border-linea lg:col-span-7">
            {centros.map((c, i) => {
              const codigo = codigoCentro(c.slug);
              const esActivo = i === activo;
              const foto = fotoDe(c, i);
              return (
                <Revelar as="li" key={c.id} retraso={i * 0.06} y={20}>
                  <article
                    className="relative border-b border-linea py-8 pl-6 md:py-10 md:pl-10"
                    onMouseEnter={() => activar(i)}
                    onFocus={() => activar(i)}
                    onPointerDown={() => activar(i)}
                    aria-label={`${c.nombre}, ${c.ciudad}`}
                  >
                    {esActivo ? (
                      <motion.span
                        layoutId="centro-indicador"
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-1.5 bg-acento"
                        transition={{ duration: movimiento.normal, ease: curva }}
                      />
                    ) : null}

                    <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                      <span
                        aria-hidden
                        className={`cifra text-[clamp(4.5rem,13vw,10rem)] transition-colors duration-300 ${
                          esActivo ? "text-acento-tinta" : "text-tinta"
                        }`}
                      >
                        {codigo}
                      </span>
                      <div className="pb-1">
                        <h3 className="rotulo text-[clamp(2rem,4.5vw,3.5rem)] text-tinta">{c.ciudad}</h3>
                        <p className="condensada mt-1 text-sm tracking-[0.12em] text-tinta-2">{c.nombre}</p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <EstadoApertura estado={estados?.[i]} montado={montado} />
                    </div>

                    <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 md:text-base">
                      <div>
                        <dt className="dato">Dirección</dt>
                        <dd className="mt-1 text-tinta">{c.direccion}</dd>
                      </div>
                      {c.horario ? (
                        <div>
                          <dt className="dato">Horario</dt>
                          <dd className="cifra mt-1.5 text-lg text-tinta">{c.horario}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="dato">Aforo</dt>
                        <dd className="mt-1 text-tinta">
                          <span className="cifra text-2xl">{c.aforo}</span> <span className="text-tinta-2">personas</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {c.telefono ? (
                        <a
                          href={`tel:${c.telefono.replace(/\s+/g, "")}`}
                          className="condensada inline-flex min-h-11 items-center gap-2 border border-linea px-4 text-sm text-tinta transition-colors hover:border-tinta active:scale-[0.97]"
                        >
                          <Phone size={16} weight="bold" aria-hidden />
                          <span className="cifra text-base">{c.telefono}</span>
                        </a>
                      ) : null}
                      <a
                        href={mapa(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="condensada corte-d inline-flex min-h-11 items-center gap-2 bg-acento pl-4 pr-6 text-sm text-sobre-campo transition-transform active:scale-[0.97]"
                      >
                        Cómo llegar
                        <ArrowUpRight size={16} weight="bold" aria-hidden />
                        <span className="sr-only">(Google Maps, se abre en otra pestaña)</span>
                      </a>
                    </div>

                    {/* Móvil y tableta: la foto va dentro de la fila. */}
                    <div className="corte-i relative mt-6 aspect-[16/10] overflow-hidden bg-placa lg:hidden">
                      <Image
                        src={foto.src}
                        alt={foto.alt}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        style={{ objectPosition: foto.posicion }}
                      />
                    </div>
                  </article>
                </Revelar>
              );
            })}
          </ol>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-24">
              <PanelImagen centros={centros} activo={activo} previo={previo} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
