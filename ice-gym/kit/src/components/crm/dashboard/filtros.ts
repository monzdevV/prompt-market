/** Filtros del dashboard B2B (valen en servidor y en cliente). */

export const PERIODOS_DASHBOARD = ["30", "90", "365", "todo"] as const;
export type PeriodoDashboard = (typeof PERIODOS_DASHBOARD)[number];

export const ETIQUETA_PERIODO_DASHBOARD: Record<PeriodoDashboard, string> = {
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  "365": "Últimos 12 meses",
  todo: "Todo el histórico",
};

export const PERIODO_POR_DEFECTO: PeriodoDashboard = "90";

export function periodoValido(v: unknown): PeriodoDashboard {
  return typeof v === "string" && (PERIODOS_DASHBOARD as readonly string[]).includes(v)
    ? (v as PeriodoDashboard)
    : PERIODO_POR_DEFECTO;
}

/** Fecha ISO de inicio del periodo, o null si es «todo». */
export function inicioPeriodo(p: PeriodoDashboard, ahora = Date.now()) {
  if (p === "todo") return null;
  return new Date(ahora - Number(p) * 86_400_000).toISOString();
}
