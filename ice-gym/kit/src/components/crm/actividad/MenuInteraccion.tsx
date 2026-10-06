"use client";

import { useState } from "react";
import { ArrowCounterClockwise, Check, DotsThree, Prohibit, Trash } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EstadoInteraccion, InteraccionCompleta } from "@/lib/b2b";

/** Menú «…» de una actividad o tarea: completar/reabrir, cancelar y borrar (con confirmación). */
export function MenuInteraccion({
  item,
  onEstado,
  onBorrar,
}: {
  item: Pick<InteraccionCompleta, "id" | "titulo" | "estado" | "tipo">;
  onEstado: (estado: EstadoInteraccion) => void;
  onBorrar: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const sistema = item.tipo === "cambio_etapa";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de «${item.titulo}»`}
            className="grid size-7 shrink-0 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento data-[state=open]:bg-placa-2 data-[state=open]:text-tinta"
          >
            <DotsThree className="size-5" weight="bold" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {!sistema && item.estado !== "completada" && (
            <DropdownMenuItem onSelect={() => onEstado("completada")}>
              <Check className="size-4" aria-hidden />
              Marcar completada
            </DropdownMenuItem>
          )}
          {!sistema && item.estado !== "pendiente" && (
            <DropdownMenuItem onSelect={() => onEstado("pendiente")}>
              <ArrowCounterClockwise className="size-4" aria-hidden />
              Reabrir
            </DropdownMenuItem>
          )}
          {!sistema && item.estado !== "cancelada" && (
            <DropdownMenuItem onSelect={() => onEstado("cancelada")}>
              <Prohibit className="size-4" aria-hidden />
              Cancelar
            </DropdownMenuItem>
          )}
          {!sistema && <DropdownMenuSeparator />}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmar(true)}>
            <Trash className="size-4" aria-hidden />
            Borrar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="bg-placa text-tinta shadow-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Borrar «{item.titulo}»?</DialogTitle>
            <DialogDescription className="text-tinta-2">
              Desaparece de la línea temporal de la empresa, el contacto y la oportunidad. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className="inline-flex h-9 items-center justify-center rounded-md bg-placa-2 px-4 text-sm font-medium text-tinta transition-colors hover:bg-linea"
            >
              Mantener
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setConfirmar(false);
                onBorrar();
              }}
              className="inline-flex h-9 items-center justify-center rounded-md bg-critico px-4 text-sm font-medium text-sobre-critico transition-[filter] hover:brightness-110"
            >
              Borrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
