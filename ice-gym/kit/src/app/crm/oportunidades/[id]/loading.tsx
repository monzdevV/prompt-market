/** Esqueleto de la ficha de oportunidad: cabecera, camino de etapas, bloques y lateral. */

const pulso = "animate-pulse motion-reduce:animate-none";
const bloque = "rounded-xl border border-linea bg-placa";

export default function Cargando() {
  return (
    <main className={`${pulso} px-4 pb-12 pt-5 lg:px-8`} aria-busy aria-label="Cargando oportunidad">
      <span className="block h-4 w-28 rounded bg-placa-2/70" />
      <div className="mt-3 flex flex-col gap-5 border-b border-linea pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="size-14 rounded-md bg-placa-2" />
            <div className="flex flex-col gap-2">
              <span className="h-7 w-72 max-w-[60vw] rounded-md bg-placa-2" />
              <div className="flex gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="h-5 w-20 rounded-md bg-placa-2/70" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-6">
            <span className="h-10 w-28 rounded-md bg-placa-2" />
            <span className="h-10 w-24 rounded-md bg-placa-2/70" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 sm:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-9 flex-1 rounded-md bg-placa-2" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="h-8 w-28 rounded-md bg-placa-2" />
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-56`} />
          <div className={`${bloque} h-64`} />
          <div className={`${bloque} h-80`} />
        </div>
        <div className="flex flex-col gap-5">
          <div className={`${bloque} h-72`} />
          <div className={`${bloque} h-48`} />
        </div>
      </div>
    </main>
  );
}
