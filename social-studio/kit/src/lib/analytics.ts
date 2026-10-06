import { db, type Account, type Platform } from "./db";
import { dayKey } from "./platforms/insights";
import { limitsFor } from "./plans";

/** Periodos que se pueden elegir en Analítica (hasta el histórico incluido, igual en todos los planes). */
const RANGES = [7, 30, 90, 365, 730];

export function analyticsRanges(workspaceId: string) {
  const maxDays = limitsFor(workspaceId).historyDays;
  return RANGES.filter((r) => r <= maxDays);
}

/** Periodo pedido si es uno de los permitidos; si no, 30 días. */
export function pickAnalyticsRange(workspaceId: string, requested: unknown) {
  const ranges = analyticsRanges(workspaceId);
  const d = Number(requested);
  return ranges.includes(d) ? d : Math.min(30, ranges[ranges.length - 1] ?? 30);
}

/**
 * Lecturas para los paneles de analítica. Solo leen lo sincronizado (nunca llaman a las redes)
 * y siempre filtran por espacio de trabajo. Agregan en SQL, no cargando miles de filas en la página.
 */

export type ConnectionState =
  | "CONNECTED"
  | "SYNCING"
  | "SYNCED"
  | "NEEDS_REAUTHORIZATION"
  | "RATE_LIMITED"
  | "ERROR"
  | "DISCONNECTED";

export function connectionState(a: Pick<Account, "status" | "sync_status" | "last_synced_at">): ConnectionState {
  if (a.status === "disconnected") return "DISCONNECTED";
  if (a.status === "needs_reauth") return "NEEDS_REAUTHORIZATION";
  switch (a.sync_status) {
    case "syncing":
      return "SYNCING";
    case "rate_limited":
      return "RATE_LIMITED";
    case "error":
      return "ERROR";
    case "synced":
      return "SYNCED";
    default:
      return a.last_synced_at ? "SYNCED" : "CONNECTED";
  }
}

export function workspaceTz(workspaceId: string) {
  return (db.prepare("SELECT timezone FROM workspaces WHERE id = ?").get(workspaceId) as { timezone: string } | undefined)?.timezone ?? "Europe/Madrid";
}

export type AccountOverview = Account & {
  state: ConnectionState;
  followers: number | null;
  followersDay: string | null;
  /** Variación de seguidores frente a la foto más cercana a hace `days` días; null si no hay histórico */
  followersDelta: number | null;
  /** Día de la foto con la que se compara la variación (null si no hay dos fotos distintas) */
  followersSince: string | null;
};

export function accountsOverview(workspaceId: string, days = 30): AccountOverview[] {
  const since = dayKey(Date.now() - days * 24 * 3600_000, workspaceTz(workspaceId));
  const rows = db
    .prepare(
      `SELECT a.id, a.workspace_id, a.brand_id, a.platform, a.external_id, a.name, a.avatar, a.status, a.meta, a.created_at,
              a.sync_status, a.last_synced_at, a.last_sync_error, a.rate_limited_until, a.granted_scopes,
              (SELECT followers FROM account_snapshots s WHERE s.account_id = a.id AND s.followers IS NOT NULL ORDER BY day DESC LIMIT 1) AS followers,
              (SELECT day FROM account_snapshots s WHERE s.account_id = a.id AND s.followers IS NOT NULL ORDER BY day DESC LIMIT 1) AS followers_day,
              (SELECT followers FROM account_snapshots s WHERE s.account_id = a.id AND s.followers IS NOT NULL AND s.day >= ? ORDER BY day ASC LIMIT 1) AS followers_start,
              (SELECT day FROM account_snapshots s WHERE s.account_id = a.id AND s.followers IS NOT NULL AND s.day >= ? ORDER BY day ASC LIMIT 1) AS followers_start_day
       FROM accounts a WHERE a.workspace_id = ? AND a.status != 'disconnected' ORDER BY a.platform, a.name`,
    )
    .all(since, since, workspaceId) as (Account & {
    followers: number | null;
    followers_day: string | null;
    followers_start: number | null;
    followers_start_day: string | null;
  })[];
  return rows.map(({ followers_day, followers_start, followers_start_day, ...a }) => ({
    ...a,
    state: connectionState(a),
    followersDay: followers_day,
    // Con una sola foto no hay variación que medir: «—», no un 0 inventado
    followersDelta:
      a.followers !== null && followers_start !== null && followers_start_day !== followers_day ? a.followers - followers_start : null,
    followersSince: followers_start_day !== followers_day ? followers_start_day : null,
  }));
}

