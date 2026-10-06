"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
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
import { crearEmpresa, type Resultado } from "@/app/crm/acciones/b2b";
import { ruta } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { claseBotonPrincipal, claseError } from "@/components/crm/Primitivas";
import { CamposEmpresa } from "./CamposEmpresa";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBotonPrincipal}>
      {pending ? "Creando…" : "Crear empresa"}
    </button>
  );
}

function Formulario({ catalogos, alCrear }: { catalogos: Catalogos; alCrear: () => void }) {
  const router = useRouter();
  const [estado, accion] = useActionState<Resultado | null, FormData>(crearEmpresa, null);

  const tratado = useRef<Resultado | null>(null);

  useEffect(() => {
    if (!estado?.ok || !estado.id || tratado.current === estado) return;
    tratado.current = estado;
    const url = ruta.empresa(estado.id);
    toast.success(estado.mensaje, { action: { label: "Abrir ficha", onClick: () => router.push(url) } });
    alCrear();
    router.push(url);
  }, [estado, router, alCrear]);

  return (
    <form action={accion} className="flex min-h-0 flex-col">
      <div className="max-h-[65dvh] overflow-y-auto px-1 pb-2">
        <CamposEmpresa equipo={catalogos.equipo} />
      </div>
      {estado?.ok === false && (
        <p role="alert" className={`${claseError} mt-3`}>
          {estado.mensaje}
        </p>
      )}
      <div className="mt-5 flex items-center justify-end gap-2">
        <Enviar />
      </div>
    </form>
  );
}

/** Alta de empresa: diálogo con el formulario completo; al crear, lleva a la ficha. */
export function NuevaEmpresa({ catalogos, children }: { catalogos: Catalogos; children?: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setVez((n) => n + 1); // formulario limpio en cada apertura
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
            <Plus className="size-4" weight="bold" aria-hidden />
            Nueva empresa
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="gap-5 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva empresa</DialogTitle>
          <DialogDescription>Cliente, proveedor, partner… Después podrás añadir contactos y oportunidades.</DialogDescription>
        </DialogHeader>
        <Formulario key={vez} catalogos={catalogos} alCrear={() => setAbierto(false)} />
      </DialogContent>
    </Dialog>
  );
}
