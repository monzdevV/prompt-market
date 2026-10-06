"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowUp, ArrowUpRight } from "@phosphor-icons/react";
import type { DatosLanding } from "@/lib/datos/publico";
import { codigoCentro } from "@/design/tokens";
import { ciudadesUnicas, columnas, COLUMNAS_CENTROS_SM } from "@/lib/centros";
import { listaNatural } from "@/lib/formato";
import { MARCA, sinMarca } from "@/marca";
import { Revelar } from "./Movimiento";
import { irA } from "./ScrollSuave";

const SECCIONES = [
  { id: "instalaciones", texto: "Instalaciones" },
  { id: "tarifas", texto: "Tarifas" },
  { id: "centros", texto: "Centros" },
  { id: "clases", texto: "Clases" },
  { id: "visita", texto: "Reserva tu visita" },
];

/** Enlaces de contacto de marca.ts: sólo los rellenos. */
function enlacesContacto() {
  const c = MARCA.contacto;
  const sinEspacios = (t: string) => t.replace(/\s+/g, "");
  return [
    c.email && { href: `mailto:${c.email}`, texto: c.email, externo: false },
    c.telefono && { href: `tel:${sinEspacios(c.telefono)}`, texto: c.telefono, externo: false },
    c.whatsapp && { href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}`, texto: "WhatsApp", externo: true },
    c.instagram && { href: c.instagram, texto: "Instagram", externo: true },
    c.tiktok && { href: c.tiktok, texto: "TikTok", externo: true },
    c.facebook && { href: c.facebook, texto: "Facebook", externo: true },
    c.youtube && { href: c.youtube, texto: "YouTube", externo: true },
  ].filter((e): e is { href: string; texto: string; externo: boolean } => Boolean(e));
}

/** El rótulo gigante mide 28vw con 6 letras ("ICE"+"GYM"); con más letras se encoge para no cortarse. */
const LETRAS_ROTULO = MARCA.logo[0].length + MARCA.logo[1].length;
const TAMANO_ROTULO = `${Math.min(28, 168 / Math.max(LETRAS_ROTULO, 1))}vw`;

export function Pie({ datos }: { datos: DatosLanding }) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  // El rótulo sube desde debajo del borde a medida que se llega al final de la página.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0.35, 1], reducido ? ["0%", "0%"] : ["75%", "0%"]);
  const yGym = useTransform(scrollYProgress, [0.45, 1], reducido ? ["0%", "0%"] : ["95%", "0%"]);

  const ciudades = listaNatural(ciudadesUnicas(datos.centros));
  const contacto = enlacesContacto();

  const volverArriba = () => {
    irA("portada");
  };

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-linea bg-fondo" aria-labelledby="pie-titulo">
      <h2 id="pie-titulo" className="sr-only">
        {MARCA.nombre}: centros y contacto
      </h2>

      <div className="mx-auto max-w-[1600px] px-4 pt-20 md:px-10 md:pt-28">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:gap-x-8">
          {/* Centros */}
          <div className={`grid grid-cols-1 gap-10 ${columnas(COLUMNAS_CENTROS_SM, datos.centros.length)} md:col-span-9 md:gap-8`}>
            {datos.centros.map((c, i) => (
              <Revelar key={c.id} retraso={i * 0.06} className="border-t border-linea pt-5">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="cifra text-5xl text-acento-tinta">{codigoCentro(c.slug)}</span>
                  <span className="condensada text-xs tracking-[0.18em] text-tinta-2">{c.ciudad}</span>
                </p>
                <h3 className="rotulo mt-4 text-2xl text-tinta">{sinMarca(c.nombre)}</h3>
                <address className="mt-3 text-sm not-italic leading-relaxed text-tinta-2">{c.direccion}</address>
                {c.telefono && (
                  <a
                    href={`tel:${c.telefono.replace(/\s+/g, "")}`}
                    className="cifra mt-3 inline-flex min-h-11 items-center text-lg text-tinta transition-colors hover:text-acento-tinta"
                  >
                    {c.telefono}
                  </a>
                )}
                {c.horario && (
                  <p className="mt-1 text-sm leading-relaxed text-tinta-2">
                    <span className="condensada mr-2 text-xs tracking-[0.18em] text-tinta">Horario</span>
                    {c.horario}
                  </p>
                )}
              </Revelar>
            ))}
          </div>

          {/* Navegación */}
          <nav aria-label="Secciones" className="md:col-span-3 md:pl-8">
            <p className="condensada border-t border-linea pt-5 text-xs tracking-[0.18em] text-tinta-2">La web</p>
            <ul className="mt-4">
              {SECCIONES.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      irA(s.id);
                    }}
                    className="condensada group flex min-h-11 items-center justify-between gap-3 border-b border-linea/60 text-lg tracking-[0.04em] text-tinta transition-colors hover:text-acento-tinta"
                  >
                    {s.texto}
                    <ArrowUpRight
                      weight="bold"
                      aria-hidden
                      className="size-4 text-tinta-2 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-acento-tinta"
                    />
                  </a>
                </li>
              ))}
            </ul>
            {contacto.length > 0 && (
              <ul className="mt-6">
                {contacto.map((e) => (
                  <li key={e.href}>
                    <a
                      href={e.href}
                      {...(e.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="inline-flex min-h-11 items-center text-sm text-tinta-2 transition-colors hover:text-acento-tinta"
                    >
                      {e.texto}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>

        {/* Barra final */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-linea py-4 text-sm text-tinta-2">
          <p>
            © <span className="cifra">{new Date().getFullYear()}</span> {MARCA.nombre}
            {ciudades && ` · ${ciudades}`}
          </p>
          <div className="flex items-center gap-6">
            <Link href="/crm" className="inline-flex min-h-11 items-center text-xs text-tinta-2/70 transition-colors hover:text-tinta">
              Acceso equipo
            </Link>
            <button
              type="button"
              onClick={volverArriba}
              className="condensada group inline-flex min-h-11 items-center gap-2 tracking-[0.14em] text-tinta transition-colors hover:text-acento-tinta active:scale-[0.97]"
            >
              Volver arriba
              <ArrowUp
                weight="bold"
                aria-hidden
                className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Rótulo gigante a todo el ancho */}
      <div className="mt-2 flex select-none items-end justify-between overflow-hidden px-2 md:px-4" aria-hidden>
        <motion.span style={{ y, fontSize: TAMANO_ROTULO }} className="cifra block leading-[0.78] text-tinta will-change-transform">
          {MARCA.logo[0]}
        </motion.span>
        <motion.span
          style={{ y: yGym, fontSize: TAMANO_ROTULO }}
          className="cifra block leading-[0.78] tracking-[0.02em] text-acento-tinta will-change-transform"
        >
          {MARCA.logo[1]}
        </motion.span>
      </div>
    </footer>
  );
}
