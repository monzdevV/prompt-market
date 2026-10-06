import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { upsertAccount } from "@/lib/accounts";
import { db, type Media, type Target } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { mediaFilePath } from "@/lib/media";
import { connectUrl, isRelayed, profileName, syncRelayedAccounts } from "@/lib/platforms/uploadpost";
import { createPost } from "@/lib/posts";
import { handlePublishTarget } from "@/lib/publisher";
import { handleSyncAccount, requestSync } from "@/lib/sync";
import { makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };

beforeAll(async () => {
  process.env.UPLOAD_POST_API_KEY = "clave-de-prueba";
  delete process.env.UPLOAD_POST_PROFILE;
  delete process.env.TIKTOK_AUDITED;
  delete process.env.TIKTOK_ALLOW_SCHEDULING;
  process.env.APP_URL = "https://easypop.test";
  user = await makeUser();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Call = { url: string; init: RequestInit };

/** Simula la API de Upload-Post: cada petición se responde con la primera regla que coincide. */
function api(routes: [RegExp, (call: Call) => { status?: number; body: unknown }][]) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const call = { url: String(url), init };
    calls.push(call);
    const route = routes.find(([re]) => re.test(`${init.method ?? "GET"} ${url}`));
    if (!route) throw new Error(`Petición inesperada: ${init.method ?? "GET"} ${url}`);
    const { status = 200, body } = route[1](call);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  return calls;
}

function relayedAccount(platform: "tiktok" | "youtube" | "instagram" | "facebook" | "x", extra: Record<string, unknown> = {}) {
  return upsertAccount(user.workspaceId, {
    platform,
    external_id: `up:${platform}-${Math.random().toString(36).slice(2)}`,
    name: `${platform} por Upload-Post`,
    access_token: "upload-post",
    meta: { via: "uploadpost", profile: profileName(user.workspaceId), ...extra },
  });
}

/** Vídeo con fichero de verdad en disco (se envía en el formulario). */
function mediaWithFile() {
  const id = makeMedia(user.workspaceId);
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(id) as Media;
  fs.mkdirSync(path.dirname(mediaFilePath(media)), { recursive: true });
  fs.writeFileSync(mediaFilePath(media), Buffer.from("vídeo falso"));
  return id;
}

const TIKTOK_OPTIONS = {
  privacyLevel: "PUBLIC_TO_EVERYONE",
  allowComment: true,
  allowDuet: false,
  allowStitch: true,
  commercial: { enabled: false, yourBrand: false, brandedContent: false },
};

function postTo(accountId: number, options?: unknown, scheduledAt: number | null = null) {
  const postId = createPost(user.workspaceId, user.userId, {
    mediaId: mediaWithFile(),
    title: "Mi vídeo",
    description: "Texto del vídeo",
    hashtags: ["uno"],
    targets: [{ accountId, options }],
    scheduledAt,
  });
  const target = db.prepare("SELECT * FROM post_targets WHERE post_id = ?").get(postId) as Target;
  return { postId, targetId: target.id };
}

const target = (id: number) => db.prepare("SELECT * FROM post_targets WHERE id = ?").get(id) as Target;
const claim = () => jobs.claim("publish_target", 60_000)!;

describe("Upload-Post: conexión de cuentas", () => {
  it("el enlace de conexión lleva el logo, el idioma y la vuelta a easypop", async () => {
    const calls = api([
      [/GET .*\/api\/uploadposts\/users\/ep-/, () => ({ status: 404, body: { success: false, message: "Profile not found" } })],
      [/POST .*\/api\/uploadposts\/users$/, () => ({ status: 201, body: { success: true } })],
      [/generate-jwt/, () => ({ body: { access_url: "https://app.upload-post.com/connect?token=abc", success: true } })],
    ]);
    expect(await connectUrl(user.workspaceId)).toBe("https://app.upload-post.com/connect?token=abc");
    // No existía: se crea y luego se pide el enlace
    expect(calls.map((c) => c.init.method ?? "GET")).toEqual(["GET", "POST", "POST"]);
    const jwt = JSON.parse(String(calls[2].init.body));
    expect(jwt).toMatchObject({
      username: `ep-${user.workspaceId}`,
      language: "es",
      redirect_url: "https://easypop.test/api/uploadpost/return",
      logo_image: "https://easypop.test/brand/manny-mark.png",
      platforms: ["instagram", "youtube", "facebook", "x"],
    });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Apikey clave-de-prueba");
  });

  it("si el perfil ya existe no intenta crearlo (Upload-Post respondería 403 con el cupo lleno)", async () => {
    const calls = api([
      [/GET .*\/api\/uploadposts\/users\/ep-/, () => ({ body: { success: true, profile: { social_accounts: {} } } })],
      [/POST .*\/api\/uploadposts\/users$/, () => ({ status: 403, body: { success: false, error_code: "PROFILE_LIMIT_REACHED" } })],
      [/generate-jwt/, () => ({ body: { access_url: "https://app.upload-post.com/connect?token=x" } })],
    ]);
    await expect(connectUrl(user.workspaceId)).resolves.toContain("upload-post.com");
    expect(calls.some((c) => c.init.method === "POST" && /\/users$/.test(c.url))).toBe(false);
  });

  it("carrera: si se creó entre medias (409) tampoco es un error", async () => {
    api([
      [/GET .*\/api\/uploadposts\/users\/ep-/, () => ({ status: 404, body: {} })],
      [/POST .*\/api\/uploadposts\/users$/, () => ({ status: 409, body: { success: false } })],
      [/generate-jwt/, () => ({ body: { access_url: "https://app.upload-post.com/connect?token=x" } })],
    ]);
    await expect(connectUrl(user.workspaceId)).resolves.toContain("upload-post.com");
  });

  it("no redirige a un dominio que no sea de Upload-Post", async () => {
    api([
      [/GET .*\/api\/uploadposts\/users\/ep-/, () => ({ body: { success: true } })],
      [/generate-jwt/, () => ({ body: { access_url: "https://malo.example/connect" } })],
    ]);
    await expect(connectUrl(user.workspaceId)).rejects.toThrow();
  });

  it("trae las redes conectadas (Facebook: una por Página), ignora TikTok y quita las que se desconectaron allí", async () => {
    const u = await makeUser();
    let instagramConnected = true;
    api([
      [
        /GET .*\/api\/uploadposts\/users\/ep-/,
        () => ({
          body: {
            success: true,
            profile: {
              social_accounts: {
                instagram: instagramConnected ? { username: "1789", handle: "pepe", display_name: "Pepe", social_images: "https://cdn/a.jpg" } : "",
                // TikTok va con nuestra propia app: aunque esté conectado en Upload-Post, no se usa por esta vía
                tiktok: { username: "open-id-1", handle: "pepe_tt", display_name: "Pepe TT" },
                facebook: { display_name: "Pepe FB" },
              },
            },
          },
        }),
      ],
      [/facebook\/pages/, () => ({ body: { pages: [{ page_id: "123", page_name: "Mi Página", profile: "x" }] } })],
    ]);
    const first = await syncRelayedAccounts(u.workspaceId);
    expect(first.ids).toHaveLength(2);
    const rows = db.prepare("SELECT platform, external_id, name, avatar, status, meta FROM accounts WHERE workspace_id = ? ORDER BY platform").all(u.workspaceId) as {
      platform: string;
      external_id: string;
      name: string;
      avatar: string | null;
      status: string;
      meta: string;
    }[];
    expect(rows.map((r) => [r.platform, r.external_id, r.name, r.status])).toEqual([
      ["facebook", "up:fb:123", "Mi Página", "active"],
      ["instagram", "up:1789", "Pepe", "active"],
    ]);
    expect(JSON.parse(rows[0].meta)).toMatchObject({ via: "uploadpost", pageId: "123" });
    expect(rows[1].avatar).toBe("https://cdn/a.jpg");
    expect(rows.every((r) => isRelayed(r))).toBe(true);

    instagramConnected = false;
    const second = await syncRelayedAccounts(u.workspaceId);
    expect(second.removed).toHaveLength(1);
    const instagram = db.prepare("SELECT status FROM accounts WHERE workspace_id = ? AND platform = 'instagram'").get(u.workspaceId) as { status: string };
    expect(instagram.status).toBe("disconnected");
  });
});

describe("Upload-Post: publicar", () => {
  it("TikTok por Upload-Post admite público y programar aunque la app propia no esté auditada", () => {
    const accountId = relayedAccount("tiktok");
    expect(() => postTo(accountId, TIKTOK_OPTIONS, Date.now() + 3 * 3600_000)).not.toThrow();
  });

  it("envía el vídeo con las opciones de TikTok, espera el resultado y guarda el enlace", async () => {
    // Quita de la cola lo que dejaron los tests anteriores
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const accountId = relayedAccount("tiktok");
    const { targetId } = postTo(accountId, TIKTOK_OPTIONS);
    let polls = 0;
    const calls = api([
      [/POST .*\/api\/upload$/, () => ({ body: { success: true, request_id: "srv" } })],
      [
        /status\?request_id=/,
        () =>
          ++polls === 1
            ? { body: { status: "in_progress", results: [{ platform: "tiktok", success: true, message: "Queued", status: "processing" }] } }
            : { body: { status: "completed", results: [{ platform: "tiktok", success: true, status: "completed", url: "https://www.tiktok.com/@pepe/video/9", post_id: "9" }] } },
      ],
    ]);

    const job = claim();
    expect(await handlePublishTarget(job)).toMatchObject({ type: "wait" });
    const upload = calls[0];
    const form = upload.init.body as FormData;
    const requestId = form.get("request_id");
    expect((upload.init.headers as Record<string, string>)["Idempotency-Key"]).toBe(requestId);
    expect(form.get("platform[]")).toBe("tiktok");
    expect(form.get("privacy_level")).toBe("PUBLIC_TO_EVERYONE");
    expect(form.get("disable_duet")).toBe("true");
    expect(form.get("disable_comment")).toBe("false");
    expect(form.get("tiktok_title")).toBe("Texto del vídeo\n\n#uno");
    expect(form.get("async_upload")).toBe("true");
    expect(form.get("video")).toBeInstanceOf(Blob);

    expect(await handlePublishTarget(job)).toMatchObject({ type: "wait" });
    expect(await handlePublishTarget(job)).toEqual({ type: "done" });
    expect(target(targetId)).toMatchObject({ status: "published", remote_id: "9", remote_url: "https://www.tiktok.com/@pepe/video/9" });
    // No se volvió a enviar el vídeo mientras se esperaba
    expect(calls.filter((c) => /\/api\/upload$/.test(c.url))).toHaveLength(1);
  });

  it("Facebook: publica en la Página guardada con el formato elegido", async () => {
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const accountId = relayedAccount("facebook", { pageId: "555" });
    const { targetId } = postTo(accountId, { format: "video" });
    const calls = api([[/POST .*\/api\/upload$/, () => ({ body: { success: true, results: { facebook: { success: true, url: "https://facebook.com/v/1", post_id: "1" } } } })]]);
    expect(await handlePublishTarget(claim())).toEqual({ type: "done" });
    const form = calls[0].init.body as FormData;
    expect(form.get("facebook_page_id")).toBe("555");
    expect(form.get("facebook_media_type")).toBe("VIDEO");
    expect(target(targetId)).toMatchObject({ status: "published", remote_url: "https://facebook.com/v/1" });
  });

  it("si Upload-Post rechaza la petición (4xx) queda como error reintentable, no «por revisar»", async () => {
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const { targetId } = postTo(relayedAccount("youtube"), { format: "video" });
    api([[/POST .*\/api\/upload$/, () => ({ status: 400, body: { success: false, message: "Invalid video" } })]]);
    expect(await handlePublishTarget(claim())).toEqual({ type: "done" });
    expect(target(targetId).status).toBe("failed");
    expect(target(targetId).error).toContain("Invalid video");
  });

  it("una clave de API mala no marca la cuenta del cliente como «reconectar»", async () => {
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const accountId = relayedAccount("youtube");
    const { targetId } = postTo(accountId, { format: "video" });
    api([[/POST .*\/api\/upload$/, () => ({ status: 401, body: { success: false, message: "Invalid or expired token" } })]]);
    await handlePublishTarget(claim());
    expect(target(targetId).status).toBe("failed");
    expect((db.prepare("SELECT status FROM accounts WHERE id = ?").get(accountId) as { status: string }).status).toBe("active");
  });

  it("si Upload-Post pierde el rastro del envío, queda «por revisar» (nunca se reenvía a ciegas)", async () => {
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const { targetId } = postTo(relayedAccount("youtube"), { format: "video" });
    api([
      [/POST .*\/api\/upload$/, () => ({ body: { success: true, request_id: "srv" } })],
      [/status\?request_id=/, () => ({ body: { status: "failed", message: "no activity for over 1 hour", results: [] } })],
    ]);
    const job = claim();
    await handlePublishTarget(job);
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("needs_review");
  });

  it("X: se sube como «twitter» con el texto en x_title y el resultado llega como «x»", async () => {
    db.prepare("DELETE FROM jobs WHERE kind = 'publish_target'").run();
    const { targetId } = postTo(relayedAccount("x"), { format: "video" });
    const calls = api([
      [/POST .*\/api\/upload$/, () => ({ body: { success: true, request_id: "srv" } })],
      [/status\?request_id=/, () => ({ body: { status: "completed", results: [{ platform: "x", success: true, status: "completed", url: "https://x.com/pepe/status/1", post_id: "1" }] } })],
    ]);
    const job = claim();
    await handlePublishTarget(job);
    const form = calls[0].init.body as FormData;
    expect(form.get("platform[]")).toBe("twitter");
    expect(form.get("x_title")).toBe("Texto del vídeo\n\n#uno");
    expect(await handlePublishTarget(job)).toEqual({ type: "done" });
    expect(target(targetId)).toMatchObject({ status: "published", remote_url: "https://x.com/pepe/status/1" });
  });

  it("X: no deja programar textos de más de 280 caracteres ni vídeos de más de 2:20", () => {
    const accountId = relayedAccount("x");
    const long = () =>
      createPost(user.workspaceId, user.userId, {
        mediaId: mediaWithFile(),
        title: "t",
        description: "a".repeat(281),
        hashtags: [],
        targets: [{ accountId, options: { format: "video" } }],
        scheduledAt: null,
      });
    expect(long).toThrow(/X/);
    const mediaId = mediaWithFile();
    db.prepare("UPDATE media SET duration_s = 200 WHERE id = ?").run(mediaId);
    expect(() =>
      createPost(user.workspaceId, user.userId, {
        mediaId,
        title: "t",
        description: "corto",
        hashtags: [],
        targets: [{ accountId, options: { format: "video" } }],
        scheduledAt: null,
      }),
    ).toThrow();
  });

  it("X conectado en Upload-Post aparece como cuenta de X", async () => {
    const u = await makeUser();
    api([
      [/GET .*\/api\/uploadposts\/users\/ep-/, () => ({ body: { profile: { social_accounts: { x: { username: "44", handle: "pepe", display_name: "Pepe" } } } } })],
    ]);
    await syncRelayedAccounts(u.workspaceId);
    expect(db.prepare("SELECT platform, external_id, name FROM accounts WHERE workspace_id = ?").all(u.workspaceId)).toEqual([
      { platform: "x", external_id: "up:44", name: "Pepe" },
    ]);
  });
});

describe("Upload-Post: estadísticas", () => {
  it("lee seguidores, la serie diaria y las métricas de lo publicado por easypop", async () => {
    const u = await makeUser();
    const accountId = upsertAccount(u.workspaceId, {
      platform: "youtube",
      external_id: "up:UC1",
      name: "Canal",
      access_token: "upload-post",
      meta: { via: "uploadpost", profile: `ep-${u.workspaceId}` },
    });
    // Una publicación ya hecha por Upload-Post (con su request_id guardado)
    const mediaId = makeMedia(u.workspaceId);
    const postId = createPost(u.workspaceId, u.userId, { mediaId, title: "t", description: "d", hashtags: [], targets: [{ accountId, options: { format: "video" } }], scheduledAt: null });
    db.prepare(
      "UPDATE post_targets SET status = 'published', remote_id = 'vid1', remote_url = 'https://youtu.be/vid1', published_at = ?, remote_ref = ? WHERE post_id = ?",
    ).run(Date.now() - 3600_000, JSON.stringify({ requestId: "req-1", accepted: true }), postId);
    db.prepare("DELETE FROM jobs").run();

    const calls = api([
      [
        /\/api\/analytics\/ep-/,
        () => ({ body: { youtube: { followers: 1500, metric_type: "views", reach_timeseries: [{ date: "2026-09-22", value: 320 }] } } }),
      ],
      [/post-analytics\/req-1/, () => ({ body: { platforms: { youtube: { post_metrics: { views: 5200, likes: 120, comments: 8 } } } } })],
    ]);
    expect(requestSync(u.workspaceId, [accountId])).toBe(1);
    const job = jobs.claim("sync_account", 60_000)!;
    expect(await handleSyncAccount(job)).toEqual({ type: "done" });

    expect(calls[0].url).toContain("platforms=youtube");
    const snap = db.prepare("SELECT followers, views FROM account_snapshots WHERE account_id = ? AND day = '2026-09-22'").get(accountId);
    expect(snap).toMatchObject({ views: 320 });
    const latest = db.prepare("SELECT followers FROM account_snapshots WHERE account_id = ? AND followers IS NOT NULL").get(accountId);
    expect(latest).toMatchObject({ followers: 1500 });
    const stats = db.prepare("SELECT stats FROM post_targets WHERE post_id = ?").get(postId) as { stats: string };
    expect(JSON.parse(stats.stats)).toEqual({ views: 5200, likes: 120, comments: 8 });
    expect(db.prepare("SELECT sync_status, last_sync_error FROM accounts WHERE id = ?").get(accountId)).toMatchObject({ sync_status: "synced", last_sync_error: null });
  });
});

