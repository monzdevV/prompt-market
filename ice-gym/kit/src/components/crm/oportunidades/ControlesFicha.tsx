"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChatCircleDots,
  CheckSquare,
  DotsThree,
  PencilSimple,
  Trash,
  Trophy,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cambiarEstadoInteraccion, type Resultado } from "@/app/crm/acciones/b2b";
import { actualizarOportunidad, borrarOportunidad, guardarNotas } from "@/app/crm/acciones/oportunidades";
import {
  ETAPAS,
  ETIQUETA_ETAPA,
  TONO_ETAPA,
  ruta,
  type InteraccionCompleta,
  type OportunidadCompleta,
} from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { fechaHora } from "@/lib/formato";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { BadgeInteraccion, Responsable } from "@/components/crm/b2b/Piezas";
import { NuevaInteraccion } from "@/components/crm/actividad/NuevaInteraccion";
import { useAccionesOportunidad } from "./Acciones";
import { CamposOportunidad } from "./CamposOportunidad";

const botonSec =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta transition-colors hover:bg-placa-2 disabled:opacity-50";

/* -------------------------------- Selector de etapa -------------------------------- */

/** Camino de etapas: un grupo de radios con aspecto de pipeline. */
export function SelectorEtapa({ o }: { o: OportunidadCompleta }) {
  const { mover, pendiente } = useAccionesOportunidad();
  const indice = ETAPAS.indexOf(o.etapa);

  function teclas(e: React.KeyboardEvent, i: number) {
    const paso = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const siguiente = (i + paso + ETAPAS.length) % ETAPAS.length;
    (e.currentTarget.parentElement?.children[siguiente] as HTMLElement | undefined)?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Etapa de la oportunidad"
      className={`grid grid-cols-3 gap-1 sm:flex sm:gap-0.5 ${pendiente ? "opacity-70" : ""}`}
    >
      {ETAPAS.map((e, i) => {
        const actual = e === o.etapa;
        const pasada = i < indice && o.etapa !== "perdida" && e !== "perdida";
        const cerrada = e === "ganada" || e === "perdida";
        return (
          <button
            key={e}
            type="button"
            role="radio"
            aria-checked={actual}
            tabIndex={actual ? 0 : -1}
            disabled={pendiente}
            onKeyDown={(ev) => teclas(ev, i)}
            onClick={() => !actual && mover(o, e)}
            className={`relative flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-md px-2 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento sm:first:rounded-l-lg sm:last:rounded-r-lg ${
              actual
                ? "text-tinta ring-1 ring-inset ring-tinta/20"
                : pasada
                  ? "text-tinta hover:brightness-95"
                  : "bg-placa-2/60 text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            } ${cerrada ? "sm:ml-1" : ""}`}
            style={actual || pasada ? { background: TONO_ETAPA[actual ? e : o.etapa] } : undefined}
          >
            {ETIQUETA_ETAPA[e]}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Edición completa -------------------------------- */

function EditarOportunidad({
  o,
  catalogos,
  abierto,
  onCambio,
}: {
  o: OportunidadCompleta;
  catalogos: Catalogos;
  abierto: boolean;
  onCambio: (v: boolean) => void;
}) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await actualizarOportunidad(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      onCambio(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <Sheet open={abierto} onOpenChange={onCambio}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-linea pr-12">
          <SheetTitle>Editar oportunidad</SheetTitle>
          <SheetDescription>Si cambias la etapa, quedará anotado en el seguimiento.</SheetDescription>
        </SheetHeader>
        {abierto && (
          <form action={accion} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="id" value={o.id} />
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <CamposOportunidad catalogos={catalogos} inicial={o} conEstado />
            </div>
            <div className="flex flex-col gap-3 border-t border-linea p-4">
              {estado?.ok === false && (
                <p role="alert" className={claseError}>
                  {estado.mensaje}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => onCambio(false)} className={`${botonSec} h-9`}>
                  Cancelar
                </button>
                <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
                  {pendiente ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Acciones de cabecera -------------------------------- */

export function AccionesFicha({ o, catalogos }: { o: OportunidadCompleta; catalogos: Catalogos }) {
  const router = useRouter();
  const { mover, pendiente } = useAccionesOportunidad();
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [borrandoAhora, empezar] = useTransition();
  const cerrada = o.etapa === "ganada" || o.etapa === "perdida";
  const interaccion = {
    catalogos,
    oportunidadId: o.id,
    empresaId: o.empresa_id ?? undefined,
    contactoId: o.contacto_id ?? undefined,
  };

  function borrar() {
    empezar(async () => {
      const r = await borrarOportunidad(o.id);
      if (r.ok) {
        toast.success(r.mensaje);
        router.push(ruta.oportunidades);
      } else toast.error(r.mensaje);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setEditando(true)} className={botonSec}>
        <PencilSimple className="size-4" aria-hidden />
        Editar
      </button>
      <NuevaInteraccion {...interaccion}>
        <button type="button" className={botonSec}>
          <ChatCircleDots className="size-4" aria-hidden />
          Registrar actividad
        </button>
      </NuevaInteraccion>
      <NuevaInteraccion {...interaccion} tipo="tarea">
        <button type="button" className={botonSec}>
          <CheckSquare className="size-4" aria-hidden />
          Nueva tarea
        </button>
      </NuevaInteraccion>
      {!cerrada && (
        <>
          <button type="button" disabled={pendiente} onClick={() => mover(o, "ganada")} className={`${claseBotonPrincipal} h-8 px-3`}>
            <Trophy className="size-4" weight="fill" aria-hidden />
            Ganada
          </button>
          <button type="button" disabled={pendiente} onClick={() => mover(o, "perdida")} className={botonSec}>
            <XCircle className="size-4" aria-hidden />
            Perdida
          </button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Más acciones" className={`${botonSec} w-8 justify-center px-0`}>
            <DotsThree className="size-5" weight="bold" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {cerrada && (
            <DropdownMenuItem onSelect={() => mover(o, "negociacion")}>Reabrir en Negociación</DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setBorrando(true)}>
            <Trash aria-hidden /> Borrar oportunidad
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditarOportunidad o={o} catalogos={catalogos} abierto={editando} onCambio={setEditando} />

      <Dialog open={borrando} onOpenChange={setBorrando}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Borrar «{o.nombre}»?</DialogTitle>
            <DialogDescription>
              No se puede deshacer. Las actividades escritas a mano se conservan en la empresa y el contacto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => setBorrando(false)} className={`${botonSec} h-9`}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={borrar}
              disabled={borrandoAhora}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-critico px-4 text-sm font-medium text-sobre-critico hover:brightness-110 disabled:opacity-50"
            >
              <Trash className="size-4" aria-hidden />
              {borrandoAhora ? "Borrando…" : "Borrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------- Notas editables -------------------------------- */

export function NotasEditables({ id, notas }: { id: string; notas: string | null }) {
  const router = useRouter();
  const [texto, setTexto] = useState(notas ?? "");
  const [pendiente, empezar] = useTransition();
  const cambiado = texto.trim() !== (notas ?? "").trim();

  function guardar() {
    empezar(async () => {
      const r = await guardarNotas(id, texto);
      if (r.ok) {
        toast.success(r.mensaje);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && cambiado) guardar();
        }}
        rows={4}
        aria-label="Notas internas"
        placeholder="Apuntes internos: contexto, acuerdos, cosas a recordar…"
        className={`${claseCampo} h-auto py-2 leading-relaxed`}
      />
      {cambiado && (
        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-xs text-tinta-2">Ctrl + Intro para guardar</span>
          <button type="button" onClick={() => setTexto(notas ?? "")} className="h-8 rounded-md px-3 text-[0.8125rem] text-tinta-2 hover:text-tinta">
            Descartar
          </button>
          <button type="button" onClick={guardar} disabled={pendiente} className={`${claseBotonPrincipal} h-8 px-3`}>
            {pendiente ? "Guardando…" : "Guardar notas"}
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Tareas pendientes -------------------------------- */

export function TareasPendientes({ tareas }: { tareas: InteraccionCompleta[] }) {
  const router = useRouter();
  const [hechas, setHechas] = useState<Set<string>>(new Set());
  const [, empezar] = useTransition();
  const [ahora] = useState(() => Date.now());

  function completar(t: InteraccionCompleta) {
    setHechas((s) => new Set(s).add(t.id));
    empezar(async () => {
      const r = await cambiarEstadoInteraccion(t.id, "completada");
      if (r.ok) {
        toast.success(`«${t.titulo}» completada`);
        router.refresh();
      } else {
        setHechas((s) => {
          const n = new Set(s);
          n.delete(t.id);
          return n;
        });
        toast.error(r.mensaje);
      }
    });
  }

  const visibles = tareas.filter((t) => !hechas.has(t.id));
  if (visibles.length === 0) {
    return <p className="py-2 text-sm text-tinta-2">Nada pendiente. Crea una tarea para no perder el hilo.</p>;
  }

  return (
    <ul className="-mx-1 flex flex-col">
      {visibles.map((t) => {
        const vencida = new Date(t.fecha).getTime() < ahora;
        return (
          <li key={t.id} className="flex items-start gap-3 rounded-md px-1 py-2 hover:bg-placa-2/50">
            <input
              type="checkbox"
              onChange={() => completar(t)}
              aria-label={`Completar ${t.titulo}`}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-acento"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm text-tinta">{t.titulo}</span>
              <span className={`flex items-center gap-1.5 text-xs tabular-nums ${vencida ? "font-medium text-critico" : "text-tinta-2"}`}>
                {vencida && <WarningCircle className="size-3.5" weight="fill" aria-hidden />}
                {vencida && <span className="sr-only">Vencida:</span>}
                {fechaHora(t.fecha)}
              </span>
            </div>
            <BadgeInteraccion tipo={t.tipo} />
            <Responsable m={t.responsable} soloAvatar />
          </li>
        );
      })}
    </ul>
  );
}
