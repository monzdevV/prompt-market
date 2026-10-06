/** Esqueletos de carga de actividades, tareas y configuración (misma retícula que la pantalla real). */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-2xl bg-placa shadow-placa";

function Cabecera({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-5 pt-6">
      <div className="flex flex-col gap-2">
        <span className="h-7 w-44 rounded-md bg-placa-2" />
        <span className="h-4 w-72 max-w-full rounded bg-placa-2/70" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: acciones }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
      </div>
    </div>
  );
}

function Filas({ n = 6 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex gap-3 pb-5">
          <span className="size-8 shrink-0 rounded-full bg-placa-2" />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className="h-3.5 w-2/5 rounded bg-placa-2" />
            <span className="h-3 w-3/5 rounded bg-placa-2/70" />
            <span className="h-3 w-40 rounded bg-placa-2/70" />
          </span>
          <span className="h-3 w-10 rounded bg-placa-2/70" />
        </div>
      ))}
    </>
  );
}

export function EsqueletoActividades() {
  return (
    <main className={`${pulso} flex flex-col gap-5 px-4 lg:px-8`} aria-busy aria-label="Cargando actividades">
      <Cabecera acciones={2} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${bloque} h-[6.5rem]`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className="h-8 w-32 rounded-lg bg-placa-2" />
        ))}
      </div>
      <div className={`${bloque} p-4`}>
        <span className="mb-4 block h-4 w-32 rounded bg-placa-2" />
        <Filas n={7} />
      </div>
    </main>
  );
}

export function EsqueletoTareas() {
  return (
    <main className={`${pulso} flex flex-col gap-4 px-4 lg:px-8`} aria-busy aria-label="Cargando tareas">
      <Cabecera />
      <div className="flex gap-3 pb-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-5 w-24 rounded bg-placa-2" />
        ))}
      </div>
      <div className="flex gap-2">
        <span className="h-8 w-40 rounded-lg bg-placa-2" />
        <span className="h-8 w-36 rounded-lg bg-placa-2" />
      </div>
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className={`${bloque} overflow-hidden`}>
          <div className="h-8 bg-placa-2/60" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <span className="size-[18px] rounded-full bg-placa-2" />
              <span className="flex flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-1/3 rounded bg-placa-2" />
                <span className="h-3 w-1/4 rounded bg-placa-2/70" />
              </span>
              <span className="size-5 rounded-full bg-placa-2" />
              <span className="h-3 w-12 rounded bg-placa-2" />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}

export function EsqueletoConfiguracion() {
  return (
    <main className={`${pulso} flex flex-col gap-5 px-4 lg:px-8`} aria-busy aria-label="Cargando configuración">
      <Cabecera acciones={0} />
      <div className="flex gap-3 pb-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-5 w-20 rounded bg-placa-2" />
        ))}
      </div>
      <div className={`${bloque} max-w-3xl overflow-hidden`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="size-9 rounded-full bg-placa-2" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-3.5 w-40 rounded bg-placa-2" />
              <span className="h-3 w-56 rounded bg-placa-2/70" />
            </span>
            <span className="h-5 w-9 rounded-full bg-placa-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
