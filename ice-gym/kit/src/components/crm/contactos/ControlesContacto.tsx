"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Copy, DotsThree, PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { claseBotonPrincipal, claseCampo } from "@/components/crm/Primitivas";
import { actualizarContacto, borrarContacto, guardarNotasContacto } from "@/app/crm/acciones/contactos";
import { cambiarEstadoInteraccion, type Resultado } from "@/app/crm/acciones/b2b";
import { nombreCompleto, ruta, type Contacto } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { CamposContacto } from "./FormularioContacto";
import { copiar } from "./AccionesContacto";

export const claseBotonSecundario =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-placa px-3 text-[0.8125rem] font-medium text-tinta shadow-placa transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento";

/* ------------------------------ Editar (Sheet) ------------------------------ */

function HojaEditar({
  contacto,
  catalogos,
  abierto,
  onAbierto,
}: {
  contacto: Contacto;
  catalogos: Catalogos;
  abierto: boolean;
  onAbierto: (v: boolean) => void;
}) {
  const router = useRouter();
  const [estado, accion] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await actualizarContacto(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      onAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <Sheet open={abierto} onOpenChange={onAbierto}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Editar contacto</SheetTitle>
          <SheetDescription>{nombreCompleto(contacto)}</SheetDescription>
        </SheetHeader>
        <form action={accion} className="flex-1 overflow-y-auto p-4">
          <input type="hidden" name="id" value={contacto.id} />
          <CamposContacto
            catalogos={catalogos}
            inicial={contacto}
            conEstado
            estado={estado}
            textoEnviar="Guardar cambios"
            textoPendiente="Guardando…"
            onCancelar={() => onAbierto(false)}
          />
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function EditarContacto({ contacto, catalogos }: { contacto: Contacto; catalogos: Catalogos }) {
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVez((n) => n + 1);
          setAbierto(true);
        }}
        className={claseBotonSecundario}
      >
        <PencilSimple className="size-4" aria-hidden /> Editar
      </button>
      <HojaEditar key={vez} contacto={contacto} catalogos={catalogos} abierto={abierto} onAbierto={setAbierto} />
    </>
  );
}

/* ------------------------- Más acciones y borrado ------------------------- */

export function MasAcciones({ contacto }: { contacto: Contacto }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, empezar] = useTransition();

  function borrar() {
    empezar(async () => {
      const r = await borrarContacto(contacto.id);
      if (r.ok) {
        toast.success(`${nombreCompleto(contacto)} borrado.`);
        setConfirmar(false);
        router.push(contacto.empresa_id ? ruta.empresa(contacto.empresa_id) : ruta.contactos);
        router.refresh();
      } else toast.error(r.mensaje);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Más acciones" className={`${claseBotonSecundario} w-8 justify-center px-0`}>
            <DotsThree className="size-5" weight="bold" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {contacto.email && (
            <DropdownMenuItem onSelect={() => copiar(contacto.email!, "Email copiado.")}>
              <Copy className="size-4" aria-hidden /> Copiar email
            </DropdownMenuItem>
          )}
          {contacto.telefono && (
            <DropdownMenuItem onSelect={() => copiar(contacto.telefono!, "Teléfono copiado.")}>
              <Copy className="size-4" aria-hidden /> Copiar teléfono
            </DropdownMenuItem>
          )}
          {(contacto.email || contacto.telefono) && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmar(true)}>
            <Trash className="size-4" aria-hidden /> Borrar contacto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Borrar a {nombreCompleto(contacto)}?</DialogTitle>
            <DialogDescription>
              Se borra el contacto y su actividad registrada. Sus oportunidades se conservan, pero quedan sin contacto. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-tinta-2 hover:bg-placa-2 hover:text-tinta"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={borrar}
              disabled={pendiente}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-critico px-4 text-sm font-medium text-sobre-critico shadow-sm transition-[filter] hover:brightness-110 disabled:opacity-50"
            >
              <Trash className="size-4" aria-hidden />
              {pendiente ? "Borrando…" : "Borrar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------------- Notas --------------------------------- */

function GuardarNotas() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} h-8 px-3`}>
      {pending ? "Guardando…" : "Guardar notas"}
    </button>
  );
}

export function NotasContacto({ id, notas }: { id: string; notas: string | null }) {
  const [texto, setTexto] = useState(notas ?? "");
  const [guardado, setGuardado] = useState(notas ?? "");
  const [estado, accion] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await guardarNotasContacto(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      setGuardado(String(fd.get("notas") ?? ""));
    } else toast.error(r.mensaje);
    return r;
  }, null);
  const cambiado = texto.trim() !== guardado.trim();

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="notas-contacto" className="sr-only">
        Notas internas
      </label>
      <textarea
        id="notas-contacto"
        name="notas"
        rows={5}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cómo prefiere que le contacten, qué le importa, con quién decide…"
        className={`${claseCampo} h-auto resize-y py-2 leading-relaxed`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-tinta-2" aria-live="polite">
          {cambiado ? "Cambios sin guardar" : estado?.ok ? "Guardado" : ""}
        </span>
        {cambiado && <GuardarNotas />}
      </div>
    </form>
  );
}

/* ----------------------------- Completar tarea ----------------------------- */

export function CasillaTarea({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [hecha, setHecha] = useState(false);
  return (
    <input
      type="checkbox"
      checked={hecha}
      disabled={pendiente}
      aria-label={`Completar «${titulo}»`}
      onChange={() => {
        setHecha(true);
        empezar(async () => {
          const r = await cambiarEstadoInteraccion(id, "completada");
          if (r.ok) {
            toast.success("Tarea completada.");
            router.refresh();
          } else {
            setHecha(false);
            toast.error(r.mensaje);
          }
        });
      }}
      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--acento)]"
    />
  );
}
