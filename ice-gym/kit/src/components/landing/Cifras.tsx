"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { DatosLanding } from "@/lib/datos/publico";
import type { Centro } from "@/lib/tipos";
import { codigoCentro } from "@/design/tokens";
import { ciudadesUnicas } from "@/lib/centros";
import { MARCA, sinMarca } from "@/marca";
import { curva } from "./Movimiento";

/* ---------------------------------------------------------------
   Cálculos: solo datos reales de la base de datos
   --------------------------------------------------------------- */

const RANGO = /(\d{1,2})(?:[:.h](\d{2}))?\s*(?:-|–|—|a)\s*(\d{1,2})(?:[:.h](\d{2}))?/g;

/** Mayor tramo de apertura (en horas) que aparece en el texto de horario. */
function horasDeApertura(horario: string | null): number | null {
  if (!horario) return null;
  let max: number | null = null;
  for (const m of horario.matchAll(RANGO)) {
    const inicio = Number(m[1]) + Number(m[2] ?? 0) / 60;
    let fin = Number(m[3]) + Number(m[4] ?? 0) / 60;
    if (inicio > 24 || fin > 24) continue;
    if (fin <= inicio) fin += 24;
    const tramo = fin - inicio;
    if (tramo > 0 && tramo <= 24 && (max === null || tramo > max)) max = tramo;
  }
  return max;
}

type Cifra = {
  clave: string;
  valor: number;
  decimales: number;
  sufijo?: string;
  etiqueta: string;
  nota?: string;
};

function calcularCifras(datos: DatosLanding): Cifra[] {
  const { centros, tarifas } = datos;
  const cifras: Cifra[] = [];

  if (centros.length) {
    const ciudades = ciudadesUnicas(centros).length;
    cifras.push({
      clave: "centros",
      valor: centros.length,
      decimales: 0,
      etiqueta: centros.length === 1 ? "Centro" : "Centros",
      nota: `${ciudades} ${ciudades === 1 ? "ciudad" : "ciudades"}`,
    });

    const aforo = centros.reduce((s, c) => s + (Number(c.aforo) || 0), 0);
    if (aforo > 0) {
      cifras.push({ clave: "aforo", valor: aforo, decimales: 0, etiqueta: "Plazas de aforo", nota: "Sumando todos los centros" });
    }

    let mejor: { horas: number; centro: Centro } | null = null;
    for (const c of centros) {
      const h = horasDeApertura(c.horario);
      if (h !== null && (!mejor || h > mejor.horas)) mejor = { horas: h, centro: c };
    }
    if (mejor) {
      cifras.push({
        clave: "horas",
        valor: Math.round(mejor.horas * 10) / 10,
        decimales: Number.isInteger(Math.round(mejor.horas * 10) / 10) ? 0 : 1,
        sufijo: "h",
        etiqueta: "Abierto al día",
        nota: `En ${sinMarca(mejor.centro.nombre)}`,
      });
    }
  }

  const cuotas = tarifas.map((t) => Number(t.cuota_mensual)).filter((n) => Number.isFinite(n) && n > 0);
  if (cuotas.length) {
    cifras.push({ clave: "precio", valor: Math.min(...cuotas), decimales: 2, sufijo: "€", etiqueta: "Al mes, desde", nota: "Sin permanencia" });
  }

  return cifras;
}

/* ---------------------------------------------------------------
   Contador: sube de 0 al valor real al entrar en pantalla
   --------------------------------------------------------------- */

