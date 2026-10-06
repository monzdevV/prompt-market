import type { Aggregate } from "@/lib/analytics";
import { fmtNum } from "./ui";

/**
 * Tarjeta de métrica honesta:
 *  - valor real (incluido 0) cuando la red lo dio;
 *  - "—" + motivo cuando no hay dato (no disponible o aún sin sincronizar), nunca un 0 inventado;
 *  - indica la cobertura cuando solo algunas publicaciones aportan el dato.
 */
export function MetricCard({
  label,
  agg,
  value,
  unavailable,
  suffix,
}: {
  label: string;
  agg?: Aggregate;
  value?: number | null;
  /** Texto cuando no hay dato (p. ej. "TikTok no da este dato") */
  unavailable?: string;
  suffix?: string;
}) {
  const v = agg ? agg.value : (value ?? null);
  const partial = agg && agg.value !== null && agg.withData < agg.total;
  return (
    <div className="card card-hover p-5">
      <p className="eyebrow">{label}</p>
      {v === null ? (
        <>
          <p className="mt-2 font-serif text-4xl leading-none text-faint" aria-label="Sin dato">
            —
          </p>
          <p className="hint mt-0.5">{unavailable ?? (agg && agg.total === 0 ? "Aún sin publicaciones sincronizadas" : "Dato no disponible")}</p>
        </>
      ) : (
        <>
          <p className="mt-2 font-serif text-4xl leading-none tabular-nums">
            {fmtNum(v)}
            {suffix}
          </p>
          {partial && (
            <p className="hint mt-0.5">
              De {agg!.withData} de {agg!.total} publicaciones
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Celda de tabla: número, o "—" con explicación accesible. */
export function MetricCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-muted" title="Dato no disponible">
        —<span className="sr-only">sin dato</span>
      </span>
    );
  }
  return <span className="tabular-nums">{fmtNum(value)}</span>;
}
