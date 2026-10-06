"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Kanban as IconoKanban, Table } from "@phosphor-icons/react";
import type { OportunidadCompleta } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { SinDatos } from "@/components/crm/Primitivas";
import { BotonPaleta } from "@/components/crm/PaletaComandos";
import { MenuCrear } from "@/components/crm/dashboard/BotonCrear";
import { ProveedorAcciones } from "./Acciones";
import { BarraFiltros } from "./BarraFiltros";
import { Kanban } from "./Kanban";
import { TablaOportunidades } from "./TablaOportunidades";
import { DEFECTO, cuantosFiltros, etapasVisibles, leerFiltros, type FiltrosOportunidad, type Vista } from "./filtros";

const PESTANAS: { vista: Vista; texto: string; Icono: typeof Table }[] = [
  { vista: "kanban", texto: "Kanban", Icono: IconoKanban },
  { vista: "tabla", texto: "Tabla", Icono: Table },
];

export function VistaOportunidades({
  filas,
  catalogos,
  hayAlguna,
  cifras,
  accionVacia,
}: {
  filas: OportunidadCompleta[];
  catalogos: Catalogos;
  /** Si existe al menos una oportunidad sin filtros (para el estado vacío). */
  hayAlguna: boolean;
  /** Totales de lo abierto, para la cabecera. */
  cifras: { etiqueta: string; valor: string }[];
  accionVacia?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const filtros = leerFiltros(params);

  function cambiar(c: Partial<FiltrosOportunidad>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(c)) {
      if (v === "" || v == null || DEFECTO[k as keyof FiltrosOportunidad] === v) p.delete(k);
      else p.set(k, String(v));
    }
    empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  const n = cuantosFiltros(filtros);

  return (
    <ProveedorAcciones catalogos={catalogos}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* Cabecera compacta: título y totales a la izquierda, la vista a la derecha. */}
        <header className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <h1 className="rotulo text-[1.9rem] text-tinta">Oportunidades</h1>
          <dl className="flex items-center gap-6">
            {cifras.map((c) => (
              <div key={c.etiqueta} className="flex flex-col">
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-tinta-2">{c.etiqueta}</dt>
                <dd className="cifra text-xl text-tinta">{c.valor}</dd>
              </div>
            ))}
          </dl>

          <div className="ml-auto flex items-center gap-2">
          <nav className="flex rounded-lg bg-placa-2 p-0.5" aria-label="Vista">
            {PESTANAS.map(({ vista, texto, Icono }) => {
              const activa = filtros.vista === vista;
              return (
                <button
                  key={vista}
                  type="button"
                  onClick={() => cambiar({ vista })}
                  aria-pressed={activa}
                  title={vista === "kanban" ? "Arrastra las tarjetas para cambiar de etapa · clic para vista rápida" : undefined}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-150 ${
                    activa ? "bg-placa text-tinta shadow-placa" : "text-tinta-2 hover:text-tinta"
                  }`}
                >
                  <Icono className="size-4" weight={activa ? "fill" : "regular"} aria-hidden />
                  {texto}
                </button>
              );
            })}
          </nav>
            {/* En escritorio esta fila sustituye a la barra superior. */}
            <span className="hidden items-center gap-2 md:flex">
              <BotonPaleta compacto />
              <MenuCrear />
            </span>
          </div>
        </header>

        <BarraFiltros filtros={filtros} cambiar={cambiar} catalogos={catalogos} />

        <div
          className={`flex min-h-0 flex-1 flex-col transition-opacity ${pendiente ? "opacity-70" : ""}`}
          aria-busy={pendiente}
        >
          {!hayAlguna ? (
            <SinDatos
              titulo="Aún no hay oportunidades"
              texto="Crea la primera: una venta a un cliente, una compra a un proveedor de maquinaria, un acuerdo de colaboración… Todo el pipeline vive aquí."
              accion={accionVacia}
            />
          ) : filas.length === 0 && n > 0 && filtros.vista === "tabla" ? (
            <SinDatos
              titulo="Nada con estos filtros"
              texto="Prueba a quitar algún filtro o a buscar con otras palabras."
            />
          ) : filtros.vista === "kanban" ? (
            <Kanban filas={filas} etapas={etapasVisibles(filtros.etapa)} />
          ) : (
            <TablaOportunidades filas={filas} filtros={filtros} cambiar={cambiar} />
          )}
        </div>
      </div>
    </ProveedorAcciones>
  );
}
