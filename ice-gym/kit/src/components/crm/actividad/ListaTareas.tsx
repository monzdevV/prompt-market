"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MARCA } from "@/marca";
import { CalendarBlank, CheckCircle, ClockCountdown, Sun, WarningCircle } from "@phosphor-icons/react";
import {
  ETIQUETA_INTERACCION,
  ETIQUETA_PRIORIDAD,
  PRIORIDADES,
  nombreCompleto,
  tonoColor,
  type InteraccionCompleta,
  type Miembro,
} from "@/lib/b2b";
import { hora } from "@/lib/formato";
import { Avatar, BadgePrioridad, Responsable } from "@/components/crm/b2b/Piezas";
import { ICONO_INTERACCION } from "./iconos";
import { RelacionesInteraccion } from "./LineaTemporal";
import { MenuInteraccion } from "./MenuInteraccion";
import { Pildora } from "./Pildora";
import { useInteracciones } from "./useInteracciones";
import { useParametros } from "./useParametros";
import { agruparPorDia, claseCasilla, claveDia, etiquetaDia } from "./utiles";

export const VISTAS_TAREAS = ["vencidas", "hoy", "proximas", "completadas"] as const;
export type VistaTareas = (typeof VISTAS_TAREAS)[number];

const PESTANAS: Record<VistaTareas, { texto: string; Icono: typeof Sun; vacio: string }> = {
  vencidas: { texto: "Vencidas", Icono: WarningCircle, vacio: "Nada vencido. Todo al día." },
  hoy: { texto: "Hoy", Icono: Sun, vacio: "No tienes nada para hoy. Buen momento para adelantar lo de mañana." },
  proximas: { texto: "Próximas", Icono: CalendarBlank, vacio: "No hay tareas programadas para los próximos días." },
  completadas: { texto: "Completadas", Icono: CheckCircle, vacio: "Aún no se ha completado ninguna tarea." },
};

const fechaCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: MARCA.zonaHoraria });

