"use client";

import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";

/** Si una consulta falla, se dice claramente en vez de pintar ceros falsos. */
export default function ErrorCrm({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[60dvh] place-items-center px-4">
      <div className="flex max-w-md flex-col items-start gap-3 rounded-xl border border-linea bg-placa p-6">
        <WarningCircle className="size-7 text-critico" aria-hidden />
        <h1 className="text-lg font-semibold text-tinta">No se pudieron cargar los datos</h1>
        <p className="text-sm leading-relaxed text-tinta-2">
          {error.message || "Algo ha fallado al hablar con la base de datos."} Comprueba la conexión y vuelve a intentarlo.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-1 inline-flex h-9 items-center rounded-md bg-acento px-4 text-sm font-medium text-sobre-campo"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
