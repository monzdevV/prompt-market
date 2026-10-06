import type { AccountWithTokens } from "../db";

/**
 * Lectura de datos de una cuenta para la analítica (independiente de publicar).
 * Convención en TODAS las métricas: `null` = la red no da ese dato (o no se pudo leer);
 * `0` = la red devolvió cero. Nunca se inventa un 0.
 */
export type MetricValues = {
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  watchTimeS: number | null;
};

export const EMPTY_METRICS: MetricValues = {
  views: null,
  reach: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
  watchTimeS: null,
};

export type AccountProfile = {
  name?: string;
  avatar?: string | null;
  /** Contadores acumulados (seguidores, etc.) */
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
  /** Métricas del día `day` cuando la red las da por días (p. ej. alcance de Instagram) */
  daily?: { day: string; metrics: Partial<MetricValues> } | null;
};

export type RemotePost = {
  remoteId: string;
  mediaType: string | null;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  publishedAt: number | null;
  metrics: MetricValues;
};

export type Insights = {
  /** Permisos necesarios para leer; si faltan, la cuenta debe reconectarse */
  readScopes: string[];
  profile(account: AccountWithTokens): Promise<AccountProfile>;
  /** Publicaciones desde `since` (ms), las más recientes primero, con sus métricas actuales */
  recentPosts(account: AccountWithTokens, since: number): Promise<{ posts: RemotePost[]; failedMetrics: number }>;
};

/** Convierte un valor de la API en número o null (nunca 0 por defecto). */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Fecha YYYY-MM-DD en la zona horaria indicada. */
export function dayKey(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}