/** Serie diaria de seguidores de una cuenta (los días sin foto no aparecen: el gráfico deja hueco). */
export function followersSeries(workspaceId: string, accountId: number, days: number) {
  const since = dayKey(Date.now() - days * 24 * 3600_000, workspaceTz(workspaceId));
  return db
    .prepare(
      `SELECT day, followers FROM account_snapshots
       WHERE workspace_id = ? AND account_id = ? AND day >= ? AND followers IS NOT NULL ORDER BY day`,
    )
    .all(workspaceId, accountId, since) as { day: string; followers: number }[];
}

/** Métrica agregada: suma de lo disponible + cuántas publicaciones aportan dato (cobertura). */
export type Aggregate = { value: number | null; withData: number; total: number };

export type MetricKey = "views" | "reach" | "likes" | "comments" | "shares" | "saves";
export const METRIC_KEYS: MetricKey[] = ["views", "reach", "likes", "comments", "shares", "saves"];

export type PostWithMetrics = {
  id: number;
  account_id: number;
  platform: Platform;
  account_name: string;
  remote_id: string;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  media_type: string | null;
  published_at: number | null;
  metrics_day: string | null;
} & Record<MetricKey, number | null>;

/** Publicaciones del periodo con sus últimas métricas conocidas. */
export function postsWithMetrics(workspaceId: string, opts: { platform?: Platform; accountId?: number; days: number; limit?: number }) {
  const since = Date.now() - opts.days * 24 * 3600_000;
  const where = ["s.workspace_id = ?", "a.status != 'disconnected'", "(s.published_at IS NULL OR s.published_at >= ?)"];
  const args: (string | number)[] = [workspaceId, since];
  if (opts.platform) {
    where.push("a.platform = ?");
    args.push(opts.platform);
  }
  if (opts.accountId) {
    where.push("s.account_id = ?");
    args.push(opts.accountId);
  }
  const limit = Math.min(Math.max(1, opts.limit ?? 500), 2000);
  return db
    .prepare(
      `SELECT s.id, s.account_id, a.platform, a.name AS account_name, s.remote_id, s.caption, s.permalink, s.thumbnail_url,
              s.media_type, s.published_at, m.day AS metrics_day,
              m.views, m.reach, m.likes, m.comments, m.shares, m.saves
       FROM social_posts s
       JOIN accounts a ON a.id = s.account_id
       LEFT JOIN post_metrics m ON m.social_post_id = s.id
         AND m.day = (SELECT MAX(day) FROM post_metrics WHERE social_post_id = s.id)
       WHERE ${where.join(" AND ")}
       ORDER BY s.published_at DESC LIMIT ${limit}`,
    )
    .all(...args) as PostWithMetrics[];
}

export function aggregate(posts: PostWithMetrics[], key: MetricKey): Aggregate {
  const withData = posts.filter((p) => p[key] !== null);
  return {
    value: withData.length ? withData.reduce((s, p) => s + (p[key] as number), 0) : null,
    withData: withData.length,
    total: posts.length,
  };
}

/** Métricas diarias de cuenta (visualizaciones, alcance…) sumadas en el periodo, solo si la red las da. */
export function accountDailyTotals(workspaceId: string, accountIds: number[], days: number) {
  if (!accountIds.length) return { views: null, reach: null, days: 0 };
  const since = dayKey(Date.now() - days * 24 * 3600_000, workspaceTz(workspaceId));
  const r = db
    .prepare(
      `SELECT SUM(views) AS views, SUM(reach) AS reach, COUNT(views) + COUNT(reach) AS n
       FROM account_snapshots WHERE workspace_id = ? AND day >= ? AND account_id IN (${accountIds.map(() => "?").join(",")})`,
    )
    .get(workspaceId, since, ...accountIds) as { views: number | null; reach: number | null; n: number };
  return { views: r.views, reach: r.reach, days: r.n };
}
