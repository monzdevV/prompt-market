"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filtros en la URL: un cambio vacío borra el parámetro. Devuelve también si está cargando. */
export function useParametros() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendiente, empezar] = useTransition();

  const cambiar = useCallback(
    (c: Record<string, string | null | undefined>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(c)) {
        if (!v) p.delete(k);
        else p.set(k, v);
      }
      empezar(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
    },
    [params, pathname, router]
  );

  return { params, cambiar, pendiente };
}
