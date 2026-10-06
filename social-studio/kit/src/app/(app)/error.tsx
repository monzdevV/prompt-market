"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-bad-soft text-bad">
        <TriangleAlert size={18} aria-hidden />
      </div>
      <h1 className="font-semibold">Algo ha fallado al cargar esta página</h1>
      <p className="text-sm text-muted">
        Vuelve a intentarlo. Si se repite, avísanos
        {error.digest ? (
          <>
            {" "}
            con este código: <code className="font-mono">{error.digest}</code>
          </>
        ) : null}
        .
      </p>
      <button onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </div>
  );
}
