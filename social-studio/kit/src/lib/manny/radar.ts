import { randomUUID } from "node:crypto";
import { workspaceTz } from "../analytics";
import { db } from "../db";
import { ApiError, conflict, notFound } from "../errors";
import { fetchProfile, type Platform, type VideoMeta } from "./social";

export type Tracked = {
  id: string;
  platform: Platform;
  handle: string;
  kind: "ref" | "own";
  nickname: string;
  followers: number | null;
  bio: string;
  grupo: string;
  addedAt: number;
  syncedAt: number | null;
  syncError: string | null;
  videoCount: number;
};

const MAX_TRACKED = 40;
/** Cuántos vídeos recientes se leen de cada cuenta. */
export const PROFILE_VIDEOS = 30;

type TrackedRaw = {
  id: string;
  platform: Platform;
  handle: string;
  kind: "ref" | "own";
  nickname: string;
  followers: number | null;
  bio: string;
  grupo: string;
  added_at: number;
  synced_at: number | null;
  sync_error: string | null;
  n: number;
};

const toTracked = (r: TrackedRaw): Tracked => ({
  id: r.id,
  platform: r.platform,
  handle: r.handle,
  kind: r.kind,
  nickname: r.nickname,
  followers: r.followers,
  bio: r.bio,
  grupo: r.grupo,
  addedAt: r.added_at,
  syncedAt: r.synced_at,
  syncError: r.sync_error,
  videoCount: r.n,
});

