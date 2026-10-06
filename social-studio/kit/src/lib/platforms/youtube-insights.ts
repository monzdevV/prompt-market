import { http, HttpError } from "./common";
import { dayKey, EMPTY_METRICS, num, type Insights, type RemotePost } from "./insights";

/*
 * Analítica de YouTube (consultado el 23/09/2026):
 *  - channels.list (1 unidad):      developers.google.com/youtube/v3/docs/channels/list
 *  - playlistItems.list (1/página): developers.google.com/youtube/v3/docs/playlistItems/list  (se evita search.list: cuota aparte de 100/día)
 *  - videos.list (1 por lote de ids): developers.google.com/youtube/v3/docs/videos/list
 *  - YouTube Analytics reports.query: developers.google.com/youtube/analytics/reference/reports/query (datos con 48-72 h de retraso)
 * Política de datos (Developer Policies III.E.4): estadísticas mientras dure el consentimiento; títulos, miniaturas
 * y demás metadatos se refrescan o borran como máximo cada 30 días (lo hace la sincronización y la purga).
 */

const DATA = "https://www.googleapis.com/youtube/v3";
const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";
const MAX_PAGES = 10;
const ANALYTICS_DELAY_DAYS = 3;

const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

type Channel = {
  id: string;
  snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

async function myChannel(token: string) {
  const r = await http<{ items?: Channel[] }>(`${DATA}/channels?part=snippet,statistics,contentDetails&mine=true`, auth(token));
  const ch = r.items?.[0];
  if (!ch) throw new Error("La cuenta de Google no tiene canal de YouTube");
  return ch;
}

export const youtubeInsights: Insights = {
  readScopes: ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly"],

  async profile(account) {
    const ch = await myChannel(account.access_token);
    // Métricas diarias del canal (con el retraso que indica YouTube)
    let daily = null;
    const day = dayKey(Date.now() - ANALYTICS_DELAY_DAYS * 24 * 3600_000, "UTC");
    try {
      const q = new URLSearchParams({
        ids: "channel==MINE",
        startDate: day,
        endDate: day,
        dimensions: "day",
        metrics: "views,estimatedMinutesWatched,likes,comments,shares",
      });
      const r = await http<{ columnHeaders?: { name: string }[]; rows?: unknown[][] }>(`${ANALYTICS}?${q}`, auth(account.access_token));
      const cols = (r.columnHeaders ?? []).map((c) => c.name);
      const row = r.rows?.[0];
      if (row) {
        const get = (name: string) => num(row[cols.indexOf(name)]);
        const minutes = get("estimatedMinutesWatched");
        daily = {
          day,
          metrics: {
            views: get("views"),
            likes: get("likes"),
            comments: get("comments"),
            shares: get("shares"),
            watchTimeS: minutes === null ? null : Math.round(minutes * 60),
          },
        };
      }
    } catch (e) {
      // Sin el permiso de analítica (cuentas conectadas antes) o sin datos todavía: no disponible
      if (e instanceof HttpError && e.status === 401) throw e;
    }
    const hidden = ch.statistics?.hiddenSubscriberCount === true;
    return {
      name: ch.snippet?.title,
      avatar: ch.snippet?.thumbnails?.default?.url ?? null,
      followers: hidden ? null : num(ch.statistics?.subscriberCount),
      following: null,
      mediaCount: num(ch.statistics?.videoCount),
      daily,
    };
  },

  async recentPosts(account, since) {
    const tok = account.access_token;
    const uploads = (await myChannel(tok)).contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return { posts: [], failedMetrics: 0 };

    const found: { id: string; publishedAt: number | null; title: string | null; thumb: string | null }[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const q = new URLSearchParams({ part: "snippet,contentDetails", playlistId: uploads, maxResults: "50" });
      if (pageToken) q.set("pageToken", pageToken);
      const r = await http<{
        items?: { contentDetails?: { videoId?: string; videoPublishedAt?: string }; snippet?: { title?: string; thumbnails?: { medium?: { url?: string } } } }[];
        nextPageToken?: string;
      }>(`${DATA}/playlistItems?${q}`, auth(tok));
      let reachedOld = false;
      for (const it of r.items ?? []) {
        const id = it.contentDetails?.videoId;
        if (!id) continue;
        const publishedAt = it.contentDetails?.videoPublishedAt ? Date.parse(it.contentDetails.videoPublishedAt) : null;
        if (publishedAt !== null && publishedAt < since) {
          reachedOld = true;
          break;
        }
        found.push({ id, publishedAt, title: it.snippet?.title ?? null, thumb: it.snippet?.thumbnails?.medium?.url ?? null });
      }
      pageToken = r.nextPageToken;
      if (reachedOld || !pageToken) break;
    }

    // Estadísticas por lotes de 50 ids (1 unidad por llamada)
    const stats = new Map<string, { viewCount?: string; likeCount?: string; commentCount?: string }>();
    for (let i = 0; i < found.length; i += 50) {
      const ids = found.slice(i, i + 50).map((v) => v.id);
      const r = await http<{ items?: { id: string; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }>(
        `${DATA}/videos?part=statistics&id=${ids.map(encodeURIComponent).join(",")}`,
        auth(tok),
      );
      for (const v of r.items ?? []) if (v.statistics) stats.set(v.id, v.statistics);
    }

    const posts: RemotePost[] = found.map((v) => {
      const s = stats.get(v.id);
      return {
        remoteId: v.id,
        mediaType: "VIDEO",
        caption: v.title,
        permalink: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnailUrl: v.thumb,
        publishedAt: v.publishedAt,
        // Si el canal oculta los me gusta o desactiva comentarios, YouTube no devuelve el campo: no disponible
        metrics: { ...EMPTY_METRICS, views: num(s?.viewCount), likes: num(s?.likeCount), comments: num(s?.commentCount) },
      };
    });
    return { posts, failedMetrics: found.length - stats.size };
  },
};
