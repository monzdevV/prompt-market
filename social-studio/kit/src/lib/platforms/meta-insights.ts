import { form, http, HttpError } from "./common";
import { dayKey, EMPTY_METRICS, num, type Insights, type MetricValues, type RemotePost } from "./insights";
import { GRAPH } from "./meta";

/*
 * Analítica de Instagram (API de Instagram con inicio de sesión de Facebook) y de Páginas de Facebook.
 * Referencias (consultadas el 23/09/2026):
 *  - IG User:        developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/
 *  - IG User media:  developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/
 *  - Media insights: developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
 *  - User insights:  developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights
 * Métricas retiradas que NO se usan: plays, impressions, video_views, clips_replays_count.
 */

const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

type Paged<T> = { data?: T[]; paging?: { next?: string } };

/** Métricas de insights por tipo de publicación (las válidas hoy para REELS y FEED). */
const MEDIA_METRICS = ["views", "reach", "likes", "comments", "shares", "saved"];

function insightValue(entry: { values?: { value?: unknown }[]; total_value?: { value?: unknown } } | undefined) {
  if (!entry) return null;
  return num(entry.total_value?.value ?? entry.values?.[0]?.value);
}

async function mediaInsights(mediaId: string, token: string): Promise<Partial<MetricValues> | null> {
  try {
    const r = await http<{ data?: { name: string; values?: { value?: unknown }[]; total_value?: { value?: unknown } }[] }>(
      `${GRAPH}/${mediaId}/insights?${form({ metric: MEDIA_METRICS.join(","), access_token: token })}`,
    );
    const by = new Map((r.data ?? []).map((d) => [d.name, d]));
    return {
      views: insightValue(by.get("views")),
      reach: insightValue(by.get("reach")),
      likes: insightValue(by.get("likes")),
      comments: insightValue(by.get("comments")),
      shares: insightValue(by.get("shares")),
      saves: insightValue(by.get("saved")),
    };
  } catch (e) {
    // Permisos o límites: se propagan para que la sincronización lo gestione
    if (e instanceof HttpError && (e.auth || e.retryable)) throw e;
    // Publicaciones sin insights (p. ej. antiguas o de antes de pasar a cuenta profesional): dato no disponible
    return null;
  }
}

type IgMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
};

