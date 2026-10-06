"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { PencilSimple, Star, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { crearInteraccion, type Resultado } from "@/app/crm/acciones/b2b";
import { actualizarEmpresa, borrarEmpresa, guardarNotasEmpresa, marcarContactoPrincipal } from "@/app/crm/acciones/empresas";
import { ruta, type Empresa, type Miembro } from "@/lib/b2b";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { CamposEmpresa } from "./CamposEmpresa";

export const claseBotonSecundario =
  "inline-flex h-8 items-center gap-1.5 rounded-md bg-placa px-3 text-[0.8125rem] font-medium text-tinta shadow-placa transition-colors hover:bg-placa-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:opacity-50";

function Enviar({ texto, enviando, className = "" }: { texto: string; enviando: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${claseBotonPrincipal} ${className}`}>
      {pending ? enviando : texto}
    </button>
  );
}

/** Ejecuta `alHacerlo` una sola vez por cada resultado correcto de una acción. */
function useAlAcertar(estado: Resultado | null, alHacerlo: (r: Resultado) => void) {
  const tratado = useRef<Resultado | null>(null);
  const fn = useRef(alHacerlo);
  useEffect(() => {
    fn.current = alHacerlo;
  });
  useEffect(() => {
    if (!estado?.ok || tratado.current === estado) return;
    tratado.current = estado;
    fn.current(estado);
  }, [estado]);
}

/* ------------------------------- Editar ------------------------------- */

function FormularioEditar({ empresa, equipo, alGuardar }: { empresa: Empresa; equipo: Miembro[]; alGuardar: () => void }) {
  const router = useRouter();
  const [estado, accion] = useActionState<Resultado | null, FormData>(actualizarEmpresa, null);
  useAlAcertar(estado, (r) => {
    toast.success(r.mensaje);
    alGuardar();
    router.refresh();
  });

  return (
    <form action={accion} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={empresa.id} />
      <div className="flex-1 overflow-y-auto p-4">
        <CamposEmpresa equipo={equipo} empresa={empresa} conLogo />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {estado?.ok === false && (
          <p role="alert" className={claseError}>
            {estado.mensaje}
          </p>
        )}
        <Enviar texto="Guardar cambios" enviando="Guardando…" className="w-full" />
      </div>
    </form>
  );
}

export function EditarEmpresa({ empresa, equipo }: { empresa: Empresa; equipo: Miembro[] }) {
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  return (
    <Sheet
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setVez((n) => n + 1);
      }}
    >
      <SheetTrigger asChild>
        <button type="button" className={claseBotonSecundario}>
          <PencilSimple className="size-4" aria-hidden /> Editar
        </button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar empresa</SheetTitle>
          <SheetDescription>{empresa.nombre}</SheetDescription>
        </SheetHeader>
        <FormularioEditar key={vez} empresa={empresa} equipo={equipo} alGuardar={() => setAbierto(false)} />
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------- Borrar ------------------------------- */

export function BorrarEmpresa({
  id,
  nombre,
  nContactos,
  nOportunidades,
}: {
  id: string;
  nombre: string;
  nContactos: number;
  nOportunidades: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, empezar] = useTransition();

  function borrar() {
    empezar(async () => {
      const r = await borrarEmpresa(id);
      if (r.ok) {
        toast.success(`${nombre} borrada.`);
        setAbierto(false);
        router.push(ruta.empresas);
      } else toast.error(r.mensaje);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Borrar empresa" title="Borrar empresa" className={`${claseBotonSecundario} px-2 text-critico`}>
          <Trash className="size-4" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Borrar {nombre}?</DialogTitle>
          <DialogDescription>
            Se borrará la empresa y su historial de actividad. Sus {nContactos} contacto{nContactos === 1 ? "" : "s"} y{" "}
            {nOportunidades} oportunidad{nOportunidades === 1 ? "" : "es"} se conservan, pero sin empresa. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={() => setAbierto(false)} className={claseBotonSecundario}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={borrar}
            disabled={pendiente}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-critico px-3 text-[0.8125rem] font-medium text-sobre-critico transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            <Trash className="size-4" aria-hidden />
            {pendiente ? "Borrando…" : "Borrar empresa"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Pestañas ------------------------------- */

export type Panel = { id: string; texto: string; n?: number; contenido: ReactNode };

/** Pestañas de la ficha. La activa vive en ?tab= sin recargar datos (todo llega ya pintado). */
export function PestanasEmpresa({ inicial, paneles }: { inicial: string; paneles: Panel[] }) {
  const [tab, setTab] = useState(paneles.some((p) => p.id === inicial) ? inicial : paneles[0].id);

  function cambiar(v: string) {
    setTab(v);
    const url = new URL(window.location.href);
    if (v === paneles[0].id) url.searchParams.delete("tab");
    else url.searchParams.set("tab", v);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs value={tab} onValueChange={cambiar} className="mt-6 gap-5">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:-mx-8 lg:px-8">
        <TabsList variant="line" className="h-10 gap-2 p-0">
          {paneles.map((p) => (
            <TabsTrigger
              key={p.id}
              value={p.id}
              className="h-10 flex-none px-2 text-tinta-2 data-active:text-tinta group-data-horizontal/tabs:after:bottom-[-1px]"
            >
              {p.texto}
              {p.n != null && (
                <span className="rounded-full bg-placa-2 px-1.5 text-xs font-medium tabular-nums text-tinta-2">{p.n}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {paneles.map((p) => (
        <TabsContent key={p.id} value={p.id}>
          {p.contenido}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* ------------------------------- Contactos ------------------------------- */

export function BotonPrincipal({ empresaId, contactoId, nombre }: { empresaId: string; contactoId: string; nombre: string }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        empezar(async () => {
          const r = await marcarContactoPrincipal(empresaId, contactoId);
          if (r.ok) {
            toast.success(`${nombre} es ahora el contacto principal.`);
            router.refresh();
          } else toast.error(r.mensaje);
        })
      }
      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta disabled:opacity-50"
    >
      <Star className="size-3.5" aria-hidden />
      {pendiente ? "Guardando…" : "Hacer principal"}
    </button>
  );
}

/* --------------------------------- Notas --------------------------------- */

export function NotasEmpresa({ id, notas }: { id: string; notas: string | null }) {
  const router = useRouter();
  const [estado, accion] = useActionState<Resultado | null, FormData>(guardarNotasEmpresa, null);
  const [texto, setTexto] = useState(notas ?? "");
  const cambiado = texto !== (notas ?? "");
  useAlAcertar(estado, (r) => {
    toast.success(r.mensaje);
    router.refresh();
  });

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor="notas-empresa">
        Notas generales
      </label>
      <textarea
        id="notas-empresa"
        name="notas"
        rows={10}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Condiciones pactadas, cómo prefieren trabajar, a quién escalar, historial de precios…"
        className={`${claseCampo} h-auto min-h-48 py-2 leading-relaxed`}
      />
      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {cambiado && <span className="text-xs text-tinta-2">Cambios sin guardar</span>}
        <Enviar texto="Guardar notas" enviando="Guardando…" className="h-8 px-3" />
      </div>
    </form>
  );
}

/** Nota rápida: se guarda como interacción de tipo «nota» en el historial de la empresa. */
export function NotaRapida({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [estado, accion] = useActionState<Resultado | null, FormData>(crearInteraccion, null);
  const [texto, setTexto] = useState("");
  const primera = texto.trim().split("\n")[0].slice(0, 90);
  useAlAcertar(estado, () => {
    toast.success("Nota añadida.");
    setTexto("");
    router.refresh();
  });

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="tipo" value="nota" />
      <input type="hidden" name="empresa_id" value={empresaId} />
      <input type="hidden" name="titulo" value={primera.length >= 2 ? primera : "Nota"} />
      <input type="hidden" name="descripcion" value={texto.includes("\n") || texto.length > 90 ? texto.trim() : ""} />
      <label className="sr-only" htmlFor="nota-rapida">
        Nota rápida
      </label>
      <textarea
        id="nota-rapida"
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && texto.trim()) e.currentTarget.form?.requestSubmit();
        }}
        placeholder="Escribe una nota rápida… (Ctrl + Enter para guardar)"
        className={`${claseCampo} h-auto py-2`}
      />
      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}
      <div className="flex justify-end">
        <SubmitNota vacio={texto.trim().length === 0} />
      </div>
    </form>
  );
}

function SubmitNota({ vacio }: { vacio: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || vacio} className={`${claseBotonPrincipal} h-8 px-3`}>
      {pending ? "Guardando…" : "Añadir nota"}
    </button>
  );
}
