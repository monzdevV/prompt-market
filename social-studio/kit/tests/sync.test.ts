import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { HttpError } from "@/lib/platforms/common";
import { EMPTY_METRICS, type Insights } from "@/lib/platforms/insights";
import { tiktokInsights } from "@/lib/platforms/tiktok-insights";
import { youtubeInsights } from "@/lib/platforms/youtube-insights";
import { createPost } from "@/lib/posts";
import { deleteProviderData, handleSyncAccount, INSIGHTS, purgeStaleYoutubeMetadata, requestSync, scheduleDueSyncs } from "@/lib/sync";
import { makeAccount, makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };
const original = { ...INSIGHTS };

beforeAll(async () => {
  user = await makeUser();
});

afterEach(() => {
  Object.assign(INSIGHTS, original);
  vi.unstubAllGlobals();
  db.prepare("DELETE FROM jobs").run();
});

function fakeInsights(over: Partial<Insights>): Insights {
  return {
    readScopes: [],
    profile: async () => ({ followers: 120, following: 3, mediaCount: 10 }),
    recentPosts: async () => ({ posts: [], failedMetrics: 0 }),
    ...over,
  };
}

function runSync(accountId: number) {
  jobs.enqueue("sync_account", accountId, user.workspaceId);
  const job = jobs.claim("sync_account", 60_000)!;
  return handleSyncAccount(job);
}

const account = (id: number) =>
  db.prepare("SELECT status, sync_status, last_synced_at, last_sync_error, rate_limited_until FROM accounts WHERE id = ?").get(id) as {
    status: string;
    sync_status: string;
    last_synced_at: number | null;
    last_sync_error: string | null;
    rate_limited_until: number | null;
  };