export const instagramInsights: Insights = {
  readScopes: ["instagram_basic", "instagram_manage_insights", "pages_show_list", "pages_read_engagement"],

  async profile(account) {
    const tok = account.access_token;
    const p = await http<{
      username?: string;
      profile_picture_url?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
    }>(
      `${GRAPH}/${account.external_id}?${form({
        fields: "username,profile_picture_url,followers_count,follows_count,media_count",
        access_token: tok,
      })}`,
    );
    // Alcance y visualizaciones de AYER: día natural completo en UTC (00:00 → 24:00), siempre la misma
    // ventana para la misma clave de día, así varias sincronizaciones no se solapan ni se suman dos veces.
    // Instagram puede tardar hasta 48 h en consolidarlos: la siguiente sincronización corrige el valor.
    let daily = null;
    try {
      const startOfTodayUtc = Math.floor(Date.now() / 86_400_000) * 86_400;
      const until = startOfTodayUtc;
      const since = startOfTodayUtc - 86_400;
      const r = await http<{ data?: { name: string; total_value?: { value?: unknown } }[] }>(
        `${GRAPH}/${account.external_id}/insights?${form({
          metric: "reach,views",
          period: "day",
          metric_type: "total_value",
          since: String(since),
          until: String(until),
          access_token: tok,
        })}`,
      );
      const by = new Map((r.data ?? []).map((d) => [d.name, d]));
      daily = {
        day: dayKey(since * 1000, "UTC"),
        metrics: { reach: insightValue(by.get("reach")), views: insightValue(by.get("views")) },
      };
    } catch (e) {
      if (e instanceof HttpError && e.auth) throw e;
      // Cuentas pequeñas o sin datos: no disponible
    }
    return {
      name: p.username ? `@${p.username}` : undefined,
      avatar: p.profile_picture_url ?? null,
      followers: num(p.followers_count),
      following: num(p.follows_count),
      mediaCount: num(p.media_count),
      daily,
    };
  },

  async recentPosts(account, since) {
    const tok = account.access_token;
    const posts: RemotePost[] = [];
    let failedMetrics = 0;
    let url: string | undefined = `${GRAPH}/${account.external_id}/media?${form({
      fields: "id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count",
      limit: String(PAGE_LIMIT),
      access_token: tok,
    })}`;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const r: Paged<IgMedia> = await http<Paged<IgMedia>>(url);
      let reachedOld = false;
      for (const m of r.data ?? []) {
        const publishedAt = m.timestamp ? Date.parse(m.timestamp) : null;
        if (publishedAt !== null && publishedAt < since) {
          reachedOld = true;
          break;
        }
        const insights = await mediaInsights(m.id, tok);
        if (!insights) failedMetrics++;
        posts.push({
          remoteId: m.id,
          mediaType: m.media_product_type ?? m.media_type ?? null,
          caption: m.caption ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? (m.media_type === "IMAGE" ? (m.media_url ?? null) : null),
          publishedAt,
          metrics: {
            ...EMPTY_METRICS,
            // Si no hay insights, al menos los contadores públicos de la publicación
            likes: insights?.likes ?? num(m.like_count),
            comments: insights?.comments ?? num(m.comments_count),
            ...(insights ? { views: insights.views ?? null, reach: insights.reach ?? null, shares: insights.shares ?? null, saves: insights.saves ?? null } : {}),
          },
        });
      }
      url = reachedOld ? undefined : r.paging?.next;
    }
    return { posts, failedMetrics };
  },
};

type FbVideo = {
  id: string;
  description?: string;
  created_time?: string;
  permalink_url?: string;
  picture?: string;
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
};

/** Páginas de Facebook: seguidores y vídeos con me gusta y comentarios (las visualizaciones no se piden: requerirían más permisos). */
export const facebookInsights: Insights = {
  readScopes: ["pages_show_list", "pages_read_engagement"],

  async profile(account) {
    const p = await http<{ name?: string; followers_count?: number; fan_count?: number; picture?: { data?: { url?: string } } }>(
      `${GRAPH}/${account.external_id}?${form({ fields: "name,followers_count,fan_count,picture{url}", access_token: account.access_token })}`,
    );
    return {
      name: p.name,
      avatar: p.picture?.data?.url ?? null,
      followers: num(p.followers_count ?? p.fan_count),
      following: null,
      mediaCount: null,
    };
  },

  async recentPosts(account, since) {
    const posts: RemotePost[] = [];
    let url: string | undefined = `${GRAPH}/${account.external_id}/videos?${form({
      fields: "id,description,created_time,permalink_url,picture,likes.summary(true).limit(0),comments.summary(true).limit(0)",
      limit: String(PAGE_LIMIT),
      access_token: account.access_token,
    })}`;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const r: Paged<FbVideo> = await http<Paged<FbVideo>>(url);
      let reachedOld = false;
      for (const v of r.data ?? []) {
        const publishedAt = v.created_time ? Date.parse(v.created_time) : null;
        if (publishedAt !== null && publishedAt < since) {
          reachedOld = true;
          break;
        }
        posts.push({
          remoteId: v.id,
          mediaType: "VIDEO",
          caption: v.description ?? null,
          permalink: v.permalink_url ? new URL(v.permalink_url, "https://www.facebook.com").toString() : null,
          thumbnailUrl: v.picture ?? null,
          publishedAt,
          metrics: { ...EMPTY_METRICS, likes: num(v.likes?.summary?.total_count), comments: num(v.comments?.summary?.total_count) },
        });
      }
      url = reachedOld ? undefined : r.paging?.next;
    }
    return { posts, failedMetrics: 0 };
  },
};
