/** Esqueletos de carga de empresas: misma retícula que la pantalla real. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-2xl bg-placa shadow-placa";

export function EsqueletoEmpresas() {
  return (
    <main className={`${pulso} px-4 lg:px-8`} aria-busy aria-label="Cargando empresas">
      <div className="flex items-end justify-between gap-4 pb-5 pt-6">
        <div className="flex flex-col gap-2">
          <span className="h-7 w-36 rounded-md bg-placa-2" />
          <span className="h-4 w-72 rounded bg-placa-2/70" />
        </div>
        <span className="h-8 w-36 rounded-lg bg-placa-2" />
      </div>
      <div className="mb-4 flex gap-1.5 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-8 w-24 shrink-0 rounded-full bg-placa-2" />
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="h-8 w-64 rounded-lg bg-placa-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
        <span className="ml-auto h-8 w-40 rounded-lg bg-placa-2" />
      </div>
      <div className={`${bloque} overflow-hidden`}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <span className="size-9 rounded-md bg-placa-2" />
            <span className="flex w-48 flex-col gap-1.5">
              <span className="h-3.5 w-32 rounded bg-placa-2" />
              <span className="h-3 w-24 rounded bg-placa-2/70" />
            </span>
            <span className="h-5 w-20 rounded-md bg-placa-2" />
            <span className="hidden h-3.5 w-24 rounded bg-placa-2 md:block" />
            <span className="hidden h-3.5 w-36 rounded bg-placa-2 lg:block" />
            <span className="ml-auto h-3.5 w-20 rounded bg-placa-2" />
            <span className="h-3.5 w-16 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFichaEmpresa() {
  return (
    <main className={`${pulso} px-4 pb-12 pt-5 lg:px-8`} aria-busy aria-label="Cargando empresa">
      <span className="block h-4 w-24 rounded bg-placa-2/70" />
      <div className="mt-4 flex flex-wrap items-center gap-4 pb-1">
        <span className="size-14 rounded-md bg-placa-2" />
        <span className="flex flex-col gap-2">
          <span className="h-7 w-56 rounded-md bg-placa-2" />
          <span className="flex gap-1.5">
            <span className="h-5 w-16 rounded-md bg-placa-2" />
            <span className="h-5 w-16 rounded-md bg-placa-2" />
            <span className="h-5 w-24 rounded-md bg-placa-2" />
          </span>
        </span>
        <span className="ml-auto flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-8 w-28 rounded-md bg-placa-2" />
          ))}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${bloque} h-[4.5rem]`} />
        ))}
      </div>
      <div className="mt-6 flex gap-4 pb-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-5 w-20 rounded bg-placa-2" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${bloque} h-96`} />
        <div className={`${bloque} h-64`} />
      </div>
    </main>
  );
}
