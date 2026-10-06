"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { crearInteraccion, type Resultado } from "@/app/crm/acciones/b2b";
import {
  ETIQUETA_INTERACCION,
  ETIQUETA_PRIORIDAD,
  PRIORIDADES,
  TIPOS_INTERACCION_MANUAL,
  TONO_PRIORIDAD,
  nombreCompleto,
  type EstadoInteraccion,
  type Prioridad,
  type TipoInteraccion,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { Avatar, LogoEmpresa } from "@/components/crm/b2b/Piezas";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { ICONO_INTERACCION } from "./iconos";
import { Selector } from "./Selector";
import { esTarea } from "./utiles";

export type OportunidadOpcion = { id: string; nombre: string; empresa_id: string | null; contacto_id: string | null };
type TipoManual = (typeof TIPOS_INTERACCION_MANUAL)[number];

const dosCifras = (n: number) => String(n).padStart(2, "0");
const diaLocal = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;

/** Fecha por defecto: ahora (redondeado al cuarto de hora) o mañana a las 9 si es algo por hacer. */
function fechaPorDefecto(tipo: TipoInteraccion) {
  const d = new Date();
  if (esTarea(tipo)) {
    d.setDate(d.getDate() + 1);
    return { dia: diaLocal(d), hora: "09:00" };
  }
  const m = Math.floor(d.getMinutes() / 15) * 15;
  return { dia: diaLocal(d), hora: `${dosCifras(d.getHours())}:${dosCifras(m)}` };
}

function Campo({ etiqueta, htmlFor, children, className = "" }: { etiqueta: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-tinta">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

/** Control segmentado accesible (radios nativos). */
function Segmentado<T extends string>({
  name,
  valor,
  onCambio,
  opciones,
  etiqueta,
}: {
  name: string;
  valor: T;
  onCambio: (v: T) => void;
  opciones: { valor: T; texto: string; icono?: ReactNode }[];
  etiqueta: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{etiqueta}</legend>
      <div className="flex flex-wrap gap-1 rounded-lg bg-placa-2 p-1">
        {opciones.map((o) => (
          <label
            key={o.valor}
            className="flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:text-tinta has-checked:bg-placa has-checked:text-tinta has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-acento"
          >
            <input
              type="radio"
              name={name}
              value={o.valor}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              className="sr-only"
            />
            {o.icono}
            {o.texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type Props = {
  catalogos: Catalogos;
  empresaId?: string;
  contactoId?: string;
  oportunidadId?: string;
  tipo?: TipoInteraccion;
  children?: ReactNode;
  /** Opcional: lista de oportunidades para poder vincularla desde el formulario. */
  oportunidades?: OportunidadOpcion[];
  /** Responsable propuesto por defecto (p. ej. el usuario actual). */
  responsableId?: string;
};

function Formulario({ catalogos, empresaId, contactoId, oportunidadId, tipo: tipoInicial, oportunidades, responsableId, alTerminar }: Props & { alTerminar: () => void }) {
  const router = useRouter();
  const opFija = oportunidadId ? oportunidades?.find((o) => o.id === oportunidadId) : undefined;
  const conFija = contactoId ? catalogos.contactos.find((c) => c.id === contactoId) : undefined;

  const [tipo, setTipo] = useState<TipoManual>(
    tipoInicial && (TIPOS_INTERACCION_MANUAL as readonly string[]).includes(tipoInicial) ? (tipoInicial as TipoManual) : "llamada"
  );
  const [estado, setEstado] = useState<EstadoInteraccion | null>(null);
  const [prioridad, setPrioridad] = useState<Prioridad>("media");
  const [fecha, setFecha] = useState(() => fechaPorDefecto(tipo));
  const [fechaTocada, setFechaTocada] = useState(false);
  const [empresa, setEmpresa] = useState(empresaId ?? conFija?.empresa_id ?? opFija?.empresa_id ?? "");
  const [contacto, setContacto] = useState(contactoId ?? opFija?.contacto_id ?? "");
  const [oportunidad, setOportunidad] = useState(oportunidadId ?? "");
  const [responsable, setResponsable] = useState(responsableId ?? "");

  const empresaFija = !!empresaId || (!!contactoId && !!conFija?.empresa_id) || (!!oportunidadId && !!opFija?.empresa_id);
  const contactoFijo = !!contactoId;
  const estadoEfectivo: EstadoInteraccion = estado ?? (esTarea(tipo) ? "pendiente" : "completada");

  const [resultado, accion, enviando] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    // Fecha en la zona del navegador: el servidor recibe el instante exacto.
    const { dia, hora } = fecha;
    if (dia) fd.set("fecha", new Date(`${dia}T${hora || "09:00"}`).toISOString());
    const r = await crearInteraccion(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      alTerminar();
      router.refresh();
    }
    return r;
  }, null);

  function cambiarTipo(t: TipoManual) {
    setTipo(t);
    setEstado(null);
    if (!fechaTocada) setFecha(fechaPorDefecto(t));
  }

  const opcionesEmpresa = useMemo(
    () =>
      catalogos.empresas.map((e) => ({
        valor: e.id,
        texto: e.nombre,
        icono: <LogoEmpresa nombre={e.nombre} url={e.logo_url} tamano="xs" />,
      })),
    [catalogos.empresas]
  );
  const nombreEmpresa = useMemo(() => new Map(catalogos.empresas.map((e) => [e.id, e.nombre])), [catalogos.empresas]);
  const opcionesContacto = useMemo(
    () =>
      catalogos.contactos
        .filter((c) => !empresa || c.empresa_id === empresa || c.id === contacto)
        .map((c) => ({
          valor: c.id,
          texto: nombreCompleto(c),
          detalle: [c.cargo, c.empresa_id ? nombreEmpresa.get(c.empresa_id) : null].filter(Boolean).join(" · ") || undefined,
          icono: <Avatar nombre={c.nombre} apellidos={c.apellidos} url={c.avatar_url} tamano="xs" />,
        })),
    [catalogos.contactos, empresa, contacto, nombreEmpresa]
  );
  const opcionesOportunidad = useMemo(
    () =>
      (oportunidades ?? [])
        .filter((o) => !empresa || o.empresa_id === empresa || o.id === oportunidad)
        .map((o) => ({ valor: o.id, texto: o.nombre, detalle: o.empresa_id ? nombreEmpresa.get(o.empresa_id) : undefined })),
    [oportunidades, empresa, oportunidad, nombreEmpresa]
  );

  function elegirEmpresa(id: string) {
    setEmpresa(id);
    if (id && contacto && catalogos.contactos.find((c) => c.id === contacto)?.empresa_id !== id) setContacto("");
    if (id && oportunidad && !oportunidadId && oportunidades?.find((o) => o.id === oportunidad)?.empresa_id !== id) setOportunidad("");
  }
  function elegirContacto(id: string) {
    setContacto(id);
    const c = catalogos.contactos.find((x) => x.id === id);
    if (c?.empresa_id && !empresa) setEmpresa(c.empresa_id);
  }
  function elegirOportunidad(id: string) {
    setOportunidad(id);
    const o = oportunidades?.find((x) => x.id === id);
    if (o?.empresa_id && !empresa) setEmpresa(o.empresa_id);
    if (o?.contacto_id && !contacto) setContacto(o.contacto_id);
  }

  const idBase = "nueva-interaccion";
  const select = `${claseCampo} appearance-none`;

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Segmentado
        name="tipo"
        etiqueta="Tipo de actividad"
        valor={tipo}
        onCambio={cambiarTipo}
        opciones={TIPOS_INTERACCION_MANUAL.map((t) => {
          const Icono = ICONO_INTERACCION[t];
          return { valor: t, texto: ETIQUETA_INTERACCION[t], icono: <Icono className="size-4" aria-hidden /> };
        })}
      />

      <Campo etiqueta="Título" htmlFor={`${idBase}-titulo`}>
        <input
          id={`${idBase}-titulo`}
          name="titulo"
          required
          minLength={2}
          autoComplete="off"
          autoFocus
          placeholder={
            tipo === "llamada"
              ? "Llamada de seguimiento de la propuesta"
              : tipo === "email"
                ? "Enviado catálogo y tarifas"
                : tipo === "reunion"
                  ? "Reunión de presentación"
                  : tipo === "tarea"
                    ? "Preparar propuesta económica"
                    : tipo === "seguimiento"
                      ? "Volver a llamar para cerrar fecha"
                      : "Nota interna"
          }
          className={claseCampo}
        />
      </Campo>

      <Campo etiqueta="Descripción" htmlFor={`${idBase}-descripcion`}>
        <textarea
          id={`${idBase}-descripcion`}
          name="descripcion"
          rows={3}
          className={`${claseCampo} h-auto py-2`}
          placeholder="Qué se habló, acuerdos, siguientes pasos…"
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_7rem_1fr]">
        <Campo etiqueta={esTarea(tipo) ? "Vence el" : "Fecha"} htmlFor={`${idBase}-dia`}>
          <input
            id={`${idBase}-dia`}
            type="date"
            required
            value={fecha.dia}
            onChange={(e) => {
              setFechaTocada(true);
              setFecha((f) => ({ ...f, dia: e.target.value }));
            }}
            className={claseCampo}
          />
        </Campo>
        <Campo etiqueta="Hora" htmlFor={`${idBase}-hora`}>
          <input
            id={`${idBase}-hora`}
            type="time"
            step={300}
            value={fecha.hora}
            onChange={(e) => {
              setFechaTocada(true);
              setFecha((f) => ({ ...f, hora: e.target.value }));
            }}
            className={`${claseCampo} tabular-nums`}
          />
        </Campo>
        <Campo etiqueta="Responsable" htmlFor={`${idBase}-responsable`} className="col-span-2 sm:col-span-1">
          <select
            id={`${idBase}-responsable`}
            name="responsable_id"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            className={select}
          >
            <option value="">Sin asignar</option>
            {catalogos.equipo
              .filter((m) => m.activo || m.id === responsable)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreCompleto(m)}
                </option>
              ))}
          </select>
        </Campo>
      </div>

      <div className={`grid gap-3 ${esTarea(tipo) ? "sm:grid-cols-2" : ""}`}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-tinta">Estado</span>
          <Segmentado
            name="estado"
            etiqueta="Estado"
            valor={estadoEfectivo}
            onCambio={setEstado}
            opciones={[
              { valor: "pendiente" as EstadoInteraccion, texto: "Pendiente" },
              { valor: "completada" as EstadoInteraccion, texto: "Completada" },
            ]}
          />
        </div>
        {esTarea(tipo) && (
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-tinta">Prioridad</span>
            <Segmentado
              name="prioridad"
              etiqueta="Prioridad"
              valor={prioridad}
              onCambio={setPrioridad}
              opciones={PRIORIDADES.map((p) => ({
                valor: p,
                texto: ETIQUETA_PRIORIDAD[p],
                icono: <span className="size-2 rounded-full" style={{ background: TONO_PRIORIDAD[p] }} aria-hidden />,
              }))}
            />
          </div>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl bg-placa-2/60 p-3">
        <legend className="px-1 text-[0.8125rem] font-medium text-tinta">Relacionado con</legend>
        <Campo etiqueta="Empresa" htmlFor={`${idBase}-empresa`}>
          <Selector
            id={`${idBase}-empresa`}
            name="empresa_id"
            valor={empresa}
            onCambio={elegirEmpresa}
            opciones={opcionesEmpresa}
            fijo={empresaFija}
            placeholder="Elegir empresa"
            vacio="No hay empresas con ese nombre."
          />
        </Campo>
        <Campo etiqueta="Contacto" htmlFor={`${idBase}-contacto`}>
          <Selector
            id={`${idBase}-contacto`}
            name="contacto_id"
            valor={contacto}
            onCambio={elegirContacto}
            opciones={opcionesContacto}
            fijo={contactoFijo}
            placeholder={empresa ? "Elegir contacto de la empresa" : "Elegir contacto"}
            vacio={empresa ? "Esta empresa no tiene contactos con ese nombre." : "No hay contactos con ese nombre."}
          />
        </Campo>
        {(oportunidades || oportunidadId) && (
          <Campo etiqueta="Oportunidad" htmlFor={`${idBase}-oportunidad`}>
            <Selector
              id={`${idBase}-oportunidad`}
              name="oportunidad_id"
              valor={oportunidad}
              onCambio={elegirOportunidad}
              opciones={
                oportunidadId && !opFija ? [{ valor: oportunidadId, texto: "Esta oportunidad" }] : opcionesOportunidad
              }
              fijo={!!oportunidadId}
              placeholder="Elegir oportunidad"
              vacio="No hay oportunidades que coincidan."
            />
          </Campo>
        )}
      </fieldset>

      {resultado?.ok === false && (
        <p role="alert" className={claseError}>
          {resultado.mensaje}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={alTerminar}
          className="inline-flex h-9 items-center justify-center rounded-md bg-placa-2 px-4 text-sm font-medium text-tinta transition-colors hover:bg-linea"
        >
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando ? "Guardando…" : esTarea(tipo) ? "Crear tarea" : "Registrar"}
        </button>
      </div>
    </form>
  );
}

/**
 * Alta de actividad o tarea en un diálogo. Los ids que llegan por props quedan
 * fijados (p. ej. desde la ficha de una empresa); el resto se elige con buscador.
 */
export function NuevaInteraccion(props: Props) {
  const { tipo, children } = props;
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  const esNuevaTarea = tipo === "tarea" || tipo === "seguimiento";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setVez((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
            <Plus className="size-4" weight="bold" aria-hidden />
            {esNuevaTarea ? "Nueva tarea" : "Registrar actividad"}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto bg-placa p-5 text-tinta shadow-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-tinta">
            {esNuevaTarea ? "Nueva tarea" : "Registrar actividad"}
          </DialogTitle>
          <DialogDescription className="text-tinta-2">
            Queda en la línea temporal de la empresa, el contacto y la oportunidad vinculados.
          </DialogDescription>
        </DialogHeader>
        <Formulario key={vez} {...props} alTerminar={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}

