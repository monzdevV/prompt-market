import Link from "next/link";
import {
  ArrowsLeftRight,
  CalendarCheck,
  CheckSquare,
  EnvelopeSimple,
  Flag,
  NotePencil,
  Phone,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  ETIQUETA_INTERACCION,
  TONO_INTERACCION,
  nombreCompleto,
  probabilidadB2B,
  ruta,
  type EmpresaMini,
  type InteraccionCompleta,
  type OportunidadCompleta,
  type TipoInteraccion,
} from "@/lib/b2b";
import type { Seguimiento } from "@/lib/datos/dashboard";
import { dinero, fecha, fechaHora, numero, relativo } from "@/lib/formato";
import { BadgeEtapa, BadgePrioridad, LogoEmpresa, Responsable } from "@/components/crm/b2b/Piezas";

export const ICONO_INTERACCION: Record<TipoInteraccion, Icon> = {
  llamada: Phone,
  email: EnvelopeSimple,
  reunion: UsersThree,
  nota: NotePencil,
  tarea: CheckSquare,
  seguimiento: CalendarCheck,
  cambio_etapa: ArrowsLeftRight,
};

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-tinta-2">{children}</p>;
}

/** Icono redondo con el tono del tipo. */
function Pastilla({ Icono, tono }: { Icono: Icon; tono: string }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full text-sobre-relleno" style={{ background: tono }} aria-hidden>
      <Icono className="size-3.5" weight="bold" />
    </span>
  );
}

/* ---------------------------- Próximos seguimientos ---------------------------- */

export function ProximosSeguimientos({ items }: { items: Seguimiento[] }) {
  if (items.length === 0) return <Vacio>No hay acciones ni tareas pendientes. Buen momento para prospectar.</Vacio>;
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((s) => {
        const Icono = s.tipo ? ICONO_INTERACCION[s.tipo] : Flag;
        const tono = s.tipo ? TONO_INTERACCION[s.tipo] : "var(--relleno-violeta)";
        return (
          <li key={s.id}>
            <Link
              href={s.href}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-placa-2"
            >
              <Pastilla Icono={Icono} tono={tono} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-tinta">{s.titulo}</span>
                <span className="truncate text-xs text-tinta-2">
                  {s.clase === "accion" ? "Próxima acción" : s.tipo ? ETIQUETA_INTERACCION[s.tipo] : ""}
                  {s.contexto ? ` · ${s.contexto}` : ""}
                </span>
              </span>
              {(s.prioridad === "alta" || s.prioridad === "urgente") && (
                <span className="hidden sm:inline-flex">
                  <BadgePrioridad prioridad={s.prioridad} />
                </span>
              )}
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums ${s.vencida ? "text-critico" : "text-tinta"}`}>
                  {s.vencida && <span className="size-1.5 rounded-full bg-critico" aria-hidden />}
                  {s.vencida ? `Vencida ${relativo(s.fecha)}` : relativo(s.fecha)}
                </span>
                <span className="text-[0.7rem] tabular-nums text-tinta-2">{fechaHora(s.fecha)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ Actividad reciente ------------------------------ */

export function ActividadReciente({ items }: { items: InteraccionCompleta[] }) {
  if (items.length === 0) return <Vacio>Todavía no se ha registrado actividad.</Vacio>;
  return (
    <ol className="relative flex flex-col gap-3.5 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-linea">
      {items.map((i) => (
        <li key={i.id} className="relative flex gap-3">
          <Pastilla Icono={ICONO_INTERACCION[i.tipo]} tono={TONO_INTERACCION[i.tipo]} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-sm font-medium text-tinta">{i.titulo}</span>
              <time dateTime={i.fecha} className="ml-auto shrink-0 text-xs tabular-nums text-tinta-2" title={fechaHora(i.fecha)}>
                {relativo(i.fecha)}
              </time>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-tinta-2">
              <span>{ETIQUETA_INTERACCION[i.tipo]}</span>
              {i.oportunidad && (
                <>
                  <span aria-hidden>·</span>
                  <Link href={ruta.oportunidad(i.oportunidad.id)} className="truncate text-tinta hover:underline">
                    {i.oportunidad.nombre}
                  </Link>
                </>
              )}
              {i.empresa && (
                <>
                  <span aria-hidden>·</span>
                  <Link href={ruta.empresa(i.empresa.id)} className="truncate hover:text-tinta hover:underline">
                    {i.empresa.nombre}
                  </Link>
                </>
              )}
              {i.contacto && (
                <>
                  <span aria-hidden>·</span>
                  <Link href={ruta.contacto(i.contacto.id)} className="truncate hover:text-tinta hover:underline">
                    {nombreCompleto(i.contacto)}
                  </Link>
                </>
              )}
              {i.responsable && <span className="ml-auto"><Responsable m={i.responsable} soloAvatar /></span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------- Top oportunidades ---------------------------- */

export function TopOportunidades({ items }: { items: OportunidadCompleta[] }) {
  if (items.length === 0) return <Vacio>No hay oportunidades abiertas.</Vacio>;
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((o) => (
        <li key={o.id}>
          <Link href={ruta.oportunidad(o.id)} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-placa-2">
            {o.empresa ? (
              <LogoEmpresa nombre={o.empresa.nombre} url={o.empresa.logo_url} />
            ) : (
              <span className="size-7 shrink-0 rounded-md border border-dashed border-linea" aria-hidden />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-tinta">{o.nombre}</span>
              <span className="truncate text-xs text-tinta-2">
                {o.empresa?.nombre ?? "Sin empresa"}
                {o.fecha_cierre ? ` · cierre ${fecha(o.fecha_cierre)}` : ""}
              </span>
            </span>
            <span className="hidden sm:inline-flex">
              <BadgeEtapa etapa={o.etapa} />
            </span>
            <span className="flex w-24 shrink-0 flex-col items-end">
              <span className="text-sm font-semibold tabular-nums text-tinta">{dinero(o.valor)}</span>
              <span className="text-[0.7rem] tabular-nums text-tinta-2">{probabilidadB2B(o)} %</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------- Top empresas ------------------------------- */

export function TopEmpresas({
  items,
}: {
  items: { empresa: EmpresaMini; abiertas: number; valorAbierto: number; valorGanado: number }[];
}) {
  if (items.length === 0) return <Vacio>Aún no hay empresas con oportunidades.</Vacio>;
  const max = Math.max(...items.map((e) => e.valorAbierto + e.valorGanado), 1);
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map(({ empresa, abiertas, valorAbierto, valorGanado }) => {
        const total = valorAbierto + valorGanado;
        return (
          <li key={empresa.id}>
            <Link href={ruta.empresa(empresa.id)} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-placa-2">
              <LogoEmpresa nombre={empresa.nombre} url={empresa.logo_url} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium text-tinta">{empresa.nombre}</span>
                  <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-tinta">{dinero(total)}</span>
                </span>
                <span
                  className="flex h-1.5 overflow-hidden rounded-full bg-placa-2"
                  role="img"
                  aria-label={`${dinero(valorGanado)} ganado, ${dinero(valorAbierto)} abierto`}
                >
                  <span className="h-full bg-exito" style={{ width: `${(valorGanado / max) * 100}%` }} />
                  <span className="h-full bg-serie-1" style={{ width: `${(valorAbierto / max) * 100}%` }} />
                </span>
                <span className="text-[0.7rem] tabular-nums text-tinta-2">
                  {numero(abiertas)} abiertas · {dinero(valorGanado)} ganado
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
