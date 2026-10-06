"use client";

import { useActionState, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cambiarActivoMiembro, guardarMiembro } from "@/app/crm/acciones/configuracion";
import type { Resultado } from "@/app/crm/acciones/b2b";
import { COLORES_EQUIPO, nombreCompleto, tonoColor, type ColorEquipo, type Miembro } from "@/lib/b2b";
import { Avatar } from "@/components/crm/b2b/Piezas";
import { SinDatos, claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";

const NOMBRE_COLOR: Record<ColorEquipo, string> = {
  azul: "Azul",
  violeta: "Violeta",
  ambar: "Ámbar",
  rosa: "Rosa",
  verde: "Verde",
  gris: "Gris",
};

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-tinta">{etiqueta}</span>
      {children}
    </label>
  );
}

function FormularioMiembro({ miembro, alTerminar }: { miembro: Miembro | null; alTerminar: () => void }) {
  const router = useRouter();
  const [color, setColor] = useState<ColorEquipo>(miembro?.color ?? "azul");
  const [nombre, setNombre] = useState(miembro?.nombre ?? "");
  const [apellidos, setApellidos] = useState(miembro?.apellidos ?? "");
  const [estado, accion, enviando] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await guardarMiembro(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      alTerminar();
      router.refresh();
    }
    return r;
  }, null);

  return (
    <form action={accion} className="flex flex-col gap-4">
      {miembro && <input type="hidden" name="id" value={miembro.id} />}
      <div className="flex items-center gap-3 rounded-xl bg-placa-2 p-3">
        <Avatar nombre={nombre || "?"} apellidos={apellidos} tono={tonoColor(color)} tamano="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-tinta">{nombreCompleto({ nombre: nombre || "Nuevo miembro", apellidos })}</p>
          <p className="text-xs text-tinta-2">Así aparecerá como responsable</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre">
          <input name="nombre" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Apellidos">
          <input name="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} autoComplete="off" className={claseCampo} />
        </Campo>
      </div>
      <Campo etiqueta="Email (el mismo con el que entra al CRM)">
        <input name="email" type="email" required defaultValue={miembro?.email ?? ""} autoComplete="off" className={claseCampo} />
      </Campo>
      <Campo etiqueta="Puesto">
        <input name="puesto" defaultValue={miembro?.puesto ?? ""} placeholder="Comercial, Compras, Dirección…" className={claseCampo} />
      </Campo>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-tinta">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORES_EQUIPO.map((c) => (
            <label key={c} className="cursor-pointer" title={NOMBRE_COLOR[c]}>
              <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
              <span className="sr-only">{NOMBRE_COLOR[c]}</span>
              <span
                className="block size-7 rounded-full ring-offset-2 ring-offset-placa transition-shadow peer-checked:ring-2 peer-checked:ring-tinta peer-focus-visible:ring-2 peer-focus-visible:ring-acento"
                style={{ background: tonoColor(c) }}
                aria-hidden
              />
            </label>
          ))}
        </div>
      </fieldset>
      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={alTerminar}
          className="inline-flex h-9 items-center rounded-md bg-placa-2 px-4 text-sm font-medium text-tinta transition-colors hover:bg-linea"
        >
          Cancelar
        </button>
        <button type="submit" disabled={enviando} className={claseBotonPrincipal}>
          {enviando ? "Guardando…" : miembro ? "Guardar cambios" : "Añadir"}
        </button>
      </div>
    </form>
  );
}

/** Equipo comercial: alta, edición, color y activar/desactivar. */
export function GestionEquipo({ equipo, emailActual }: { equipo: Miembro[]; emailActual: string | null }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Miembro | null | "nuevo">(null);
  const [vez, setVez] = useState(0);
  const [lista, cambiarLocal] = useOptimistic(equipo, (l, c: { id: string; activo: boolean }) =>
    l.map((m) => (m.id === c.id ? { ...m, activo: c.activo } : m))
  );
  const [, empezar] = useTransition();

  function alternar(m: Miembro, activo: boolean) {
    empezar(async () => {
      cambiarLocal({ id: m.id, activo });
      const r = await cambiarActivoMiembro(m.id, activo);
      if (r.ok) toast.success(`${m.nombre}: ${activo ? "activo" : "inactivo"}.`);
      else toast.error(r.mensaje);
      router.refresh();
    });
  }

  function abrir(m: Miembro | "nuevo") {
    setVez((n) => n + 1);
    setEditando(m);
  }

  const activos = lista.filter((m) => m.activo).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-2">
          <span className="font-medium tabular-nums text-tinta">{activos}</span> activos de {lista.length}. Los inactivos no aparecen al asignar
          responsables, pero conservan su historial.
        </p>
        <button type="button" onClick={() => abrir("nuevo")} className={`${claseBotonPrincipal} h-8 px-3`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Añadir miembro
        </button>
      </div>

      {lista.length === 0 ? (
        <SinDatos
          titulo="Aún no hay equipo"
          texto="Añade a las personas que llevan empresas, oportunidades y tareas. Usa el mismo email con el que entran al CRM para que funcione «Mis tareas»."
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-placa shadow-placa">
          {lista.map((m) => {
            const yo = !!emailActual && m.email.toLowerCase() === emailActual.toLowerCase();
            return (
              <li key={m.id} className={`flex items-center gap-3 border-b border-linea/70 px-4 py-3 last:border-0 ${m.activo ? "" : "opacity-60"}`}>
                <Avatar nombre={m.nombre} apellidos={m.apellidos} tono={tonoColor(m.color)} tamano="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-tinta">
                    {nombreCompleto(m)}
                    {yo && <span className="rounded bg-placa-2 px-1.5 text-[0.6875rem] font-medium text-tinta-2">Tú</span>}
                  </p>
                  <p className="truncate text-[0.8125rem] text-tinta-2">
                    {[m.puesto, m.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-[0.8125rem] text-tinta-2">
                  <span className="hidden sm:inline">{m.activo ? "Activo" : "Inactivo"}</span>
                  <Switch checked={m.activo} onCheckedChange={(v) => alternar(m, v)} aria-label={`${m.activo ? "Desactivar" : "Activar"} a ${m.nombre}`} />
                </label>
                <button
                  type="button"
                  onClick={() => abrir(m)}
                  aria-label={`Editar a ${m.nombre}`}
                  className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
                >
                  <PencilSimple className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="bg-placa p-5 text-tinta shadow-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-tinta">{editando === "nuevo" ? "Añadir al equipo" : "Editar miembro"}</DialogTitle>
            <DialogDescription className="text-tinta-2">Personas que pueden llevar cuentas, oportunidades y tareas.</DialogDescription>
          </DialogHeader>
          {editando !== null && (
            <FormularioMiembro key={vez} miembro={editando === "nuevo" ? null : editando} alTerminar={() => setEditando(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
