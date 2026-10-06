"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { tieneCabeceraPropia } from "@/components/crm/PaletaComandos";

/**
 * Barra superior del CRM (búsqueda global y «Crear»). En las pantallas que
 * traen su propia cabecera se oculta en escritorio para no dejar una franja vacía;
 * en móvil se mantiene porque lleva el título de la sección.
 */
export function CabeceraApp({ children }: { children: ReactNode }) {
  const propia = tieneCabeceraPropia(usePathname());
  return (
    <header className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 bg-fondo px-4 md:px-8 ${propia ? "md:hidden" : ""}`}>
      {children}
    </header>
  );
}
