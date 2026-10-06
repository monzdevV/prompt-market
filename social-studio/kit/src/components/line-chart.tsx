/**
 * Gráfico de línea mínimo en SVG (sin librerías). Los días sin dato NO se dibujan como 0:
 * la línea se corta y queda un hueco, para no sugerir una caída que no existe.
 */
export function LineChart({
  points,
  days,
  label,
  height = 160,
}: {
  /** Puntos por día (YYYY-MM-DD). Los días que falten se consideran sin dato. */
  points: { day: string; value: number }[];
  /** Días del eje X, en orden */
  days: string[];
  label: string;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div className="grid place-items-center rounded-lg bg-surface-2 text-sm text-muted" style={{ height }}>
        {points.length === 0 ? "Aún no hay histórico: se irá llenando cada día" : "Hace falta al menos otro día para dibujar la evolución"}
      </div>
    );
  }
  const W = 600;
  const H = height;
  const pad = 8;
  const byDay = new Map(points.map((p) => [p.day, p.value]));
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, days.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);

  // Tramos continuos: se cortan donde falta un día
  const segments: string[] = [];
  let current: string[] = [];
  days.forEach((d, i) => {
    const v = byDay.get(d);
    if (v === undefined) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${current.length ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    }
  });
  if (current.length) segments.push(current.join(" "));

  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: de ${first.value} a ${last.value}`}>
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {days.map((d, i) =>
          byDay.has(d) ? <circle key={d} cx={x(i)} cy={y(byDay.get(d)!)} r={2.5} fill="var(--accent)" /> : null,
        )}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted tabular-nums">
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

export function dayRange(days: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return Array.from({ length: days }, (_, i) => fmt.format(new Date(Date.now() - (days - 1 - i) * 24 * 3600_000)));
}
