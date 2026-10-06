"use client";

import { useDeferredValue, useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";

export type FilaManifiesto = {
  slug: string;
  codigo: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  nombreCategoria: string;
  stack: string[];
  tiempo: string;
  precio: string;
  borrador: boolean;
  dificultad: string;
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Catálogo como manifiesto de carga: una línea por bulto, filtros como pestañas de archivador. */
export function Manifiesto({ filas, categorias }: { filas: FilaManifiesto[]; categorias: { id: string; nombre: string }[] }) {
  const [categoria, setCategoria] = useState<string>("todo");
  const [busqueda, setBusqueda] = useState("");
  const consulta = normalizar(useDeferredValue(busqueda).trim());
  const idBusqueda = useId();

  const visibles = filas.filter((f) => {
    if (categoria !== "todo" && f.categoria !== categoria) return false;
    if (!consulta) return true;
    const pajar = normalizar([f.titulo, f.subtitulo, f.codigo, f.nombreCategoria, ...f.stack].join(" "));
    return consulta.split(/\s+/).every((t) => pajar.includes(t));
  });

  const cuenta = (id: string) => (id === "todo" ? filas.length : filas.filter((f) => f.categoria === id).length);
  const opciones = [{ id: "todo", nombre: "Todo" }, ...categorias];

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-tinta pb-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Cambio de estado instantáneo: es un filtro que se usa muchas veces, no merece animación. */}
        <div role="group" aria-label="Filtrar por categoría" className="-mx-1 flex flex-wrap gap-1">
          {opciones.map((o) => {
            const activa = categoria === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={activa}
                onClick={() => setCategoria(o.id)}
                className={`pulsable inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold ${
                  activa ? "bg-tinta text-suelo" : "text-tinta-2 hover:text-tinta"
                }`}
              >
                {o.nombre}
                <span className={`cifras font-mono text-xs ${activa ? "text-suelo" : "text-tinta-3"}`}>{cuenta(o.id)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <label htmlFor={idBusqueda} className="sr-only">
            Buscar en el catálogo
          </label>
          <MagnifyingGlass size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input
            id={idBusqueda}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar: gimnasio, Remotion, Supabase…"
            autoComplete="off"
            className="h-11 w-full border border-linea bg-placa pr-10 pl-9 text-base text-tinta placeholder:text-tinta-3 hover:border-tinta-3 focus:border-tinta sm:text-sm [&::-webkit-search-cancel-button]:appearance-none"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda("")}
              aria-label="Borrar la búsqueda"
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-tinta-3 hover:text-tinta"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Cabecera de columnas (solo escritorio). */}
      <div aria-hidden="true" className="campo hidden grid-cols-[4.5rem_minmax(0,1.6fr)_7rem_minmax(0,1fr)_9rem_6.5rem] gap-6 border-b border-linea py-2 lg:grid">
        <span>Código</span>
        <span>Paquete</span>
        <span>Categoría</span>
        <span>Stack</span>
        <span>Montaje</span>
        <span className="text-right">Precio</span>
      </div>

      <p className="sr-only" aria-live="polite">
        {visibles.length === 1 ? "1 paquete" : `${visibles.length} paquetes`}
      </p>

      {visibles.length ? (
        <ul>
          {visibles.map((f) => (
            <li key={f.slug} className="border-b border-linea">
              <Link
                href={`/p/${f.slug}`}
                className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-5 hover:bg-placa sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] lg:grid-cols-[4.5rem_minmax(0,1.6fr)_7rem_minmax(0,1fr)_9rem_6.5rem] lg:gap-6 lg:px-0"
              >
                <span className="rotulo pt-0.5 text-[1.75rem] leading-none text-tinta-3 group-hover:text-senal-texto lg:text-[2rem]">
                  {f.codigo}
                </span>
                <span className="min-w-0">
                  <span className="rotulo-medio block text-xl leading-tight tracking-[0.02em] text-tinta">{f.titulo}</span>
                  <span className="mt-1 block text-sm text-tinta-2">{f.subtitulo}</span>
                </span>
                <span className="col-start-2 text-sm text-tinta-2 sm:col-start-auto lg:pt-1">
                  <span className="lg:hidden">{f.nombreCategoria} · </span>
                  <span className="hidden lg:inline">{f.nombreCategoria}</span>
                  <span className="lg:hidden">{f.tiempo}</span>
                </span>
                <span className="col-start-2 hidden font-mono text-xs leading-5 text-tinta-2 lg:col-start-auto lg:block lg:pt-1.5">
                  {f.stack.slice(0, 4).join(" · ")}
                </span>
                <span className="hidden text-sm text-tinta-2 lg:block lg:pt-1">{f.tiempo}</span>
                <span className="col-start-2 flex items-center justify-between gap-3 sm:col-start-3 sm:row-start-1 sm:flex-col sm:items-end sm:justify-start lg:col-start-auto lg:row-start-auto">
                  <span className="cifras rotulo-medio text-xl text-tinta">{f.precio}</span>
                  <span className="flex items-center gap-2 text-xs text-tinta-3">
                    {f.borrador && <span title="Precio propuesto, pendiente de confirmar">borrador</span>}
                    <ArrowRight size={14} weight="bold" aria-hidden="true" className="text-tinta-2 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-tinta" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-b border-linea py-14">
          <p className="rotulo-medio text-xl">Ningún bulto coincide</p>
          <p className="mt-2 text-sm text-tinta-2">
            Prueba con otra palabra o quita el filtro de categoría.{" "}
            <button
              type="button"
              className="underline hover:text-tinta"
              onClick={() => {
                setBusqueda("");
                setCategoria("todo");
              }}
            >
              Ver todo el catálogo
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
