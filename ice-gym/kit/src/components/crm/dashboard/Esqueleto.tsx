/** Esqueleto del dashboard B2B: misma retícula que la pantalla real. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-2xl bg-placa shadow-placa";

export function EsqueletoDashboard() {
  return (
    <main className={`${pulso} px-4 pb-12 md:px-8`} aria-busy="true" aria-label="Cargando dashboard">
      <div className="flex items-end justify-between gap-4 pb-5 pt-6">
        <div className="flex flex-col gap-2">
          <span className="h-8 w-44 rounded-md bg-placa-2" />
          <span className="h-4 w-56 rounded bg-placa-2/70" />
        </div>
        <div className="flex gap-2">
          <span className="h-8 w-44 rounded-lg bg-placa-2" />
          <span className="h-8 w-44 rounded-lg bg-placa-2" />
        </div>
      </div>
      <div className={`${bloque} h-48`} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-[4.5rem] rounded-xl bg-placa-2" />
          <div className="h-[4.5rem] rounded-xl bg-placa-2" />
        </div>
        <div className={`${bloque} h-[4.5rem]`} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className={`${bloque} h-80 xl:col-span-2`} />
        <div className={`${bloque} h-80`} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={`${bloque} h-96`} />
        <div className={`${bloque} h-96`} />
      </div>
    </main>
  );
}
