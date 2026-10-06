import { http } from "./common";
import { EMPTY_METRICS, num, type Insights, type RemotePost } from "./insights";
import { API, tt } from "./tiktok";

/*
 * Analítica de TikTok (consultado el 23/09/2026):
 *  - GET  /v2/user/info/   user.info.basic + user.info.profile (username) + user.info.stats (contadores)
 *         developers.tiktok.com/doc/tiktok-api-v2-get-user-info
 *  - POST /v2/video/list/  video.list · máx. 20 por página · SOLO vídeos públicos, del más nuevo al más antiguo
 *         developers.tiktok.com/doc/tiktok-api-v2-video-list
 * Los vídeos privados ("Solo yo", p. ej. los publicados antes de la auditoría) no aparecen: sin métricas.
 */

const MAX_PAGES = 10;
const VIDEO_FIELDS = "id,create_time,cover_image_url,share_url,title,video_description,view_count,like_count,comment_count,share_count";

type TtVideo = {
  id: string;
  create_time?: number;
  cover_image_url?: string;
  share_url?: string;
  title?: string;
  video_description?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

export const tiktokInsights: Insights = {
  readScopes: ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"],

  async profile(account) {
    const r = await http<{
      error?: { code?: string; message?: string };
      data?: {
        user?: {
          display_name?: string;
          avatar_url?: string;
          username?: string;
          follower_count?: number;
          following_count?: number;
          video_count?: number;
        };
      };
    }>(`${API}/user/info/?fields=open_id,display_name,avatar_url,username,follower_count,following_count,video_count`, {
      headers: { Authorization: `Bearer ${account.access_token}` },
    });
    // TikTok responde 200 con un sobre de error: "ok" es el único éxito
    if (r.error?.code && r.error.code !== "ok") throw new Error(`TikTok user/info: ${r.error.code}`);
    const u = r.data?.user ?? {};
    return {
      name: u.display_name,
      avatar: u.avatar_url ?? null,
      followers: num(u.follower_count),
      following: num(u.following_count),
      mediaCount: num(u.video_count),
    };
  },

  async recentPosts(account, since) {
    const posts: RemotePost[] = [];
    let cursor: number | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const d = (await tt(`/video/list/?fields=${VIDEO_FIELDS}`, account.access_token, { max_count: 20, ...(cursor ? { cursor } : {}) })) as {
        videos?: TtVideo[];
        cursor?: number;
        has_more?: boolean;
      };
      let reachedOld = false;
      for (const v of d.videos ?? []) {
        const publishedAt = v.create_time ? v.create_time * 1000 : null;
        if (publishedAt !== null && publishedAt < since) {
          reachedOld = true;
          break;
        }
        posts.push({
          remoteId: v.id,
          mediaType: "VIDEO",
          caption: v.title || v.video_description || null,
          permalink: v.share_url ?? null,
          thumbnailUrl: v.cover_image_url ?? null,
          publishedAt,
          metrics: {
            ...EMPTY_METRICS,
            views: num(v.view_count),
            likes: num(v.like_count),
            comments: num(v.comment_count),
            shares: num(v.share_count),
          },
        });
      }
      if (reachedOld || !d.has_more || d.cursor === undefined) break;
      cursor = d.cursor;
    }
    return { posts, failedMetrics: 0 };
  },
};
