/** Esqueleto del pipeline: cabecera con totales, pestañas, filtros y columnas del Kanban. */

const pulso = "animate-pulse motion-reduce:animate-none";

export default function Cargando() {
  return (
    <main className={`${pulso} flex flex-col px-4 pb-4 md:h-dvh md:overflow-hidden md:px-8 md:pt-5`} aria-busy aria-label="Cargando oportunidades">
      <div className="flex items-end justify-between gap-4 pb-5 pt-6">
        <div className="flex flex-col gap-2">
          <span className="h-7 w-44 rounded-md bg-placa-2" />
          <span className="h-4 w-80 max-w-full rounded bg-placa-2/70" />
        </div>
        <span className="h-8 w-40 rounded-md bg-placa-2" />
      </div>
      <div className="-mx-4 mb-4 flex gap-3 border-b border-linea px-4 pb-2.5 lg:-mx-8 lg:px-8">
        <span className="h-5 w-28 rounded bg-placa-2" />
        <span className="h-5 w-24 rounded bg-placa-2" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="h-8 w-60 rounded-lg bg-placa-2" />
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-8 w-28 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className="-mx-4 flex min-h-0 flex-1 gap-3 overflow-hidden px-4 lg:-mx-8 lg:px-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-[288px] shrink-0 flex-col gap-2 rounded-xl border border-linea bg-placa-2/40 p-2">
            <div className="flex items-center gap-2 px-1 py-1.5">
              <span className="size-2 rounded-full bg-placa-2" />
              <span className="h-4 w-24 rounded bg-placa-2" />
              <span className="ml-auto h-4 w-16 rounded bg-placa-2" />
            </div>
            {Array.from({ length: 3 - (i % 3) }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2 rounded-lg border border-linea bg-placa p-3">
                <span className="h-4 w-4/5 rounded bg-placa-2" />
                <span className="h-3.5 w-1/2 rounded bg-placa-2/70" />
                <span className="h-5 w-24 rounded-md bg-placa-2" />
                <div className="flex justify-between">
                  <span className="h-4 w-16 rounded bg-placa-2" />
                  <span className="h-4 w-12 rounded bg-placa-2" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
