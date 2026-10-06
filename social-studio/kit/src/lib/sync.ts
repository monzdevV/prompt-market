import { db, tx, type AccountWithTokens, type Platform } from "./db";
import { getAccountWithTokens, markNeedsReauth } from "./accounts";
import { enqueue, stillOwned, type Job } from "./jobs";
import { log } from "./log";
import { HttpError } from "./platforms/common";
import { dayKey, type Insights, type MetricValues } from "./platforms/insights";
import { facebookInsights, instagramInsights } from "./platforms/meta-insights";
import { tiktokInsights } from "./platforms/tiktok-insights";
import { youtubeInsights } from "./platforms/youtube-insights";
import { publisherFor } from "./platforms";
import { isRelayed, relayInsights } from "./platforms/uploadpost";
import type { JobDirective } from "./publisher";

/**
 * Sincronización de analítica:  API de la red → trabajo → normalizar → base de datos → histórico → panel.
 * El panel nunca llama a las redes: lee lo último sincronizado. Cada cuenta se sincroniza en su propio
 * trabajo (sin bloquear peticiones HTTP), con reintentos, pausa por límite de uso y fallos parciales.
 */

export const INSIGHTS: Partial<Record<Platform, Insights>> = {
  instagram: instagramInsights,
  facebook: facebookInsights,
  tiktok: tiktokInsights,
  youtube: youtubeInsights,
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const syncIntervalMs = () => (Number(process.env.SYNC_INTERVAL_HOURS) || 6) * HOUR;
const FIRST_SYNC_WINDOW = 90 * DAY;
const SYNC_WINDOW = 30 * DAY;
const RATE_LIMIT_PAUSE = 15 * 60_000;
/** Política de YouTube: metadatos (títulos, miniaturas) refrescados o borrados como máximo a los 30 días */
const YOUTUBE_METADATA_MAX_AGE = 30 * DAY;

function workspaceTimezone(workspaceId: string) {
  const row = db.prepare("SELECT timezone FROM workspaces WHERE id = ?").get(workspaceId) as { timezone: string } | undefined;
  return row?.timezone || "Europe/Madrid";
}

function setSyncState(accountId: number, fields: { status: string; error?: string | null; syncedAt?: number; rateLimitedUntil?: number | null }) {
  db.prepare(
    `UPDATE accounts SET sync_status = ?, last_sync_error = ?,
       last_synced_at = COALESCE(?, last_synced_at), rate_limited_until = ? WHERE id = ?`,
  ).run(fields.status, fields.error ?? null, fields.syncedAt ?? null, fields.rateLimitedUntil ?? null, accountId);
}

/** Guarda la foto del día. COALESCE: un dato que hoy no llega no borra el que ya teníamos. */
function upsertSnapshot(
  account: AccountWithTokens,
  day: string,
  values: { followers?: number | null; following?: number | null; mediaCount?: number | null } & Partial<MetricValues>,
) {
  db.prepare(
    `INSERT INTO account_snapshots (account_id, workspace_id, day, followers, following, media_count, views, reach, likes, comments, shares, watch_time_s, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (account_id, day) DO UPDATE SET
       followers = COALESCE(excluded.followers, followers), following = COALESCE(excluded.following, following),
       media_count = COALESCE(excluded.media_count, media_count), views = COALESCE(excluded.views, views),
       reach = COALESCE(excluded.reach, reach), likes = COALESCE(excluded.likes, likes),
       comments = COALESCE(excluded.comments, comments), shares = COALESCE(excluded.shares, shares),
       watch_time_s = COALESCE(excluded.watch_time_s, watch_time_s), captured_at = excluded.captured_at`,
  ).run(
    account.id,
    account.workspace_id,
    day,
    values.followers ?? null,
    values.following ?? null,
    values.mediaCount ?? null,
    values.views ?? null,
    values.reach ?? null,
    values.likes ?? null,
    values.comments ?? null,
    values.shares ?? null,
    values.watchTimeS ?? null,
    Date.now(),
  );
}

/** Solo los valores que la red dio (sin nulos) para el JSON de resumen de cada publicación de la app. */
function knownStats(m: MetricValues) {
  const out: Record<string, number> = {};
  for (const k of ["views", "likes", "comments", "shares"] as const) if (m[k] !== null) out[k] = m[k]!;
  return out;
}

function recordPosts(account: AccountWithTokens, day: string, posts: Awaited<ReturnType<Insights["recentPosts"]>>["posts"]) {
  const now = Date.now();
  const upsertPost = db.prepare(
    `INSERT INTO social_posts (workspace_id, account_id, remote_id, target_id, media_type, caption, permalink, thumbnail_url, published_at, fetched_at)
     VALUES (?, ?, ?, (SELECT id FROM post_targets WHERE account_id = ? AND remote_id = ? LIMIT 1), ?, ?, ?, ?, ?, ?)
     ON CONFLICT (account_id, remote_id) DO UPDATE SET
       target_id = COALESCE(excluded.target_id, target_id), media_type = excluded.media_type, caption = excluded.caption,
       permalink = excluded.permalink, thumbnail_url = excluded.thumbnail_url, published_at = excluded.published_at,
       fetched_at = excluded.fetched_at
     RETURNING id, target_id`,
  );
  const upsertMetrics = db.prepare(
    `INSERT INTO post_metrics (social_post_id, workspace_id, day, views, reach, likes, comments, shares, saves, watch_time_s, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (social_post_id, day) DO UPDATE SET
       views = COALESCE(excluded.views, views), reach = COALESCE(excluded.reach, reach), likes = COALESCE(excluded.likes, likes),
       comments = COALESCE(excluded.comments, comments), shares = COALESCE(excluded.shares, shares),
       saves = COALESCE(excluded.saves, saves), watch_time_s = COALESCE(excluded.watch_time_s, watch_time_s),
       captured_at = excluded.captured_at`,
  );
  const updateTargetStats = db.prepare("UPDATE post_targets SET stats = ?, stats_updated_at = ? WHERE id = ?");
  tx(() => {
    for (const p of posts) {
      const row = upsertPost.get(
        account.workspace_id,
        account.id,
        p.remoteId,
        account.id,
        p.remoteId,
        p.mediaType,
        p.caption,
        p.permalink,
        p.thumbnailUrl,
        p.publishedAt,
        now,
      ) as { id: number; target_id: number | null };
      const m = p.metrics;
      // Si hoy no llegó ninguna métrica no se escribe fila: el panel sigue mostrando la última conocida
      if (Object.values(m).every((v) => v === null)) continue;
      upsertMetrics.run(row.id, account.workspace_id, day, m.views, m.reach, m.likes, m.comments, m.shares, m.saves, m.watchTimeS, now);
      if (row.target_id) updateTargetStats.run(JSON.stringify(knownStats(m)), now, row.target_id);
    }
  });
}

/** Sincroniza una cuenta: perfil + foto del día + publicaciones recientes con sus métricas. */
export async function handleSyncAccount(job: Job): Promise<JobDirective> {
  const stored = getAccountWithTokens(Number(job.ref_id));
  if (!stored || stored.status !== "active") return { type: "done" };
  // Conectada a través de Upload-Post: su analítica se lee de su API
  const insights = isRelayed(stored) ? relayInsights : INSIGHTS[stored.platform];
  if (!insights) return { type: "done" };
  if (stored.rate_limited_until && stored.rate_limited_until > Date.now()) {
    return { type: "wait", ms: stored.rate_limited_until - Date.now() };
  }

  const started = Date.now();
  // Una ejecución anterior que murió con el proceso no se queda «en curso» para siempre
  db.prepare("UPDATE sync_runs SET status = 'failed', error = 'Interrumpida', finished_at = ? WHERE account_id = ? AND status = 'running'").run(
    started,
    stored.id,
  );
  const { id: runId } = db
    .prepare("INSERT INTO sync_runs (workspace_id, account_id, trigger, status, started_at) VALUES (?, ?, ?, 'running', ?) RETURNING id")
    .get(stored.workspace_id, stored.id, stored.last_synced_at ? "schedule" : "connect", started) as { id: number };
  const finishRun = (status: "ok" | "partial" | "failed", ok: number, failed: number, error: string | null = null) =>
    db
      .prepare("UPDATE sync_runs SET status = ?, items_ok = ?, items_failed = ?, error = ?, finished_at = ? WHERE id = ?")
      .run(status, ok, failed, error, Date.now(), runId);
  setSyncState(stored.id, { status: "syncing" });
  const abandoned = (): JobDirective => {
    finishRun("failed", 0, 0, "Cuenta desconectada durante la sincronización");
    // Si seguimos siendo dueños (p. ej. la renovación marcó «reconectar»), no dejar la cuenta en «sincronizando»
    if (stillOwned(job)) setSyncState(stored.id, { status: "error", error: "Hay que volver a autorizar la cuenta" });
    log.info("sync.abandoned", { jobId: job.id, accountId: stored.id });
    return { type: "done" };
  };
  const logCtx = { jobId: job.id, accountId: stored.id, platform: stored.platform, runId };
  /**
   * Tras cada espera de red: ¿seguimos siendo dueños del trabajo y la cuenta sigue activa? Si el usuario
   * desconectó (o Meta pidió borrar sus datos) mientras esperábamos, no se vuelve a escribir nada.
   * Las escrituras que siguen son síncronas, así que nadie puede colarse entre esta comprobación y ellas.
   */
  const stillValid = () =>
    stillOwned(job) && (db.prepare("SELECT status FROM accounts WHERE id = ?").get(stored.id) as { status: string } | undefined)?.status === "active";

  try {
    const pub = publisherFor(stored);
    const account = pub.refresh ? await pub.refresh(stored) : stored;
    const tz = workspaceTimezone(account.workspace_id);
    const today = dayKey(Date.now(), tz);

    const profile = await insights.profile(account);
    if (!stillValid()) return abandoned();
    upsertSnapshot(account, today, profile);
    if (profile.daily) upsertSnapshot(account, profile.daily.day, profile.daily.metrics);
    if (profile.name || profile.avatar) {
      db.prepare("UPDATE accounts SET name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE id = ?").run(
        profile.name ?? null,
        profile.avatar ?? null,
        account.id,
      );
    }

    const since = Date.now() - (account.last_synced_at ? SYNC_WINDOW : FIRST_SYNC_WINDOW);
    const { posts, failedMetrics } = await insights.recentPosts(account, since);
    if (!stillValid()) return abandoned();
    recordPosts(account, today, posts);

    finishRun(failedMetrics ? "partial" : "ok", posts.length - failedMetrics, failedMetrics);
    setSyncState(account.id, {
      status: "synced",
      syncedAt: Date.now(),
      error: failedMetrics ? `${failedMetrics} publicaciones sin métricas disponibles` : null,
    });
    log.info("sync.done", { ...logCtx, posts: posts.length, failedMetrics, ms: Date.now() - started });
    return { type: "done" };
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    if (!stillValid()) return abandoned();
    if (e instanceof HttpError && e.auth) {
      markNeedsReauth(stored.id);
      setSyncState(stored.id, { status: "error", error: "Hay que volver a autorizar la cuenta" });
      finishRun("failed", 0, 0, message);
      log.warn("sync.needs_reauth", { ...logCtx, err: e });
      return { type: "done" };
    }
    if (e instanceof HttpError && (e.status === 429 || (e.retryable && e.status >= 400 && e.status < 500))) {
      // Límite de uso de la red: pausa y el planificador lo retomará después
      const until = Date.now() + RATE_LIMIT_PAUSE;
      setSyncState(stored.id, { status: "rate_limited", error: "La red nos pide esperar", rateLimitedUntil: until });
      finishRun("failed", 0, 0, message);
      log.warn("sync.rate_limited", { ...logCtx, err: e });
      return { type: "done" };
    }
    finishRun("failed", 0, 0, message);
    if (e instanceof HttpError && e.retryable && job.attempts < job.max_attempts) {
      setSyncState(stored.id, { status: "error", error: "No se pudo sincronizar; reintentando" });
      return { type: "retry", error: message };
    }
    setSyncState(stored.id, { status: "error", error: "No se pudo sincronizar. Si se repite, reconecta la cuenta." });
    log.warn("sync.failed", { ...logCtx, err: e });
    return { type: "done" };
  }
}

export function onSyncJobDead(job: Pick<Job, "ref_id">) {
  setSyncState(Number(job.ref_id), { status: "error", error: "La sincronización se interrumpió" });
}

/** Encola la sincronización de las cuentas que tocan (llamado periódicamente por el ejecutor). */
export function scheduleDueSyncs() {
  const now = Date.now();
  const platforms = Object.keys(INSIGHTS);
  const due = db
    .prepare(
      `SELECT id, workspace_id FROM accounts
       WHERE status = 'active' AND (platform IN (${platforms.map(() => "?").join(",")}) OR external_id LIKE 'up:%')
         AND (last_synced_at IS NULL OR last_synced_at < ?)
         AND (rate_limited_until IS NULL OR rate_limited_until < ?)
         -- Una cuenta que falla siempre no se reintenta cada 5 minutos: como mucho un intento por intervalo
         -- (las pausas cortas por límite de uso se rigen por rate_limited_until, no por esto)
         AND (rate_limited_until IS NOT NULL
              OR NOT EXISTS (SELECT 1 FROM sync_runs r WHERE r.account_id = accounts.id AND r.started_at > ?))`,
    )
    .all(...platforms, now - syncIntervalMs(), now, now - syncIntervalMs()) as { id: number; workspace_id: string }[];
  for (const a of due) enqueue("sync_account", a.id, a.workspace_id);
  return due.length;
}

/** Sincronización a petición del usuario (solo sus cuentas). */
export function requestSync(workspaceId: string, accountIds?: number[]) {
  const rows = db
    .prepare("SELECT id, platform, external_id FROM accounts WHERE workspace_id = ? AND status = 'active'")
    .all(workspaceId) as { id: number; platform: Platform; external_id: string }[];
  const selected = rows.filter((r) => (INSIGHTS[r.platform] || isRelayed(r)) && (!accountIds || accountIds.includes(r.id)));
  for (const a of selected) enqueue("sync_account", a.id, workspaceId);
  return selected.length;
}

/** Política de YouTube: los metadatos que no se han refrescado en 30 días se borran (las estadísticas se conservan). */
export function purgeStaleYoutubeMetadata() {
  return db
    .prepare(
      `UPDATE social_posts SET caption = NULL, thumbnail_url = NULL
       WHERE fetched_at < ? AND (caption IS NOT NULL OR thumbnail_url IS NOT NULL)
         AND account_id IN (SELECT id FROM accounts WHERE platform = 'youtube')`,
    )
    .run(Date.now() - YOUTUBE_METADATA_MAX_AGE).changes;
}

/** Borra todo lo leído de una red para una cuenta (desconexión de YouTube: plazo máximo de 7 días según su política). */
export function deleteProviderData(accountId: number) {
  db.prepare("DELETE FROM social_posts WHERE account_id = ?").run(accountId);
  db.prepare("DELETE FROM account_snapshots WHERE account_id = ?").run(accountId);
  db.prepare("UPDATE post_targets SET stats = NULL, stats_updated_at = NULL WHERE account_id = ?").run(accountId);
}
