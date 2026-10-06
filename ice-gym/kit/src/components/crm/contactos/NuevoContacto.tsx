"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { claseBotonPrincipal } from "@/components/crm/Primitivas";
import { crearContacto, type Resultado } from "@/app/crm/acciones/b2b";
import { ruta } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { CamposContacto } from "./FormularioContacto";

/** Alta de contacto en un Dialog. `children` sustituye al botón por defecto. */
export function NuevoContacto({
  catalogos,
  empresaId,
  children,
}: {
  catalogos: Catalogos;
  empresaId?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0); // reinicia el formulario en cada apertura

  const [estado, accion] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await crearContacto(prev, fd);
    if (r.ok) {
      const id = r.id;
      toast.success(r.mensaje, id ? { action: { label: "Ver ficha", onClick: () => router.push(ruta.contacto(id)) } } : undefined);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

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
            Nuevo contacto
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="px-5 pb-1 pt-5">
          <DialogTitle>Nuevo contacto</DialogTitle>
          <DialogDescription>Una persona de una empresa cliente, proveedora o partner.</DialogDescription>
        </DialogHeader>
        <form action={accion} className="px-5 py-4">
          <CamposContacto
            key={vez}
            catalogos={catalogos}
            empresaId={empresaId}
            estado={estado}
            textoEnviar="Crear contacto"
            textoPendiente="Creando…"
            onCancelar={() => setAbierto(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