function FilaTarea({
  t,
  vista,
  ahora,
  onEstado,
  onBorrar,
}: {
  t: InteraccionCompleta;
  vista: VistaTareas;
  ahora: number;
  onEstado: (e: InteraccionCompleta["estado"]) => void;
  onBorrar: () => void;
}) {
  const hecha = t.estado !== "pendiente";
  const pasada = !hecha && new Date(t.fecha).getTime() < ahora;
  const Icono = ICONO_INTERACCION[t.tipo];

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-placa-2/40">
      {t.estado === "cancelada" ? (
        <span className="mt-0.5 size-[18px] shrink-0 rounded-full border-[1.5px] border-dashed border-tinta-2/50" title="Cancelada" />
      ) : (
        <input
          type="checkbox"
          className={`${claseCasilla} mt-0.5`}
          checked={t.estado === "completada"}
          onChange={(e) => onEstado(e.target.checked ? "completada" : "pendiente")}
          aria-label={t.estado === "completada" ? `Reabrir «${t.titulo}»` : `Completar «${t.titulo}»`}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm font-medium ${hecha ? "text-tinta-2 line-through decoration-tinta-2/60" : "text-tinta"}`}>{t.titulo}</span>
          {t.tipo === "seguimiento" && (
            <span className="inline-flex items-center gap-1 text-xs text-tinta-2">
              <Icono className="size-3.5" aria-hidden />
              {ETIQUETA_INTERACCION.seguimiento}
            </span>
          )}
          {!hecha && t.prioridad !== "media" && <BadgePrioridad prioridad={t.prioridad} />}
          {t.estado === "cancelada" && <span className="text-xs text-tinta-2">Cancelada</span>}
        </p>
        {t.descripcion && <p className="line-clamp-1 text-[0.8125rem] text-tinta-2">{t.descripcion}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <RelacionesInteraccion i={t} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden sm:inline-flex">
          <Responsable m={t.responsable} soloAvatar />
        </span>
        <time
          dateTime={t.fecha}
          className={`inline-flex min-w-16 items-center justify-end gap-1 text-xs tabular-nums ${
            pasada ? "font-medium text-critico" : "text-tinta-2"
          }`}
        >
          {pasada && <ClockCountdown className="size-3.5" aria-hidden />}
          {vista === "hoy" || vista === "proximas" ? hora(t.fecha) : `${fechaCorta.format(new Date(t.fecha)).replace(".", "")} · ${hora(t.fecha)}`}
        </time>
        <MenuInteraccion item={t} onEstado={onEstado} onBorrar={onBorrar} />
      </div>
    </li>
  );
}

/** Gestor de tareas y seguimientos: vencidas, hoy, próximas y completadas. */
export function ListaTareas({
  items,
  equipo,
  miembroId,
  valores,
  nueva,
}: {
  items: InteraccionCompleta[];
  equipo: Miembro[];
  /** Ficha del usuario en el equipo, para «Mis tareas». */
  miembroId: string | null;
  valores: { vista: VistaTareas | ""; responsable: string; prioridad: string; de: "mias" | "todas" };
  /** Botón para crear tarea en los estados vacíos. */
  nueva?: ReactNode;
}) {
  const { cambiar, pendiente } = useParametros();
  const { lista, cambiarEstado, borrar } = useInteracciones(items);

  // Instante de referencia fijo durante la visita (se renueva al refrescar la página).
  const [ahora] = useState(() => Date.now());
  const segmentos = useMemo(() => {
    const hoy = claveDia(ahora);
    const s: Record<VistaTareas, InteraccionCompleta[]> = { vencidas: [], hoy: [], proximas: [], completadas: [] };
    for (const t of lista) {
      if (t.estado !== "pendiente") s.completadas.push(t);
      else {
        const d = claveDia(t.fecha);
        (d < hoy ? s.vencidas : d === hoy ? s.hoy : s.proximas).push(t);
      }
    }
    const asc = (a: InteraccionCompleta, b: InteraccionCompleta) => a.fecha.localeCompare(b.fecha);
    s.vencidas.sort(asc);
    s.hoy.sort(asc);
    s.proximas.sort(asc);
    s.completadas.sort((a, b) => (b.completada_at ?? b.fecha).localeCompare(a.completada_at ?? a.fecha));
    return s;
  }, [lista, ahora]);

  const [vistaLocal, setVistaLocal] = useState<VistaTareas>(
    valores.vista || (segmentos.hoy.length === 0 && segmentos.vencidas.length > 0 ? "vencidas" : "hoy")
  );
  const vista = vistaLocal;
  const actuales = segmentos[vista];
  const grupos =
    vista === "hoy"
      ? [{ clave: "hoy", items: actuales }]
      : vista === "completadas"
        ? agruparPorDia(actuales.map((t) => ({ ...t, fecha: t.completada_at ?? t.fecha, _fecha: t.fecha }))).map((g) => ({
            clave: g.clave,
            items: g.items.map(({ _fecha, ...t }) => ({ ...t, fecha: _fecha })),
          }))
        : agruparPorDia(actuales);

  function irA(v: VistaTareas) {
    setVistaLocal(v);
    cambiar({ vista: v });
  }

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${pendiente ? "opacity-80" : ""}`}>
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:-mx-8 lg:px-8" aria-label="Tareas">
        {VISTAS_TAREAS.map((v) => {
          const { texto, Icono } = PESTANAS[v];
          const activa = v === vista;
          const n = segmentos[v].length;
          return (
            <button
              key={v}
              type="button"
              onClick={() => irA(v)}
              aria-current={activa ? "page" : undefined}
              className={`relative flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium transition-colors ${
                activa ? "text-tinta" : "text-tinta-2 hover:text-tinta"
              }`}
            >
              <Icono className={`size-4 ${v === "vencidas" && n > 0 ? "text-critico" : ""}`} weight={activa ? "fill" : "regular"} aria-hidden />
              {texto}
              <span
                className={`min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums ${
                  v === "vencidas" && n > 0 ? "bg-critico-suave text-critico" : "bg-placa-2 text-tinta-2"
                }`}
              >
                {v === "completadas" && n >= 60 ? "60+" : n}
              </span>
              {activa && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-acento-tinta" aria-hidden />}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        {miembroId && (
          <div className="flex rounded-lg bg-placa-2 p-0.5" role="group" aria-label="Alcance">
            {(["mias", "todas"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={valores.de === d}
                onClick={() => cambiar({ de: d === "todas" ? "" : d, responsable: "" })}
                className={`h-7 rounded-md px-2.5 text-[0.8125rem] font-medium transition-colors ${
                  valores.de === d ? "bg-placa text-tinta shadow-sm" : "text-tinta-2 hover:text-tinta"
                }`}
              >
                {d === "mias" ? "Mis tareas" : "Todas"}
              </button>
            ))}
          </div>
        )}
        {valores.de !== "mias" && (
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
        )}
        <Pildora
          etiqueta="Prioridad"
          valor={valores.prioridad}
          onCambio={(prioridad) => cambiar({ prioridad })}
          opciones={[{ valor: "", texto: "Todas" }, ...PRIORIDADES.map((p) => ({ valor: p, texto: ETIQUETA_PRIORIDAD[p] }))]}
        />
      </div>

      {actuales.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-placa px-5 py-10 shadow-placa">
          <p className="text-sm font-medium text-tinta">{PESTANAS[vista].vacio}</p>
          {vista !== "completadas" && nueva}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => (
            <section key={g.clave} className="overflow-hidden rounded-2xl bg-placa shadow-placa" aria-label={g.clave === "hoy" ? "Hoy" : etiquetaDia(g.clave)}>
              {g.clave !== "hoy" && (
                <h2
                  className={`flex items-center justify-between bg-placa-2/60 px-4 py-2 text-xs font-semibold ${
                    vista === "vencidas" ? "text-critico" : "text-tinta-2"
                  }`}
                >
                  {vista === "completadas" ? `Completadas · ${etiquetaDia(g.clave)}` : etiquetaDia(g.clave)}
                  <span className="tabular-nums font-normal">{g.items.length}</span>
                </h2>
              )}
              <ul>
                {g.items.map((t) => (
                  <FilaTarea
                    key={t.id}
                    t={t}
                    vista={vista}
                    ahora={ahora}
                    onEstado={(e) => cambiarEstado(t.id, e)}
                    onBorrar={() => borrar(t.id, t.titulo)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
