/** Esqueletos de carga de contactos, con la misma retícula que las pantallas reales. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-2xl bg-placa shadow-placa";

export function EsqueletoContactos() {
  return (
    <main className={`${pulso} px-4 lg:px-8`} aria-busy="true" aria-label="Cargando contactos">
      <div className="flex items-end justify-between gap-4 pb-5 pt-6">
        <div className="flex flex-col gap-2">
          <span className="h-7 w-36 rounded-md bg-placa-2" />
          <span className="h-4 w-80 max-w-full rounded bg-placa-2/70" />
        </div>
        <span className="h-8 w-36 rounded-lg bg-placa-2" />
      </div>
      <div className="mb-4 flex gap-3 pb-2.5">
        <span className="h-5 w-16 rounded bg-placa-2" />
        <span className="h-5 w-20 rounded bg-placa-2" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="h-8 w-64 rounded-lg bg-placa-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className={`${bloque} overflow-hidden`}>
        <div className="h-10" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <span className="size-9 shrink-0 rounded-full bg-placa-2" />
            <span className="flex w-48 flex-col gap-1.5">
              <span className="h-3.5 w-32 rounded bg-placa-2" />
              <span className="h-3 w-24 rounded bg-placa-2/70" />
            </span>
            <span className="hidden h-4 w-32 rounded bg-placa-2 md:block" />
            <span className="hidden h-4 w-40 rounded bg-placa-2/70 lg:block" />
            <span className="hidden h-5 w-20 rounded-md bg-placa-2 lg:block" />
            <span className="ml-auto h-3.5 w-16 rounded bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}

export function EsqueletoFichaContacto() {
  return (
    <main className={`${pulso} px-4 pb-12 pt-5 lg:px-8`} aria-busy="true" aria-label="Cargando contacto">
      <span className="block h-4 w-24 rounded bg-placa-2/70" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-4">
          <span className="size-16 rounded-full bg-placa-2" />
          <span className="flex flex-col gap-2">
            <span className="h-7 w-56 rounded-md bg-placa-2" />
            <span className="h-4 w-44 rounded bg-placa-2/70" />
            <span className="flex gap-1.5">
              <span className="h-5 w-16 rounded-md bg-placa-2" />
              <span className="h-5 w-14 rounded-md bg-placa-2" />
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="h-8 w-28 rounded-md bg-placa-2" />
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-56`} />
          <div className={`${bloque} h-96`} />
        </div>
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-80`} />
          <div className={`${bloque} h-56`} />
        </div>
      </div>
    </main>
  );
}
