"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { MARCA } from "@/marca";

/** Observa el atributo data-tema de <html>, que es la fuente de verdad del tema. */
function suscribir(aviso: () => void) {
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
  return () => observador.disconnect();
}
const esClaro = () => document.documentElement.getAttribute("data-tema") === "claro";

export function useTema() {
  const claro = useSyncExternalStore(suscribir, esClaro, () => false);
  function alternar() {
    const siguiente = claro ? "oscuro" : "claro";
    document.documentElement.setAttribute("data-tema", siguiente);
    try {
      localStorage.setItem(MARCA.claveTema, siguiente);
    } catch {
      // Sin almacenamiento: vale para esta visita.
    }
  }
  return { claro, alternar };
}

/**
 * El CRM es oscuro por defecto; este botón alterna a claro y lo recuerda en
 * este navegador. Comparte la preferencia (MARCA.claveTema) con la web pública.
 */
export function InterruptorTema() {
  const { claro, alternar } = useTema();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={claro ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      title={claro ? "Tema oscuro" : "Tema claro"}
      className="grid size-8 place-items-center rounded-md text-tinta-2 transition-colors hover:bg-placa-2 hover:text-tinta"
    >
      {claro ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
    </button>
  );
}

/**
 * Fila del pie del menú lateral: «Modo oscuro» con un interruptor.
 * Plegado, se queda sólo el icono.
 */
export function FilaTema({ plegado = false }: { plegado?: boolean }) {
  const { claro, alternar } = useTema();
  const oscuro = !claro;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      onClick={alternar}
      aria-label="Modo oscuro"
      title={plegado ? (oscuro ? "Modo oscuro: activado" : "Modo oscuro: desactivado") : undefined}
      className="group flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-tinta-2 transition-colors duration-150 hover:bg-placa-2 hover:text-tinta"
    >
      {/* El aspecto lo decide el atributo data-tema por CSS: así el primer
          pintado del servidor ya sale bien, sin parpadeo al hidratar. */}
      <span className="grid size-5 shrink-0 place-items-center">
        <Moon className="size-[18px] [:root[data-tema=claro]_&]:hidden" aria-hidden />
        <Sun className="hidden size-[18px] [:root[data-tema=claro]_&]:block" aria-hidden />
      </span>
      <span className="etiqueta-menu flex-1 truncate text-left">Modo oscuro</span>
      <span
        aria-hidden
        className="etiqueta-menu relative h-5 w-9 shrink-0 rounded-full bg-acento transition-colors duration-200 [:root[data-tema=claro]_&]:bg-linea"
      >
        <span className="absolute top-0.5 left-0.5 size-4 translate-x-4 rounded-full bg-sobre-campo shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [:root[data-tema=claro]_&]:translate-x-0 [:root[data-tema=claro]_&]:bg-placa" />
      </span>
    </button>
  );
}