describe("sincronización de analítica", () => {
  it("si el usuario desconecta durante la sincronización, no se vuelven a escribir sus datos", async () => {
    const id = makeAccount(user.workspaceId, "youtube");
    INSIGHTS.youtube = fakeInsights({
      profile: async () => {
        // Mientras esperamos a la red, el usuario desconecta (y se borran los datos de YouTube)
        db.prepare("UPDATE accounts SET status = 'disconnected' WHERE id = ?").run(id);
        deleteProviderData(id);
        return { followers: 5, following: null, mediaCount: 1 };
      },
    });
    expect(await runSync(id)).toEqual({ type: "done" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM account_snapshots WHERE account_id = ?").get(id)).toMatchObject({ n: 0 });
    expect(account(id).sync_status).not.toBe("synced");
  });

  it("un fallo parcial de métricas no borra las que ya teníamos de hoy", async () => {
    const id = makeAccount(user.workspaceId, "instagram");
    const post = (views: number | null) => ({
      remoteId: "keep",
      mediaType: "REELS",
      caption: null,
      permalink: null,
      thumbnailUrl: null,
      publishedAt: Date.now() - 3600_000,
      metrics: { ...EMPTY_METRICS, views, likes: views === null ? null : 2 },
    });
    INSIGHTS.instagram = fakeInsights({ recentPosts: async () => ({ posts: [post(40)], failedMetrics: 0 }) });
    await runSync(id);
    db.prepare("DELETE FROM jobs").run();
    INSIGHTS.instagram = fakeInsights({ recentPosts: async () => ({ posts: [post(null)], failedMetrics: 1 }) });
    await runSync(id);
    const m = db
      .prepare("SELECT m.views FROM post_metrics m JOIN social_posts s ON s.id = m.social_post_id WHERE s.account_id = ?")
      .get(id) as { views: number | null };
    expect(m.views).toBe(40);
  });

  it("una cuenta que falla no se vuelve a programar en cada vuelta del planificador", async () => {
    const id = makeAccount(user.workspaceId, "tiktok");
    INSIGHTS.tiktok = fakeInsights({
      profile: async () => {
        throw new Error("siempre falla");
      },
    });
    await runSync(id);
    db.prepare("DELETE FROM jobs").run();
    scheduleDueSyncs();
    expect(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE kind = 'sync_account' AND ref_id = ?").get(String(id))).toMatchObject({ n: 0 });
  });

  it("guarda la foto del día, las publicaciones y sus métricas (null ≠ 0)", async () => {
    const id = makeAccount(user.workspaceId, "instagram");
    INSIGHTS.instagram = fakeInsights({
      recentPosts: async () => ({
        posts: [
          {
            remoteId: "p1",
            mediaType: "REELS",
            caption: "hola",
            permalink: "https://instagram.com/p/1",
            thumbnailUrl: null,
            publishedAt: Date.now() - 3600_000,
            metrics: { ...EMPTY_METRICS, views: 0, likes: 7 },
          },
        ],
        failedMetrics: 0,
      }),
    });
    expect(await runSync(id)).toEqual({ type: "done" });

    expect(db.prepare("SELECT followers, following, media_count FROM account_snapshots WHERE account_id = ?").get(id)).toMatchObject({
      followers: 120,
      following: 3,
      media_count: 10,
    });
    const m = db
      .prepare("SELECT m.views, m.likes, m.reach FROM post_metrics m JOIN social_posts s ON s.id = m.social_post_id WHERE s.account_id = ?")
      .get(id) as { views: number | null; likes: number | null; reach: number | null };
    expect(m).toEqual({ views: 0, likes: 7, reach: null });
    expect(account(id)).toMatchObject({ sync_status: "synced", last_sync_error: null });
    expect(db.prepare("SELECT status, items_ok FROM sync_runs WHERE account_id = ?").get(id)).toMatchObject({ status: "ok", items_ok: 1 });
  });

  it("vincula la publicación hecha desde la app y actualiza su resumen sin inventar ceros", async () => {
    const id = makeAccount(user.workspaceId, "youtube");
    const postId = createPost(user.workspaceId, user.userId, {
      mediaId: makeMedia(user.workspaceId),
      title: "",
      description: "d",
      hashtags: [],
      targets: [{ accountId: id }],
      scheduledAt: Date.now() + 3600_000,
    });
    db.prepare("UPDATE post_targets SET status = 'published', remote_id = 'yt1' WHERE post_id = ?").run(postId);
    INSIGHTS.youtube = fakeInsights({
      recentPosts: async () => ({
        posts: [{ remoteId: "yt1", mediaType: "VIDEO", caption: null, permalink: null, thumbnailUrl: null, publishedAt: Date.now(), metrics: { ...EMPTY_METRICS, views: 50 } }],
        failedMetrics: 0,
      }),
    });
    await runSync(id);
    const t = db.prepare("SELECT stats FROM post_targets WHERE post_id = ?").get(postId) as { stats: string };
    expect(JSON.parse(t.stats)).toEqual({ views: 50 });
    expect(db.prepare("SELECT target_id FROM social_posts WHERE remote_id = 'yt1'").get()).toMatchObject({ target_id: expect.any(Number) });
  });

  it("si faltan métricas de algunas publicaciones, la sincronización es parcial y lo dice", async () => {
    const id = makeAccount(user.workspaceId, "instagram");
    INSIGHTS.instagram = fakeInsights({ recentPosts: async () => ({ posts: [], failedMetrics: 2 }) });
    await runSync(id);
    expect(account(id).sync_status).toBe("synced");
    expect(account(id).last_sync_error).toMatch(/2 publicaciones/);
    expect(db.prepare("SELECT status FROM sync_runs WHERE account_id = ?").get(id)).toMatchObject({ status: "partial" });
  });

  it("permiso caducado: la cuenta pasa a reconectar y el panel no se rompe", async () => {
    const id = makeAccount(user.workspaceId, "tiktok");
    INSIGHTS.tiktok = fakeInsights({
      profile: async () => {
        throw new HttpError(401, "401 access_token_invalid");
      },
    });
    expect(await runSync(id)).toEqual({ type: "done" });
    expect(account(id)).toMatchObject({ status: "needs_reauth", sync_status: "error" });
  });

  it("límite de uso de la red: pausa y no se vuelve a encolar hasta que pase", async () => {
    const id = makeAccount(user.workspaceId, "tiktok");
    INSIGHTS.tiktok = fakeInsights({
      profile: async () => {
        throw new HttpError(429, "429 rate_limit_exceeded");
      },
    });
    await runSync(id);
    const a = account(id);
    expect(a.sync_status).toBe("rate_limited");
    expect(a.rate_limited_until).toBeGreaterThan(Date.now());
    db.prepare("DELETE FROM jobs").run();
    scheduleDueSyncs();
    expect(db.prepare("SELECT 1 FROM jobs WHERE kind = 'sync_account' AND ref_id = ?").get(String(id))).toBeUndefined();
  });

  it("el planificador encola solo cuentas activas con la sincronización caducada", () => {
    const fresh = makeAccount(user.workspaceId, "instagram");
    const stale = makeAccount(user.workspaceId, "instagram");
    db.prepare("UPDATE accounts SET last_synced_at = ? WHERE id = ?").run(Date.now(), fresh);
    db.prepare("UPDATE accounts SET last_synced_at = 0 WHERE id = ?").run(stale);
    scheduleDueSyncs();
    const queued = (db.prepare("SELECT ref_id FROM jobs WHERE kind = 'sync_account'").all() as { ref_id: string }[]).map((r) => r.ref_id);
    expect(queued).toContain(String(stale));
    expect(queued).not.toContain(String(fresh));
  });

  it("sincronizar a petición solo encola cuentas del propio espacio", async () => {
    const other = await makeUser();
    const foreign = makeAccount(other.workspaceId, "instagram");
    requestSync(user.workspaceId, [foreign]);
    expect(db.prepare("SELECT 1 FROM jobs WHERE ref_id = ?").get(String(foreign))).toBeUndefined();
  });

  it("política de YouTube: metadatos de más de 30 días se borran y al desconectar se borra todo", async () => {
    const id = makeAccount(user.workspaceId, "youtube");
    INSIGHTS.youtube = fakeInsights({
      recentPosts: async () => ({
        posts: [{ remoteId: "old", mediaType: "VIDEO", caption: "título", permalink: null, thumbnailUrl: "https://i.ytimg.com/x.jpg", publishedAt: 1, metrics: { ...EMPTY_METRICS, views: 5 } }],
        failedMetrics: 0,
      }),
    });
    await runSync(id);
    db.prepare("UPDATE social_posts SET fetched_at = 0 WHERE account_id = ?").run(id);
    purgeStaleYoutubeMetadata();
    expect(db.prepare("SELECT caption, thumbnail_url FROM social_posts WHERE account_id = ?").get(id)).toEqual({ caption: null, thumbnail_url: null });
    deleteProviderData(id);
    expect(db.prepare("SELECT COUNT(*) AS n FROM social_posts WHERE account_id = ?").get(id)).toMatchObject({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM account_snapshots WHERE account_id = ?").get(id)).toMatchObject({ n: 0 });
  });
});

describe("lectura de las APIs (respuestas con la forma documentada)", () => {
  const acc = { id: 1, access_token: "tok", external_id: "x" } as never;

  it("TikTok: perfil con estadísticas y vídeos paginados hasta la fecha pedida", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes("/user/info/")) {
          return Response.json({ data: { user: { display_name: "Ana", follower_count: 1500, following_count: 20, video_count: 33 } }, error: { code: "ok" } });
        }
        const page = calls.filter((u) => u.includes("/video/list/")).length;
        const now = Math.floor(Date.now() / 1000);
        return Response.json({
          data: {
            videos: page === 1 ? [{ id: "v1", create_time: now, view_count: 10, like_count: 0 }] : [{ id: "v0", create_time: 1 }],
            cursor: 123,
            has_more: true,
          },
          error: { code: "ok" },
        });
      }),
    );
    expect(await tiktokInsights.profile(acc)).toMatchObject({ followers: 1500, following: 20, mediaCount: 33 });
    const { posts } = await tiktokInsights.recentPosts(acc, Date.now() - 86400_000);
    expect(posts.map((p) => p.remoteId)).toEqual(["v1"]);
    expect(posts[0].metrics).toMatchObject({ views: 10, likes: 0, comments: null, shares: null });
  });

  it("YouTube: suscriptores ocultos = no disponible (no 0) y estadísticas por lotes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/channels")) {
          return Response.json({
            items: [{ id: "UC1", snippet: { title: "Canal" }, statistics: { hiddenSubscriberCount: true, videoCount: "4" }, contentDetails: { relatedPlaylists: { uploads: "UU1" } } }],
          });
        }
        if (url.includes("youtubeanalytics")) return new Response("{}", { status: 403 });
        if (url.includes("/playlistItems")) {
          return Response.json({ items: [{ contentDetails: { videoId: "a", videoPublishedAt: new Date().toISOString() }, snippet: { title: "A" } }] });
        }
        return Response.json({ items: [{ id: "a", statistics: { viewCount: "99", likeCount: "3" } }] });
      }),
    );
    const profile = await youtubeInsights.profile(acc);
    expect(profile.followers).toBeNull();
    expect(profile.mediaCount).toBe(4);
    const { posts } = await youtubeInsights.recentPosts(acc, 0);
    expect(posts[0].metrics).toMatchObject({ views: 99, likes: 3, comments: null });
  });
});
