"use client";

import { Check } from "@phosphor-icons/react";
import type { DatosLanding } from "@/lib/datos/publico";
import type { Tarifa } from "@/lib/tipos";
import { capitalizar, dineroExacto, numeroEnLetra } from "@/lib/formato";
import { MARCA } from "@/marca";
import { Antetitulo, Revelar, TituloPartido } from "./Movimiento";
import { irA } from "./ScrollSuave";

/** "29,99 €" → { entero: "29", centimos: "99" } usando el formato común. */
function precio(valor: number) {
  const [entero, resto = ""] = dineroExacto(valor).split(",");
  return { entero: entero.replace(/[^\d.]/g, ""), centimos: resto.replace(/\D/g, "") };
}

function elegir(slug: string) {
  irA("visita");
  window.dispatchEvent(new CustomEvent(MARCA.eventoTarifa, { detail: slug }));
}

function Plan({ tarifa, indice }: { tarifa: Tarifa; indice: number }) {
  const { entero, centimos } = precio(Number(tarifa.cuota_mensual));
  const matricula = Number(tarifa.matricula) || 0;
  const destacada = tarifa.destacada;

  return (
    <Revelar
      as="li"
      retraso={indice * 0.06}
      className="group relative flex flex-col border-t border-linea bg-fondo px-4 pt-16 pb-8 first:border-t-0 transition-colors duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-placa md:border-t-0 md:border-l md:px-8 md:pt-20 md:first:border-l-0"
    >
      {destacada && (
        <>
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-acento" />
          <p className="rotulo corte-rotulo absolute top-0 left-0 bg-acento py-2 pr-8 pl-4 text-lg text-sobre-campo md:pl-8">
            Recomendada
          </p>
        </>
      )}

      <div className="flex items-baseline justify-between gap-4">
        <h3 className="rotulo text-[clamp(2.25rem,4vw,3.5rem)]">{tarifa.nombre}</h3>
        <span className="cifra text-sm text-tinta-2">{String(indice + 1).padStart(2, "0")}</span>
      </div>

      {/* Precio gigante, céntimos pequeños arriba */}
      <p className="mt-8 flex items-start text-tinta transition-transform duration-[320ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1">
        <span className="sr-only">{dineroExacto(tarifa.cuota_mensual)} al mes</span>
        <span aria-hidden className="cifra text-[clamp(6rem,11vw,9.5rem)] leading-[0.8]">
          {entero}
        </span>
        <span aria-hidden className="ml-1 flex flex-col pt-[0.2em]">
          <span className="cifra text-[clamp(1.75rem,3vw,2.5rem)] leading-none">,{centimos}</span>
          <span className="condensada mt-1 text-sm tracking-[0.12em] text-tinta-2">€ / mes</span>
        </span>
      </p>

      <p className="condensada mt-5 text-sm tracking-[0.14em] text-acento-tinta">
        {matricula === 0 ? "Sin matrícula" : `Matrícula ${dineroExacto(matricula)}`}
      </p>

      {tarifa.descripcion && <p className="mt-4 max-w-[36ch] text-tinta-2">{tarifa.descripcion}</p>}

      {tarifa.incluye.length > 0 && (
        <ul className="mt-8 flex-1 border-t border-linea">
          {tarifa.incluye.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-linea py-3 text-[0.95rem]">
              <Check weight="light" aria-hidden className="mt-0.5 size-5 shrink-0 text-acento-tinta" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      <a
        href="#visita"
        data-tarifa={tarifa.slug}
        onClick={(e) => {
          e.preventDefault();
          elegir(tarifa.slug);
        }}
        className={`condensada mt-10 inline-flex min-h-12 items-center justify-center px-6 text-base tracking-[0.12em] transition-[background-color,color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${
          destacada
            ? "corte-d bg-acento pr-9 text-sobre-campo hover:bg-tinta"
            : "border border-linea text-tinta hover:border-tinta"
        }`}
      >
        Probar {tarifa.nombre}
      </a>
    </Revelar>
  );
}

export function Tarifas({ datos }: { datos: DatosLanding }) {
  const { tarifas } = datos;
  if (!tarifas.length) return null;
  const cuantas = capitalizar(numeroEnLetra(tarifas.length, "f"));

  return (
    <section id="tarifas" aria-labelledby="tarifas-titulo" className="bg-fondo py-24 md:py-36">
      <div className="mx-auto max-w-[88rem] px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <Antetitulo n="03">Tarifas</Antetitulo>
            <div id="tarifas-titulo">
              <TituloPartido
                texto={`${cuantas} ${tarifas.length === 1 ? "cuota" : "cuotas"}.\nCero permanencia.`}
                className="rotulo mt-6 text-[clamp(3.25rem,9vw,9rem)]"
              />
            </div>
          </div>
          <Revelar className="md:col-span-4" retraso={0.2}>
            <p className="max-w-[40ch] text-tinta-2">
              Pagas mes a mes y te das de baja cuando quieras. Elige cuota y reserva tu visita en el centro que te pille
              cerca.
            </p>
          </Revelar>
        </div>

        <ol className={`mt-14 grid border-y border-linea md:mt-20 ${tarifas.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {tarifas.map((t, i) => (
            <Plan key={t.id} tarifa={t} indice={i} />
          ))}
        </ol>

        <p className="condensada mt-5 text-xs tracking-[0.18em] text-tinta-2">
          Cuotas mensuales · Sin permanencia
        </p>
      </div>
    </section>
  );
}