export function listTracked(workspaceId: string): Tracked[] {
  const rows = db
    .prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM manny_videos v WHERE v.workspace_id = t.workspace_id AND v.platform = t.platform AND v.handle = t.handle AND v.source = 'tracked') AS n
       FROM manny_tracked t WHERE t.workspace_id = ? ORDER BY CASE t.kind WHEN 'own' THEN 0 ELSE 1 END, t.added_at`,
    )
    .all(workspaceId) as TrackedRaw[];
  return rows.map(toTracked);
}

export function addTracked(workspaceId: string, input: { platform: Platform; handle: string; kind?: "ref" | "own"; grupo?: string }) {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM manny_tracked WHERE workspace_id = ?").get(workspaceId) as { n: number }).n;
  if (count >= MAX_TRACKED) throw new ApiError(400, "limit", `Puedes seguir hasta ${MAX_TRACKED} cuentas. Quita alguna para añadir otra.`);
  const id = randomUUID().slice(0, 8);
  try {
    db.prepare("INSERT INTO manny_tracked (id, workspace_id, platform, handle, kind, grupo, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id,
      workspaceId,
      input.platform,
      input.handle,
      input.kind ?? "ref",
      (input.grupo ?? "").slice(0, 40),
      Date.now(),
    );
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) throw conflict("Esa cuenta ya está en tu radar");
    throw e;
  }
  return id;
}

export function removeTracked(workspaceId: string, id: string) {
  const t = db.prepare("SELECT platform, handle FROM manny_tracked WHERE workspace_id = ? AND id = ?").get(workspaceId, id) as { platform: Platform; handle: string } | undefined;
  if (!t) throw notFound("Esa cuenta");
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM manny_videos WHERE workspace_id = ? AND platform = ? AND handle = ? AND source = 'tracked'").run(workspaceId, t.platform, t.handle);
    db.prepare("DELETE FROM manny_tracked WHERE workspace_id = ? AND id = ?").run(workspaceId, id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Guarda o actualiza un vídeo. Las métricas se refrescan; la transcripción que ya hubiera se conserva. */
export function upsertVideo(workspaceId: string, v: VideoMeta, source: "tracked" | "pasted", transcript?: string | null) {
  db.prepare(
    `INSERT INTO manny_videos (workspace_id, platform, id, handle, url, caption, views, likes, comments, shares, saves, duration, posted_at, thumb, music, hashtags, transcript, source, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id, platform, id) DO UPDATE SET
       handle = excluded.handle, url = excluded.url, caption = excluded.caption, views = excluded.views, likes = excluded.likes,
       comments = excluded.comments, shares = excluded.shares, saves = excluded.saves, duration = COALESCE(excluded.duration, duration),
       posted_at = COALESCE(excluded.posted_at, posted_at), thumb = COALESCE(excluded.thumb, thumb), music = COALESCE(excluded.music, music),
       hashtags = excluded.hashtags, transcript = COALESCE(excluded.transcript, transcript),
       source = CASE WHEN manny_videos.source = 'tracked' THEN 'tracked' ELSE excluded.source END, fetched_at = excluded.fetched_at`,
  ).run(
    workspaceId,
    v.platform,
    v.id,
    v.handle,
    v.url,
    v.caption,
    v.views,
    v.likes,
    v.comments,
    v.shares,
    v.saves,
    v.duration,
    v.postedAt,
    v.thumb,
    v.music,
    JSON.stringify(v.hashtags),
    transcript ?? null,
    source,
    Date.now(),
  );
}

/** Lee la cuenta en la red y guarda sus últimos vídeos con métricas. Si falla, deja el motivo en la cuenta. */
export async function syncTracked(workspaceId: string, id: string) {
  const t = db.prepare("SELECT platform, handle FROM manny_tracked WHERE workspace_id = ? AND id = ?").get(workspaceId, id) as { platform: Platform; handle: string } | undefined;
  if (!t) throw notFound("Esa cuenta");
  try {
    const p = await fetchProfile(t.platform, t.handle, PROFILE_VIDEOS);
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const v of p.videos) upsertVideo(workspaceId, { ...v, handle: t.handle }, "tracked");
      db.prepare("UPDATE manny_tracked SET nickname = ?, followers = COALESCE(?, followers), bio = ?, synced_at = ?, sync_error = NULL WHERE workspace_id = ? AND id = ?").run(
        p.nickname,
        p.followers,
        p.bio,
        Date.now(),
        workspaceId,
        id,
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    return { videos: p.videos.length };
  } catch (e) {
    db.prepare("UPDATE manny_tracked SET sync_error = ? WHERE workspace_id = ? AND id = ?").run(e instanceof Error ? e.message.slice(0, 300) : "Error al leer la cuenta", workspaceId, id);
    throw e;
  }
}

/* ───────────── Qué vídeos revientan ───────────── */

export type RadarVideo = VideoMeta & {
  nickname: string;
  followers: number | null;
  kind: "ref" | "own";
  /** Visitas entre la mediana de visitas de su cuenta: 3 = el triple de lo normal para ella. */
  vsMedian: number | null;
  /** Visitas entre seguidores. */
  vsFollowers: number | null;
  saveRate: number | null;
  shareRate: number | null;
  transcript: string | null;
};

type VideoRaw = {
  platform: Platform;
  id: string;
  handle: string;
  url: string;
  caption: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  duration: number | null;
  posted_at: number | null;
  thumb: string | null;
  music: string | null;
  hashtags: string;
  transcript: string | null;
};

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Con menos vídeos que esto la «mediana» de una cuenta no significa nada. */
const MIN_FOR_MEDIAN = 6;
/** Para contar como «reventón» hace falta, como mínimo, el doble de lo normal y esta cifra de visitas. */
export const OUTLIER_RATIO = 2;
export const OUTLIER_MIN_VIEWS = 5000;

export type FeedSort = "ratio" | "views" | "recent" | "saves";

export function radarFeed(workspaceId: string, opts: { days?: number; sort?: FeedSort; platform?: Platform; handle?: string; limit?: number; minViews?: number } = {}): RadarVideo[] {
  const tracked = new Map(listTracked(workspaceId).map((t) => [`${t.platform}:${t.handle}`, t]));
  const rows = db.prepare("SELECT * FROM manny_videos WHERE workspace_id = ? AND source = 'tracked'").all(workspaceId) as VideoRaw[];
  const byAccount = new Map<string, number[]>();
  for (const r of rows) {
    if (r.views === null) continue;
    const k = `${r.platform}:${r.handle}`;
    byAccount.set(k, [...(byAccount.get(k) ?? []), r.views]);
  }
  const since = opts.days ? Date.now() - opts.days * 86_400_000 : 0;
  const out: RadarVideo[] = [];
  for (const r of rows) {
    const k = `${r.platform}:${r.handle}`;
    const t = tracked.get(k);
    if (!t) continue;
    if (opts.platform && r.platform !== opts.platform) continue;
    if (opts.handle && r.handle !== opts.handle) continue;
    if (since && (r.posted_at ?? 0) < since) continue;
    if (opts.minViews && (r.views ?? 0) < opts.minViews) continue;
    const views = r.views;
    const accountViews = byAccount.get(k) ?? [];
    const med = accountViews.length >= MIN_FOR_MEDIAN ? median(accountViews) : null;
    out.push({
      platform: r.platform,
      id: r.id,
      url: r.url,
      handle: r.handle,
      caption: r.caption,
      views,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saves,
      duration: r.duration,
      postedAt: r.posted_at,
      thumb: r.thumb,
      music: r.music,
      hashtags: JSON.parse(r.hashtags) as string[],
      nickname: t.nickname,
      followers: t.followers,
      kind: t.kind,
      vsMedian: views !== null && med ? views / med : null,
      vsFollowers: views !== null && t.followers ? views / t.followers : null,
      saveRate: views && r.saves !== null ? r.saves / views : null,
      shareRate: views && r.shares !== null ? r.shares / views : null,
      transcript: r.transcript,
    });
  }
  const key: Record<FeedSort, (v: RadarVideo) => number> = {
    ratio: (v) => v.vsMedian ?? -1,
    views: (v) => v.views ?? -1,
    recent: (v) => v.postedAt ?? 0,
    saves: (v) => v.saveRate ?? -1,
  };
  const k = key[opts.sort ?? "ratio"];
  return out.sort((a, b) => k(b) - k(a)).slice(0, opts.limit ?? 60);
}

export const isOutlier = (v: RadarVideo) => v.vsMedian !== null && v.vsMedian >= OUTLIER_RATIO && (v.views ?? 0) >= OUTLIER_MIN_VIEWS;

/* ───────────── Qué tienen en común (cálculo, sin IA) ───────────── */

const GENERIC_TAGS = new Set(["#fyp", "#foryou", "#foryoupage", "#parati", "#viral", "#fy", "#xyzbca", "#tiktok", "#trending", "#paratii"]);
const BUCKETS = [
  { label: "hasta 15 s", max: 15 },
  { label: "16–30 s", max: 30 },
  { label: "31–60 s", max: 60 },
  { label: "más de 60 s", max: Infinity },
];

export type RadarInsights = {
  videos: number;
  accounts: number;
  winners: number;
  durations: { label: string; winners: number; others: number }[];
  medianDuration: { winners: number | null; others: number | null };
  topTags: { tag: string; count: number }[];
  bestDays: { day: string; count: number }[];
  bestHours: { hour: number; count: number }[];
  saveRate: { winners: number | null; others: number | null };
  shareRate: { winners: number | null; others: number | null };
  captionLength: { winners: number | null; others: number | null };
};

export function computeInsights(videos: RadarVideo[], tz: string): RadarInsights {
  const winners = videos.filter(isOutlier);
  const others = videos.filter((v) => !isOutlier(v) && v.vsMedian !== null);
  const med = (vs: RadarVideo[], f: (v: RadarVideo) => number | null) => median(vs.flatMap((v) => f(v) ?? []));
  const bucket = (d: number | null) => BUCKETS.findIndex((b) => d !== null && d <= b.max);
  const durations = BUCKETS.map((b, i) => ({
    label: b.label,
    winners: winners.filter((v) => bucket(v.duration) === i).length,
    others: others.filter((v) => bucket(v.duration) === i).length,
  }));
  const tagCount = new Map<string, number>();
  for (const v of winners) for (const t of v.hashtags) if (!GENERIC_TAGS.has(t)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", timeZone: tz });
  const hourFmt = new Intl.DateTimeFormat("es-ES", { hour: "numeric", hourCycle: "h23", timeZone: tz });
  const days = new Map<string, number>();
  const hours = new Map<number, number>();
  for (const v of winners) {
    if (!v.postedAt) continue;
    const d = dayFmt.format(v.postedAt);
    days.set(d, (days.get(d) ?? 0) + 1);
    const h = Number(hourFmt.format(v.postedAt));
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const top = <K>(m: Map<K, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    videos: videos.length,
    accounts: new Set(videos.map((v) => `${v.platform}:${v.handle}`)).size,
    winners: winners.length,
    durations,
    medianDuration: { winners: med(winners, (v) => v.duration), others: med(others, (v) => v.duration) },
    topTags: top(tagCount, 8).map(([tag, count]) => ({ tag, count })),
    bestDays: top(days, 3).map(([day, count]) => ({ day, count })),
    bestHours: top(hours, 3).map(([hour, count]) => ({ hour, count })),
    saveRate: { winners: med(winners, (v) => v.saveRate), others: med(others, (v) => v.saveRate) },
    shareRate: { winners: med(winners, (v) => v.shareRate), others: med(others, (v) => v.shareRate) },
    captionLength: { winners: med(winners, (v) => v.caption.length), others: med(others, (v) => v.caption.length) },
  };
}

export function radarInsights(workspaceId: string, days = 90) {
  return computeInsights(radarFeed(workspaceId, { days, limit: 5000 }), workspaceTz(workspaceId));
}

/** Resumen en texto de lo que ha encontrado el radar, para dárselo a Manny. */
export function radarContextText(workspaceId: string): string {
  const feed = radarFeed(workspaceId, { days: 60, sort: "ratio", limit: 5000 });
  if (!feed.length) return "";
  const winners = feed.filter(isOutlier).slice(0, 8);
  const fmt = (n: number | null) => (n === null ? "?" : new Intl.NumberFormat("es-ES").format(n));
  const lines = winners.map(
    (v) =>
      `- @${v.handle} (${fmt(v.followers)} seg.) ${fmt(v.views)} visitas = ×${v.vsMedian?.toFixed(1)} su mediana, ${v.duration ?? "?"} s: «${v.caption.replace(/\s+/g, " ").slice(0, 110)}»`,
  );
  const a = getRadarAnalysis(workspaceId);
  return [
    `${feed.length} vídeos de ${new Set(feed.map((v) => v.handle)).size} cuentas seguidas en los últimos 60 días.`,
    lines.length ? `Los que más han reventado para su tamaño:\n${lines.join("\n")}` : "Ninguno ha reventado claramente todavía.",
    a ? `Última conclusión de Manny sobre el radar: ${a.data.resumen}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ───────────── Conclusión de Manny sobre el radar (se guarda) ───────────── */

