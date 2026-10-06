"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { crearOportunidad, type Resultado } from "@/app/crm/acciones/b2b";
import { ruta } from "@/lib/b2b";
import type { Catalogos } from "@/lib/datos/b2b";
import { claseBotonPrincipal, claseError } from "@/components/crm/Primitivas";
import { CamposOportunidad } from "./CamposOportunidad";

/** Evento global para abrir el alta (paleta de comandos, atajos). */
export const EVENTO_NUEVA_OPORTUNIDAD = "crm:nueva-oportunidad";

/**
 * Alta de oportunidad en un diálogo. Permite crear empresa y contacto en línea.
 * `children` es el disparador opcional; sin él, pinta el botón principal.
 * Con `?nueva=1` en la URL se abre sola.
 */
export function NuevaOportunidad({
  catalogos,
  empresaId,
  contactoId,
  children,
}: {
  catalogos: Catalogos;
  empresaId?: string;
  contactoId?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [abierto, setAbierto] = useState(() => params.get("nueva") === "1");
  // Cada apertura monta un formulario limpio.
  const [vez, setVez] = useState(0);

  const [estado, accion, pendiente] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await crearOportunidad(prev, fd);
    if (r.ok) {
      const id = r.id;
      toast.success(r.mensaje, id ? { action: { label: "Abrir ficha", onClick: () => router.push(ruta.oportunidad(id)) } } : undefined);
      cambiar(false);
      router.refresh();
    }
    return r;
  }, null);

  useEffect(() => {
    const abrir = () => {
      setVez((v) => v + 1);
      setAbierto(true);
    };
    window.addEventListener(EVENTO_NUEVA_OPORTUNIDAD, abrir);
    return () => window.removeEventListener(EVENTO_NUEVA_OPORTUNIDAD, abrir);
  }, []);

  function abrirDialogo() {
    setVez((v) => v + 1);
    setAbierto(true);
  }

  function cambiar(v: boolean) {
    if (v) abrirDialogo();
    else setAbierto(false);
    if (!v && params.get("nueva")) {
      const p = new URLSearchParams(params.toString());
      p.delete("nueva");
      router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={cambiar}>
      <DialogTrigger asChild>
        {children ?? (
          <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
            <Plus className="size-4" weight="bold" aria-hidden />
            Nueva oportunidad
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-linea px-5 py-4 pr-12">
          <DialogTitle className="text-base">Nueva oportunidad</DialogTitle>
          <DialogDescription>
            Venta, compra a proveedor, colaboración… Si la empresa o el contacto no existen, créalos aquí mismo.
          </DialogDescription>
        </DialogHeader>
        <form key={vez} action={accion} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <CamposOportunidad catalogos={catalogos} empresaId={empresaId} contactoId={contactoId} />
          </div>
          <div className="flex flex-col gap-3 border-t border-linea px-5 py-3">
            {estado?.ok === false && (
              <p role="alert" className={claseError}>
                {estado.mensaje}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => cambiar(false)}
                className="h-9 rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2"
              >
                Cancelar
              </button>
              <button type="submit" disabled={pendiente} className={claseBotonPrincipal}>
                {pendiente ? "Creando…" : "Crear oportunidad"}
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
