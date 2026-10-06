"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { borrarInteraccion, cambiarEstadoInteraccion } from "@/app/crm/acciones/b2b";
import type { EstadoInteraccion, InteraccionCompleta } from "@/lib/b2b";

type Cambio = { id: string; estado: EstadoInteraccion } | { id: string; borrar: true };

function aplicar(lista: InteraccionCompleta[], c: Cambio) {
  if ("borrar" in c) return lista.filter((i) => i.id !== c.id);
  return lista.map((i) =>
    i.id === c.id
      ? { ...i, estado: c.estado, completada_at: c.estado === "completada" ? new Date().toISOString() : null }
      : i
  );
}

/**
 * Lista con actualización optimista: marcar, reabrir, cancelar o borrar se ve
 * al instante; si el servidor falla, vuelve atrás y avisa.
 */
export function useInteracciones(items: InteraccionCompleta[]) {
  const router = useRouter();
  const [lista, cambiarLocal] = useOptimistic(items, aplicar);
  const [pendiente, empezar] = useTransition();

  function cambiarEstado(id: string, estado: EstadoInteraccion) {
    empezar(async () => {
      cambiarLocal({ id, estado });
      const r = await cambiarEstadoInteraccion(id, estado);
      if (!r.ok) toast.error(r.mensaje);
      else if (estado === "completada") toast.success(r.mensaje);
      router.refresh();
    });
  }

  function borrar(id: string, titulo?: string) {
    empezar(async () => {
      cambiarLocal({ id, borrar: true });
      const r = await borrarInteraccion(id);
      if (!r.ok) toast.error(r.mensaje);
      else toast.success(titulo ? `«${titulo}» borrada.` : r.mensaje);
      router.refresh();
    });
  }

  return { lista, cambiarEstado, borrar, pendiente };
}
