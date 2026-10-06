"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import {
  ETIQUETA_ESTADO_INTERACCION,
  ETIQUETA_INTERACCION,
  TONO_INTERACCION,
  type InteraccionCompleta,
} from "@/lib/b2b";
import { fechaHora } from "@/lib/formato";
import { Responsable, Tag } from "@/components/crm/b2b/Piezas";
import { SinDatos } from "@/components/crm/Primitivas";
import { ICONO_INTERACCION } from "./iconos";
import { RelacionesInteraccion } from "./LineaTemporal";
import { MenuInteraccion } from "./MenuInteraccion";
import { useTramos } from "@/components/crm/MostrarMas";
import { useInteracciones } from "./useInteracciones";
import { claseCasilla, esTarea, esVencida } from "./utiles";

type Columna = "fecha" | "tipo" | "titulo" | "responsable" | "estado";

const TONO_ESTADO = { pendiente: "var(--relleno-ambar)", completada: "var(--relleno-verde)", cancelada: "var(--relleno-gris)" };

/** Vista tabla del feed de actividades: densa, ordenable, con acciones por fila. */
export function TablaActividades({ items }: { items: InteraccionCompleta[] }) {
  const { lista, cambiarEstado, borrar } = useInteracciones(items);
  const [orden, setOrden] = useState<{ col: Columna; asc: boolean }>({ col: "fecha", asc: false });

  const filas = useMemo(() => {
    const val: Record<Columna, (i: InteraccionCompleta) => string> = {
      fecha: (i) => i.fecha,
      tipo: (i) => ETIQUETA_INTERACCION[i.tipo],
      titulo: (i) => i.titulo.toLowerCase(),
      responsable: (i) => (i.responsable ? i.responsable.nombre : "~"),
      estado: (i) => i.estado,
    };
    const f = val[orden.col];
    return [...lista].sort((a, b) => f(a).localeCompare(f(b), "es") * (orden.asc ? 1 : -1));
  }, [lista, orden]);
  const { visibles: tramo, mas } = useTramos(filas, 50);

  if (lista.length === 0) {
    return <SinDatos titulo="Sin actividades" texto="No hay actividades con estos filtros. Prueba a ampliar las fechas o quitar filtros." />;
  }

  const cabecera = (col: Columna, texto: string, className = "") => {
    const activa = orden.col === col;
    return (
      <th scope="col" aria-sort={activa ? (orden.asc ? "ascending" : "descending") : "none"} className={`px-3 py-2 text-left font-medium ${className}`}>
        <button
          type="button"
          onClick={() => setOrden((o) => ({ col, asc: o.col === col ? !o.asc : col !== "fecha" }))}
          className={`inline-flex items-center gap-1 rounded hover:text-tinta ${activa ? "text-tinta" : ""}`}
        >
          {texto}
          {activa && (orden.asc ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
        </button>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto rounded-2xl bg-placa shadow-placa">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-placa-2/60 text-xs text-tinta-2">
          <tr>
            {cabecera("fecha", "Fecha", "w-36")}
            {cabecera("tipo", "Tipo", "w-36")}
            {cabecera("titulo", "Actividad")}
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Relacionado con
            </th>
            {cabecera("responsable", "Responsable", "w-36")}
            {cabecera("estado", "Estado", "w-32")}
            <th scope="col" className="w-10 px-2 py-2">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tramo.map((i) => {
            const Icono = ICONO_INTERACCION[i.tipo];
            const vencida = esVencida(i);
            return (
              <tr key={i.id} className="border-b border-linea/70 last:border-0 hover:bg-placa-2/40">
                <td className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
                  {fechaHora(i.fecha)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-tinta">
                    <span className="grid size-6 place-items-center rounded-full text-sobre-relleno" style={{ background: TONO_INTERACCION[i.tipo] }}>
                      <Icono className="size-3.5" weight="bold" aria-hidden />
                    </span>
                    {ETIQUETA_INTERACCION[i.tipo]}
                  </span>
                </td>
                <td className="max-w-80 px-3 py-2.5">
                  <p className={`truncate font-medium ${esTarea(i.tipo) && i.estado !== "pendiente" ? "text-tinta-2 line-through" : "text-tinta"}`}>
                    {i.titulo}
                  </p>
                  {i.descripcion && <p className="truncate text-xs text-tinta-2">{i.descripcion}</p>}
                </td>
                <td className="max-w-72 px-3 py-2.5">
                  <RelacionesInteraccion i={i} />
                </td>
                <td className="px-3 py-2.5">
                  <Responsable m={i.responsable} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    {esTarea(i.tipo) && i.estado !== "cancelada" && (
                      <input
                        type="checkbox"
                        className={claseCasilla}
                        checked={i.estado === "completada"}
                        onChange={(e) => cambiarEstado(i.id, e.target.checked ? "completada" : "pendiente")}
                        aria-label={i.estado === "completada" ? `Reabrir «${i.titulo}»` : `Completar «${i.titulo}»`}
                      />
                    )}
                    {i.tipo === "cambio_etapa" ? (
                      <span className="text-xs text-tinta-2">Sistema</span>
                    ) : vencida ? (
                      <Tag tono="var(--critico)">Vencida</Tag>
                    ) : (
                      <Tag tono={TONO_ESTADO[i.estado]}>{ETIQUETA_ESTADO_INTERACCION[i.estado]}</Tag>
                    )}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <MenuInteraccion item={i} onEstado={(e) => cambiarEstado(i.id, e)} onBorrar={() => borrar(i.id, i.titulo)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {mas && <div className="flex pb-3">{mas}</div>}
    </div>
  );
}