function partes(valor: number, decimales: number) {
  const txt = new Intl.NumberFormat(MARCA.locale, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
  const [entero, fraccion] = txt.split(",");
  return { entero, fraccion: fraccion ? `,${fraccion}` : "" };
}

function Contador({ cifra, activo }: { cifra: Cifra; activo: boolean }) {
  const enteroRef = useRef<HTMLSpanElement>(null);
  const fraccionRef = useRef<HTMLSpanElement>(null);
  const reducido = useReducedMotion();
  const final = partes(cifra.valor, cifra.decimales);

  const pintar = (v: number) => {
    const p = partes(v, cifra.decimales);
    if (enteroRef.current) enteroRef.current.textContent = p.entero;
    if (fraccionRef.current) fraccionRef.current.textContent = p.fraccion;
  };

  // El HTML del servidor trae la cifra final; al hidratar se pone a cero hasta que se vea.
  useEffect(() => {
    if (reducido || activo) return;
    pintar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducido]);

  useEffect(() => {
    if (!activo) return;
    if (reducido) {
      pintar(cifra.valor);
      return;
    }
    const control = animate(0, cifra.valor, { duration: 1.6, ease: curva, onUpdate: pintar });
    return () => control.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, reducido, cifra.valor]);

  return (
    <>
      <span className="sr-only">
        {final.entero}
        {final.fraccion} {cifra.sufijo}
      </span>
      <span aria-hidden className="cifra flex items-start leading-[0.8] tabular-nums">
        {/* Rejilla con la cifra final invisible debajo: el ancho queda fijo y no baila. */}
        <span className="grid text-[clamp(4.25rem,11vw,10rem)]">
          <span className="invisible col-start-1 row-start-1">{final.entero}</span>
          <span ref={enteroRef} className="col-start-1 row-start-1 text-right">
            {final.entero}
          </span>
        </span>
        {(final.fraccion || cifra.sufijo) && (
          <span className="ml-1 flex flex-col pt-[0.35em] text-[clamp(1.4rem,3vw,2.5rem)] leading-none">
            {final.fraccion && (
              <span className="grid">
                <span className="invisible col-start-1 row-start-1">{final.fraccion}</span>
                <span ref={fraccionRef} className="col-start-1 row-start-1">
                  {final.fraccion}
                </span>
              </span>
            )}
            {cifra.sufijo && <span className="text-acento-tinta">{cifra.sufijo}</span>}
          </span>
        )}
      </span>
    </>
  );
}

/* ---------------------------------------------------------------
   Sección
   --------------------------------------------------------------- */

export function Cifras({ datos }: { datos: DatosLanding }) {
  const cifras = calcularCifras(datos);
  const centros = datos.centros;
  const maxAforo = Math.max(1, ...centros.map((c) => Number(c.aforo) || 0));

  const marcadorRef = useRef<HTMLDListElement>(null);
  const marcadorVisto = useInView(marcadorRef, { once: true, margin: "0px 0px -15% 0px" });
  const tablaRef = useRef<HTMLTableElement>(null);
  const tablaVista = useInView(tablaRef, { once: true, margin: "0px 0px -10% 0px" });

  if (!cifras.length) return null;
  const ciudades = ciudadesUnicas(centros);

  return (
    <section aria-labelledby="cifras-titulo" className="border-y border-linea bg-fondo py-20 md:py-28">
      <div className="mx-auto max-w-[88rem] px-4 md:px-8">
        {/* Cabecera de marcador */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-linea pb-4">
          <h2 id="cifras-titulo" className="rotulo text-[clamp(1.75rem,4vw,3rem)]">
            Marcador <span className="text-acento-tinta">del club</span>
          </h2>
          {ciudades.length > 0 && (
            <p className="condensada text-sm tracking-[0.2em] text-tinta-2">{ciudades.join(" · ")}</p>
          )}
        </div>

        {/* Cifras gigantes separadas por líneas de 1 px */}
        <dl
          ref={marcadorRef}
          className={`grid grid-cols-1 gap-px bg-linea min-[420px]:grid-cols-2 ${cifras.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
        >
          {cifras.map((c, i) => (
            <motion.div
              key={c.clave}
              className="flex flex-col justify-between gap-6 bg-fondo px-1 pt-8 pb-6 md:px-6 md:pt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={marcadorVisto ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.7, ease: curva, delay: i * 0.06 }}
            >
              <dd className="order-1">
                <Contador cifra={c} activo={marcadorVisto} />
              </dd>
              <dt className="order-2 flex items-baseline justify-between gap-3 border-t border-linea pt-3">
                <span className="condensada text-base tracking-[0.12em] text-tinta">{c.etiqueta}</span>
                {c.nota && <span className="condensada text-xs tracking-[0.12em] text-tinta-2">{c.nota}</span>}
              </dt>
            </motion.div>
          ))}
        </dl>

        {/* Tabla tipo marcador: una fila por centro */}
        {centros.length > 0 && (
          <table ref={tablaRef} className="mt-14 w-full border-collapse text-left md:mt-20">
            <caption className="sr-only">Aforo por centro</caption>
            <thead>
              <tr className="condensada border-b border-linea text-xs tracking-[0.2em] text-tinta-2">
                <th scope="col" className="w-16 py-3 pr-3 font-bold md:w-24">
                  Cód.
                </th>
                <th scope="col" className="py-3 pr-3 font-bold">
                  Centro
                </th>
                <th scope="col" className="hidden py-3 pr-3 font-bold md:table-cell">
                  Horario
                </th>
                <th scope="col" className="w-[38%] py-3 font-bold">
                  Aforo
                </th>
              </tr>
            </thead>
            <tbody>
              {centros.map((c, i) => {
                const aforo = Number(c.aforo) || 0;
                return (
                  <tr key={c.id} className="border-b border-linea">
                    <td className="cifra py-4 pr-3 text-2xl text-acento-tinta md:text-4xl">{codigoCentro(c.slug || c.nombre)}</td>
                    <td className="py-4 pr-3">
                      <span className="condensada block text-lg text-tinta md:text-2xl">
                        {sinMarca(c.nombre)}
                      </span>
                      <span className="condensada block text-xs tracking-[0.16em] text-tinta-2">{c.ciudad}</span>
                    </td>
                    <td className="hidden py-4 pr-3 text-sm text-tinta-2 md:table-cell">{c.horario ?? "—"}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="cifra w-10 shrink-0 text-right text-2xl tabular-nums md:w-14 md:text-3xl">{aforo}</span>
                        <div className="relative h-2 flex-1 bg-placa-2" aria-hidden>
                          <motion.div
                            className="absolute inset-y-0 left-0 origin-left bg-acento"
                            style={{ width: `${(aforo / maxAforo) * 100}%` }}
                            initial={{ scaleX: 0 }}
                            animate={tablaVista ? { scaleX: 1 } : undefined}
                            transition={{ duration: 1.1, ease: curva, delay: 0.15 + i * 0.06 }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