export type RadarAnalysis = {
  resumen: string;
  patrones: { patron: string; evidencia: string; comoAplicarlo: string }[];
  evitar: string[];
  probar: { titulo: string; porque: string }[];
  horarios: string;
};

export function getRadarAnalysis(workspaceId: string): { data: RadarAnalysis; updatedAt: number } | null {
  const r = db.prepare("SELECT value, updated_at FROM manny_kv WHERE workspace_id = ? AND key = 'radar_analysis'").get(workspaceId) as { value: string; updated_at: number } | undefined;
  if (!r) return null;
  try {
    return { data: JSON.parse(r.value) as RadarAnalysis, updatedAt: r.updated_at };
  } catch {
    return null;
  }
}

export function saveRadarAnalysis(workspaceId: string, a: RadarAnalysis) {
  db.prepare(
    `INSERT INTO manny_kv (workspace_id, key, value, updated_at) VALUES (?, 'radar_analysis', ?, ?)
     ON CONFLICT (workspace_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(workspaceId, JSON.stringify(a), Date.now());
}

/* ───────────── Cuentas de partida ───────────── */

/** Cuentas de TikTok de fitness que salieron de la investigación del 29/09/2026. Se leen de verdad al sincronizar: si alguna ya no existe, se avisa. */
export const STARTER_ACCOUNTS: { platform: Platform; handle: string; grupo: string }[] = [
  { platform: "tt", handle: "stozfit", grupo: "Técnica" },
  { platform: "tt", handle: "quanbfit", grupo: "Técnica" },
  { platform: "tt", handle: "sebastian.rojasn", grupo: "En español" },
  { platform: "tt", handle: "befefitness", grupo: "En español" },
  { platform: "tt", handle: "movimientofit", grupo: "En español" },
  { platform: "tt", handle: "clinicadelfitness", grupo: "En español" },
  { platform: "tt", handle: "realtakashiren", grupo: "Físico" },
  { platform: "tt", handle: "kuhnner", grupo: "Físico" },
  { platform: "tt", handle: "dmeditz15", grupo: "Edits" },
  { platform: "tt", handle: "context_gold", grupo: "Dibujo" },
];

/** Añade tu cuenta y las de partida que aún no estén en el radar. Devuelve cuántas ha añadido. */
export function addStarterAccounts(workspaceId: string, ownHandle: string | null) {
  const have = new Set(listTracked(workspaceId).map((t) => `${t.platform}:${t.handle}`));
  const wanted = [...(ownHandle ? [{ platform: "tt" as Platform, handle: ownHandle, grupo: "Tú", kind: "own" as const }] : []), ...STARTER_ACCOUNTS.map((a) => ({ ...a, kind: "ref" as const }))];
  let added = 0;
  for (const a of wanted) {
    if (have.has(`${a.platform}:${a.handle}`)) continue;
    addTracked(workspaceId, a);
    added++;
  }
  return added;
}
