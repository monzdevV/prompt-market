"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { Buildings, ClockCountdown, Target, User } from "@phosphor-icons/react";
import {
  ETIQUETA_INTERACCION,
  ETIQUETA_ESTADO_INTERACCION,
  TIPOS_INTERACCION,
  TONO_INTERACCION,
  nombreCompleto,
  ruta,
  type InteraccionCompleta,
  type TipoInteraccion,
} from "@/lib/b2b";
import { hora, relativo } from "@/lib/formato";
import { BadgePrioridad, Responsable, Tag } from "@/components/crm/b2b/Piezas";
import { ICONO_INTERACCION } from "./iconos";
import { MenuInteraccion } from "./MenuInteraccion";
import { useInteracciones } from "./useInteracciones";
import { useTramos } from "@/components/crm/MostrarMas";
import { agruparPorDia, claseCasilla, esTarea, esVencida, etiquetaDia } from "./utiles";

type Relacion = "empresa" | "contacto" | "oportunidad";

/** Texto largo: tres líneas y «Ver más». */
function Descripcion({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false);
  const larga = texto.length > 220 || texto.split("\n").length > 3;
  return (
    <div className="mt-1">
      <p className={`whitespace-pre-line text-sm leading-relaxed text-tinta-2 ${larga && !abierta ? "line-clamp-3" : ""}`}>
        {texto}
      </p>
      {larga && (
        <button
          type="button"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
          className="mt-0.5 text-xs font-medium text-acento-tinta hover:underline"
        >
          {abierta ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}

function Relacionado({
  href,
  Icono,
  texto,
  etiqueta,
}: {
  href: string;
  Icono: typeof Buildings;
  texto: string;
  etiqueta: string;
}) {
  return (
    <Link
      href={href}
      title={`${etiqueta}: ${texto}`}
      className="inline-flex min-w-0 max-w-56 items-center gap-1 rounded-md px-1 py-0.5 text-[0.8125rem] text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
    >
      <Icono className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{etiqueta}: </span>
      <span className="truncate">{texto}</span>
    </Link>
  );
}

/** Enlaces cruzados de una actividad (sin repetir la ficha en la que ya estamos). */
export function RelacionesInteraccion({ i, ocultar = [] }: { i: InteraccionCompleta; ocultar?: Relacion[] }) {
  const mostrar = (r: Relacion) => !ocultar.includes(r);
  const hay =
    (mostrar("empresa") && i.empresa) || (mostrar("contacto") && i.contacto) || (mostrar("oportunidad") && i.oportunidad);
  if (!hay) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
      {mostrar("empresa") && i.empresa && (
        <Relacionado href={ruta.empresa(i.empresa.id)} Icono={Buildings} texto={i.empresa.nombre} etiqueta="Empresa" />
      )}
      {mostrar("contacto") && i.contacto && (
        <Relacionado href={ruta.contacto(i.contacto.id)} Icono={User} texto={nombreCompleto(i.contacto)} etiqueta="Contacto" />
      )}
      {mostrar("oportunidad") && i.oportunidad && (
        <Relacionado href={ruta.oportunidad(i.oportunidad.id)} Icono={Target} texto={i.oportunidad.nombre} etiqueta="Oportunidad" />
      )}
    </span>
  );
}

/** Icono redondo del tipo, con su tono. */
export function IconoInteraccion({ tipo, apagado = false }: { tipo: TipoInteraccion; apagado?: boolean }) {
  const Icono = ICONO_INTERACCION[tipo];
  return (
    <span
      className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sobre-relleno ring-4 ring-fondo ${apagado ? "opacity-50" : ""}`}
      style={{ background: TONO_INTERACCION[tipo] } as CSSProperties}
      title={ETIQUETA_INTERACCION[tipo]}
    >
      <Icono className="size-4" weight="bold" aria-hidden />
    </span>
  );
}

function Elemento({
  i,
  ultimo,
  ocultar,
  onEstado,
  onBorrar,
}: {
  i: InteraccionCompleta;
  ultimo: boolean;
  ocultar?: Relacion[];
  onEstado: (e: InteraccionCompleta["estado"]) => void;
  onBorrar: () => void;
}) {
  const tarea = esTarea(i.tipo);
  const vencida = esVencida(i);
  const cerrada = i.estado !== "pendiente";
  const tachada = tarea && cerrada;

  return (
    <li className="relative flex gap-3 pb-5 last:pb-1">
      {!ultimo && <span className="absolute bottom-0 left-4 top-8 w-px -translate-x-1/2 bg-linea" aria-hidden />}
      <IconoInteraccion tipo={i.tipo} apagado={i.estado === "cancelada"} />

      <div className="flex min-w-0 flex-1 flex-col pt-1">
        <div className="flex min-w-0 items-start gap-2.5">
          {tarea && i.estado !== "cancelada" && (
            <input
              type="checkbox"
              className={`${claseCasilla} mt-px`}
              checked={i.estado === "completada"}
              onChange={(e) => onEstado(e.target.checked ? "completada" : "pendiente")}
              aria-label={i.estado === "completada" ? `Reabrir «${i.titulo}»` : `Completar «${i.titulo}»`}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`text-sm font-medium ${tachada ? "text-tinta-2 line-through decoration-tinta-2/60" : "text-tinta"} ${
                  i.tipo === "cambio_etapa" ? "font-normal" : ""
                }`}
              >
                {i.titulo}
              </span>
              {i.tipo !== "cambio_etapa" && (
                <span className="text-xs text-tinta-2">{ETIQUETA_INTERACCION[i.tipo]}</span>
              )}
              {tarea && i.estado === "pendiente" && (i.prioridad === "alta" || i.prioridad === "urgente") && (
                <BadgePrioridad prioridad={i.prioridad} />
              )}
              {vencida && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-critico">
                  <ClockCountdown className="size-3.5" aria-hidden />
                  Vencida {relativo(i.fecha)}
                </span>
              )}
              {i.estado === "cancelada" && <Tag tono="var(--relleno-gris)">{ETIQUETA_ESTADO_INTERACCION.cancelada}</Tag>}
              {tarea && i.estado === "pendiente" && !vencida && (
                <Tag tono="var(--relleno-ambar)">{ETIQUETA_ESTADO_INTERACCION.pendiente}</Tag>
              )}
            </p>
            {i.descripcion && <Descripcion texto={i.descripcion} />}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {i.responsable && <Responsable m={i.responsable} />}
              <RelacionesInteraccion i={i} ocultar={ocultar} />
            </div>
          </div>
          <time
            dateTime={i.fecha}
            className={`shrink-0 pt-0.5 text-xs tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}
          >
            {hora(i.fecha)}
          </time>
          <MenuInteraccion item={i} onEstado={onEstado} onBorrar={onBorrar} />
        </div>
      </div>
    </li>
  );
}

/**
 * Línea temporal vertical agrupada por día. Sirve para fichas (empresa,
 * contacto, oportunidad) y para el feed global de actividades.
 */
export function LineaTemporal({
  items,
  vacio = "Todavía no hay actividad registrada.",
  ocultar,
  filtrar = true,
  accionVacia,
}: {
  items: InteraccionCompleta[];
  vacio?: string;
  /** Relaciones que no se enlazan porque ya estamos en esa ficha. */
  ocultar?: Relacion[];
  /** Chips de filtro rápido por tipo. */
  filtrar?: boolean;
  /** Botón que se muestra en el estado vacío (p. ej. <NuevaInteraccion …/>). */
  accionVacia?: ReactNode;
}) {
  const { lista, cambiarEstado, borrar } = useInteracciones(items);
  const [tipo, setTipo] = useState<TipoInteraccion | "todos">("todos");

  const conteo = useMemo(() => {
    const c = new Map<TipoInteraccion, number>();
    for (const i of lista) c.set(i.tipo, (c.get(i.tipo) ?? 0) + 1);
    return c;
  }, [lista]);
  const tiposPresentes = TIPOS_INTERACCION.filter((t) => conteo.has(t));
  const tipoActivo = tipo !== "todos" && conteo.has(tipo) ? tipo : "todos";
  const visibles = tipoActivo === "todos" ? lista : lista.filter((i) => i.tipo === tipoActivo);
  const { visibles: tramo, mas } = useTramos(visibles, 40);
  const grupos = agruparPorDia(tramo);

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-placa-2/60 px-4 py-8">
        <p className="text-sm font-medium text-tinta">{vacio}</p>
        <p className="max-w-md text-sm text-tinta-2">
          Anota llamadas, emails, reuniones y notas, o deja una tarea con fecha para no perder el hilo.
        </p>
        {accionVacia}
      </div>
    );
  }

  const chip = (activo: boolean) =>
    `inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento-tinta ${
      activo ? "bg-acento-suave text-acento-tinta" : "bg-placa-2 text-tinta-2 hover:text-tinta"
    }`;

  return (
    <div className="flex flex-col gap-4">
      {filtrar && tiposPresentes.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
          <button type="button" className={chip(tipoActivo === "todos")} aria-pressed={tipoActivo === "todos"} onClick={() => setTipo("todos")}>
            Todo <span className="tabular-nums opacity-70">{lista.length}</span>
          </button>
          {tiposPresentes.map((t) => {
            const Icono = ICONO_INTERACCION[t];
            return (
              <button key={t} type="button" className={chip(tipoActivo === t)} aria-pressed={tipoActivo === t} onClick={() => setTipo(t)}>
                <Icono className="size-3.5" aria-hidden />
                {ETIQUETA_INTERACCION[t]}
                <span className="tabular-nums opacity-70">{conteo.get(t)}</span>
              </button>
            );
          })}
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {grupos.map((g) => (
          <li key={g.clave}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-tinta-2">
              {etiquetaDia(g.clave)}
              <span className="h-px flex-1 bg-linea" aria-hidden />
            </h3>
            <ol>
              {g.items.map((i, n) => (
                <Elemento
                  key={i.id}
                  i={i}
                  ultimo={n === g.items.length - 1}
                  ocultar={ocultar}
                  onEstado={(e) => cambiarEstado(i.id, e)}
                  onBorrar={() => borrar(i.id, i.titulo)}
                />
              ))}
            </ol>
          </li>
        ))}
      </ol>
      {mas}
    </div>
  );
}
