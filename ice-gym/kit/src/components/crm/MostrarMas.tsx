"use client";

import { useState, useSyncExternalStore } from "react";
import { numero } from "@/lib/formato";

/** Escritorio o móvil: así se pinta solo la tabla o solo las tarjetas, no las dos ocultando una. */
const CONSULTA_MD = "(min-width: 768px)";
export function useEscritorio() {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia(CONSULTA_MD);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => window.matchMedia(CONSULTA_MD).matches,
    () => true,
  );
}

/**
 * Pinta las listas largas por tramos: cientos de filas con iconos, enlaces y
 * menús disparan el DOM y hacen que la página tarde en responder.
 */
export function useTramos<T>(filas: T[], paso = 40) {
  const [limite, setLimite] = useState(paso);
  const visibles = filas.length > limite ? filas.slice(0, limite) : filas;
  const restantes = filas.length - visibles.length;
  const mas = restantes > 0 ? <BotonMas restantes={restantes} paso={paso} onClick={() => setLimite((l) => l + paso * 2)} /> : null;
  return { visibles, mas };
}

function BotonMas({ restantes, paso, onClick }: { restantes: number; paso: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto mt-3 inline-flex h-8 items-center rounded-md border border-linea bg-placa px-3 text-[0.8125rem] font-medium text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
    >
      Mostrar {numero(Math.min(restantes, paso * 2))} más
      <span className="ml-1.5 tabular-nums text-tinta-2/70">({numero(restantes)} restantes)</span>
    </button>
  );
}
