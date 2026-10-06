"use client";

import { useEffect } from "react";

/**
 * Pone las clases del CRM también en <body>. Los diálogos, menús y tooltips se
 * pintan en un portal fuera del árbol del CRM; así heredan su tema y su fuente.
 */
export function ClaseCuerpo({ clases }: { clases: string }) {
  useEffect(() => {
    const lista = clases.split(/\s+/).filter(Boolean);
    document.body.classList.add(...lista);
    return () => document.body.classList.remove(...lista);
  }, [clases]);
  return null;
}
