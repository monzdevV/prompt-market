"use client";

import { useState } from "react";
import { CalendarBlank, CaretDown, ListBullets, Table, X } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ESTADOS_INTERACCION,
  ETIQUETA_ESTADO_INTERACCION,
  ETIQUETA_INTERACCION,
  TIPOS_INTERACCION,
  nombreCompleto,
  tonoColor,
  type EmpresaMini,
  type Miembro,
} from "@/lib/b2b";
import { claseCampo } from "@/components/crm/Primitivas";
import { Avatar, LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { ICONO_INTERACCION } from "./iconos";
import { Pildora, clasePildora } from "./Pildora";
import { useParametros } from "./useParametros";

const dosCifras = (n: number) => String(n).padStart(2, "0");
const diaLocal = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const haceDias = (n: number) => diaLocal(new Date(Date.now() - n * 86_400_000));
const fechaCorta = (d: string) => {
  const [a, m, dia] = d.split("-").map(Number);
  return new Date(a, m - 1, dia).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
};

function Fechas({ desde, hasta, cambiar }: { desde: string; hasta: string; cambiar: (c: Record<string, string>) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const texto = desde || hasta ? `${desde ? fechaCorta(desde) : "…"} – ${hasta ? fechaCorta(hasta) : "hoy"}` : "Siempre";
  const aplicar = (a: string, b: string) => {
    cambiar({ desde: a, hasta: b });
    setAbierta(false);
  };
  const presets = [
    { texto: "Últimos 7 días", desde: haceDias(7) },
    { texto: "Últimos 30 días", desde: haceDias(30) },
    { texto: "Últimos 90 días", desde: haceDias(90) },
    { texto: "Este mes", desde: diaLocal(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) },
  ];

  return (
    <Popover
      open={abierta}
      onOpenChange={(v) => {
        setAbierta(v);
        if (v) {
          setD(desde);
          setH(hasta);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={clasePildora}>
          <span className="flex items-center gap-1.5 pl-2.5 text-tinta-2">
            <CalendarBlank className="size-3.5" aria-hidden />
            Fechas
          </span>
          <span className={`flex items-center gap-1.5 px-2.5 font-medium tabular-nums ${desde || hasta ? "text-acento-tinta" : "text-tinta"}`}>
            {texto}
            <CaretDown className="size-3 text-tinta-2" weight="bold" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 bg-placa p-3 text-tinta shadow-lg">
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.texto}
              type="button"
              onClick={() => aplicar(p.desde, "")}
              className="rounded-md bg-placa-2 px-2 py-1.5 text-left text-[0.8125rem] text-tinta transition-colors hover:bg-linea"
            >
              {p.texto}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-tinta-2">
            Desde
            <input type="date" value={d} max={h || undefined} onChange={(e) => setD(e.target.value)} className={`${claseCampo} h-8 px-2`} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-tinta-2">
            Hasta
            <input type="date" value={h} min={d || undefined} onChange={(e) => setH(e.target.value)} className={`${claseCampo} h-8 px-2`} />
          </label>
        </div>
        <div className="flex justify-between gap-2">
          <button type="button" onClick={() => aplicar("", "")} className="text-[0.8125rem] text-tinta-2 hover:text-tinta">
            Quitar fechas
          </button>
          <button
            type="button"
            onClick={() => aplicar(d, h)}
            className="h-8 rounded-md bg-acento px-3 text-[0.8125rem] font-medium text-sobre-campo hover:brightness-110"
          >
            Aplicar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type ValoresFiltroActividad = {
  tipo: string;
  responsable: string;
  empresa: string;
  estado: string;
  desde: string;
  hasta: string;
  vista: "linea" | "tabla";
};

/** Barra de filtros del feed de actividades. Todo vive en la URL. */
export function FiltrosActividad({
  valores,
  equipo,
  empresas,
}: {
  valores: ValoresFiltroActividad;
  equipo: Miembro[];
  empresas: EmpresaMini[];
}) {
  const { cambiar, pendiente } = useParametros();
  const hayFiltros = valores.tipo || valores.responsable || valores.empresa || valores.estado || valores.desde || valores.hasta;

  const vistas = [
    { valor: "linea", texto: "Línea temporal", Icono: ListBullets },
    { valor: "tabla", texto: "Tabla", Icono: Table },
  ] as const;

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pendiente ? "opacity-70" : ""}`}>
      <Pildora
        etiqueta="Tipo"
        valor={valores.tipo}
        onCambio={(tipo) => cambiar({ tipo })}
        opciones={[
          { valor: "", texto: "Todos" },
          ...TIPOS_INTERACCION.map((t) => {
            const Icono = ICONO_INTERACCION[t];
            return { valor: t, texto: ETIQUETA_INTERACCION[t], icono: <Icono className="size-4 text-tinta-2" aria-hidden /> };
          }),
        ]}
      />
      <Pildora
        etiqueta="Responsable"
        valor={valores.responsable}
        onCambio={(responsable) => cambiar({ responsable })}
        opciones={[
          { valor: "", texto: "Todo el equipo" },
          ...equipo.map((m) => ({
            valor: m.id,
            texto: nombreCompleto(m),
            icono: <Avatar nombre={m.nombre} apellidos={m.apellidos} tono={tonoColor(m.color)} tamano="xs" />,
          })),
        ]}
      />
      <Pildora
        etiqueta="Empresa"
        valor={valores.empresa}
        onCambio={(empresa) => cambiar({ empresa })}
        buscar
        opciones={[
          { valor: "", texto: "Todas" },
          ...empresas.map((e) => ({ valor: e.id, texto: e.nombre, icono: <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" /> })),
        ]}
      />
      <Pildora
        etiqueta="Estado"
        valor={valores.estado}
        onCambio={(estado) => cambiar({ estado })}
        opciones={[{ valor: "", texto: "Todos" }, ...ESTADOS_INTERACCION.map((e) => ({ valor: e, texto: ETIQUETA_ESTADO_INTERACCION[e] }))]}
      />
      <Fechas key={`${valores.desde}-${valores.hasta}`} desde={valores.desde} hasta={valores.hasta} cambiar={cambiar} />

      {hayFiltros && (
        <button
          type="button"
          onClick={() => cambiar({ tipo: "", responsable: "", empresa: "", estado: "", desde: "", hasta: "" })}
          className="flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
        >
          <X className="size-3.5" aria-hidden />
          Limpiar
        </button>
      )}

      <div className="ml-auto flex rounded-lg bg-placa-2 p-0.5" role="group" aria-label="Vista">
        {vistas.map(({ valor, texto, Icono }) => {
          const activa = valores.vista === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activa}
              onClick={() => cambiar({ vista: valor === "linea" ? "" : valor })}
              className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors ${
                activa ? "bg-placa text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              <Icono className="size-4" aria-hidden />
              <span className="hidden sm:inline">{texto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
