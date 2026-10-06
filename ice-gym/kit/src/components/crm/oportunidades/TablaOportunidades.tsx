"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, CaretUpDown } from "@phosphor-icons/react";
import {
  ETAPAS,
  PRIORIDADES,
  nombreCompleto,
  probabilidadB2B,
  valorEsperado,
  type OportunidadCompleta,
} from "@/lib/b2b";
import { dinero, numero } from "@/lib/formato";
import { BadgeEtapa, BadgePrioridad, BadgeTipoOportunidad, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";
import { MenuOportunidad, useAccionesOportunidad } from "./Acciones";
import { MarcaEstado, Probabilidad, ProximaAccion, fechaCorta } from "./Piezas";
import { COLUMNAS_ORDEN, type FiltrosOportunidad, type Orden } from "./filtros";

const cmpTexto = (a?: string | null, b?: string | null) => (a ?? "￿").localeCompare(b ?? "￿", "es");
const cmpFecha = (a?: string | null, b?: string | null) => (a ?? "9999").localeCompare(b ?? "9999");

const COMPARAR: Record<Orden, (a: OportunidadCompleta, b: OportunidadCompleta) => number> = {
  nombre: (a, b) => cmpTexto(a.nombre, b.nombre),
  empresa: (a, b) => cmpTexto(a.empresa?.nombre, b.empresa?.nombre),
  tipo: (a, b) => cmpTexto(a.tipo, b.tipo),
  etapa: (a, b) => ETAPAS.indexOf(a.etapa) - ETAPAS.indexOf(b.etapa),
  valor: (a, b) => a.valor - b.valor,
  probabilidad: (a, b) => probabilidadB2B(a) - probabilidadB2B(b),
  responsable: (a, b) => cmpTexto(a.responsable?.nombre, b.responsable?.nombre),
  prioridad: (a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad),
  cierre: (a, b) => cmpFecha(a.fecha_cierre, b.fecha_cierre),
  accion: (a, b) => cmpFecha(a.proxima_accion_fecha, b.proxima_accion_fecha),
  creada: (a, b) => a.created_at.localeCompare(b.created_at),
};

function Cabecera({
  col,
  filtros,
  cambiar,
  derecha = false,
}: {
  col: Orden;
  filtros: FiltrosOportunidad;
  cambiar: (c: Partial<FiltrosOportunidad>) => void;
  derecha?: boolean;
}) {
  const activa = filtros.orden === col;
  const Icono = !activa ? CaretUpDown : filtros.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={activa ? (filtros.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`py-2 pr-4 font-normal ${derecha ? "text-right" : ""} ${col === "nombre" ? "pl-4" : ""}`}
    >
      <button
        type="button"
        onClick={() =>
          cambiar({ orden: col, dir: activa ? (filtros.dir === "asc" ? "desc" : "asc") : col === "nombre" || col === "empresa" ? "asc" : "desc" })
        }
        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento ${
          activa ? "font-medium text-tinta" : ""
        }`}
      >
        {COLUMNAS_ORDEN[col]}
        <Icono className={`size-3.5 ${activa ? "" : "opacity-50"}`} aria-hidden />
      </button>
    </th>
  );
}

export function TablaOportunidades({
  filas,
  filtros,
  cambiar,
}: {
  filas: OportunidadCompleta[];
  filtros: FiltrosOportunidad;
  cambiar: (c: Partial<FiltrosOportunidad>) => void;
}) {
  const { abrir } = useAccionesOportunidad();

  const ordenadas = useMemo(() => {
    const cmp = COMPARAR[filtros.orden];
    const signo = filtros.dir === "asc" ? 1 : -1;
    return [...filas].sort((a, b) => signo * cmp(a, b) || b.created_at.localeCompare(a.created_at));
  }, [filas, filtros.orden, filtros.dir]);

  const valor = filas.reduce((s, o) => s + o.valor, 0);
  const esperado = filas.reduce((s, o) => s + valorEsperado(o), 0);
  const cab = { filtros, cambiar };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Escritorio */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-linea bg-placa md:flex">
        <div className="relative min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
            <caption className="sr-only">Oportunidades, ordenadas por {COLUMNAS_ORDEN[filtros.orden].toLowerCase()}</caption>
            <thead className="sticky top-0 z-10 bg-placa">
              <tr className="border-b border-linea text-[0.8125rem] text-tinta-2">
                <Cabecera col="nombre" {...cab} />
                <Cabecera col="empresa" {...cab} />
                <Cabecera col="tipo" {...cab} />
                <Cabecera col="etapa" {...cab} />
                <Cabecera col="valor" derecha {...cab} />
                <Cabecera col="probabilidad" {...cab} />
                <Cabecera col="responsable" {...cab} />
                <Cabecera col="prioridad" {...cab} />
                <Cabecera col="accion" {...cab} />
                <Cabecera col="cierre" {...cab} />
                <Cabecera col="creada" {...cab} />
                <th scope="col" className="w-10 pr-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => abrir(o)}
                  className="group cursor-pointer border-b border-linea/70 transition-colors last:border-0 hover:bg-placa-2/60"
                >
                  <td className="max-w-[260px] py-2 pl-4 pr-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrir(o);
                      }}
                      className="block w-full min-w-0 text-left outline-none focus-visible:underline"
                    >
                      <span className="block truncate font-medium text-tinta group-hover:text-acento-tinta">{o.nombre}</span>
                      <span className="flex items-center gap-2 truncate text-xs text-tinta-2">
                        {o.contacto ? nombreCompleto(o.contacto) : "Sin contacto"}
                        <MarcaEstado estado={o.estado} />
                      </span>
                    </button>
                  </td>
                  <td className="max-w-[200px] py-2 pr-4">
                    {o.empresa ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} tamano="xs" />
                        <span className="truncate text-tinta">{o.empresa.nombre}</span>
                      </span>
                    ) : (
                      <span className="text-tinta-2">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <BadgeTipoOportunidad tipo={o.tipo} />
                  </td>
                  <td className="py-2 pr-4">
                    <BadgeEtapa etapa={o.etapa} />
                  </td>
                  <td className="py-2 pr-4 text-right font-medium tabular-nums text-tinta">{dinero(o.valor)}</td>
                  <td className="py-2 pr-4">
                    <Probabilidad o={o} />
                  </td>
                  <td className="max-w-[140px] py-2 pr-4">
                    <Responsable m={o.responsable} />
                  </td>
                  <td className="py-2 pr-4">
                    <BadgePrioridad prioridad={o.prioridad} />
                  </td>
                  <td className="max-w-[200px] py-2 pr-4">
                    <ProximaAccion o={o} />
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-tinta-2">{fechaCorta(o.fecha_cierre)}</td>
                  <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-tinta-2">{fechaCorta(o.created_at)}</td>
                  <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                    <MenuOportunidad o={o} className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pie n={filas.length} valor={valor} esperado={esperado} />
      </div>

      {/* Móvil: lista de tarjetas */}
      <ul className="flex flex-col gap-2 md:hidden">
        {ordenadas.map((o) => (
          <li key={o.id} className="relative">
            <button
              type="button"
              onClick={() => abrir(o)}
              className="block w-full rounded-xl border border-linea bg-placa p-3.5 pr-10 text-left active:bg-placa-2"
            >
              <p className="truncate font-medium text-tinta">{o.nombre}</p>
              <p className="truncate text-[0.8125rem] text-tinta-2">
                {o.empresa?.nombre ?? "Sin empresa"}
                {o.contacto && ` · ${nombreCompleto(o.contacto)}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <BadgeEtapa etapa={o.etapa} />
                <BadgeTipoOportunidad tipo={o.tipo} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="font-semibold tabular-nums text-tinta">{dinero(o.valor)}</span>
                <Probabilidad o={o} />
              </div>
              <div className="mt-2">
                <ProximaAccion o={o} />
              </div>
            </button>
            <MenuOportunidad o={o} className="absolute right-2 top-2.5" />
          </li>
        ))}
      </ul>
      <div className="overflow-hidden rounded-xl border border-linea bg-placa md:hidden">
        <Pie n={filas.length} valor={valor} esperado={esperado} />
      </div>
    </div>
  );
}

function Pie({ n, valor, esperado }: { n: number; valor: number; esperado: number }) {
  const celdas = [
    { k: "En vista", v: numero(n) },
    { k: "Valor total", v: dinero(valor) },
    { k: "Valor esperado", v: dinero(esperado) },
  ];
  return (
    <dl className="grid grid-cols-3 border-t border-linea text-sm">
      {celdas.map((c, i) => (
        <div key={c.k} className={`flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-2 ${i > 0 ? "border-l border-linea" : ""}`}>
          <dt className="text-xs text-tinta-2 sm:order-2 sm:text-sm">{c.k}</dt>
          <dd className="font-semibold tabular-nums text-tinta sm:order-1">{c.v}</dd>
        </div>
      ))}
    </dl>
  );
}
