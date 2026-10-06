import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db, UPLOAD_DIR, type Media, type Target } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { onMediaJobDead } from "@/lib/media-processing";
import { http, HttpError, RejectedError, type Publisher, type PublishContext } from "@/lib/platforms/common";
import { publishers } from "@/lib/platforms";
import { createPost, retryFailed } from "@/lib/posts";
import { handlePublishTarget, onPublishJobDead } from "@/lib/publisher";
import { makeAccount, makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };
const originals = { ...publishers };

beforeAll(async () => {
  user = await makeUser();
});

afterEach(() => {
  Object.assign(publishers, originals);
  vi.unstubAllGlobals();
  db.prepare("DELETE FROM jobs").run();
});

function setup(platform: "youtube" | "tiktok" = "youtube") {
  const accountId = makeAccount(user.workspaceId, platform);
  const mediaId = makeMedia(user.workspaceId);
  const tiktokOptions = {
    privacyLevel: "SELF_ONLY",
    allowComment: true,
    allowDuet: false,
    allowStitch: false,
    commercial: { enabled: false, yourBrand: false, brandedContent: false },
  };
  const postId = createPost(user.workspaceId, user.userId, {
    mediaId,
    title: "t",
    description: "d",
    hashtags: [],
    targets: [{ accountId, options: platform === "tiktok" ? tiktokOptions : undefined }],
    scheduledAt: null,
  });
  const target = db.prepare("SELECT * FROM post_targets WHERE post_id = ?").get(postId) as Target;
  return { accountId, postId, mediaId, targetId: target.id, job: jobs.claim("publish_target", 60_000)! };
}

const target = (id: number) => db.prepare("SELECT * FROM post_targets WHERE id = ?").get(id) as Target;

function fake(platform: "youtube" | "tiktok", publish: (ctx: PublishContext) => ReturnType<Publisher["publish"]>) {
  publishers[platform] = { publish };
}

describe("nunca publicar dos veces", () => {
  it("un fallo inesperado después de empezar a publicar deja el destino para revisar", async () => {
    fake("youtube", async (ctx) => {
      ctx.saveRef({ committed: true });
      throw new TypeError("fetch failed");
    });
    const { targetId, postId, job } = setup();
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("needs_review");
    expect(() => retryFailed(user.workspaceId, postId)).toThrow(/No hay destinos con error/);
  });

  it("un 401 después de empezar a publicar también queda para revisar (y la cuenta pide reconectar)", async () => {
    fake("youtube", async (ctx) => {
      ctx.saveRef({ committed: true });
      throw new HttpError(401, "401 token caducado");
    });
    const { targetId, accountId, job } = setup();
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("needs_review");
    expect(db.prepare("SELECT status FROM accounts WHERE id = ?").get(accountId)).toMatchObject({ status: "needs_reauth" });
  });

  it("si la red confirma el rechazo, queda como error y se puede reintentar", async () => {
    fake("youtube", async (ctx) => {
      ctx.saveRef({ committed: true });
      throw new RejectedError("TikTok rechazó el vídeo: duración");
    });
    const { targetId, postId, job } = setup();
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("failed");
    retryFailed(user.workspaceId, postId);
    expect(target(targetId)).toMatchObject({ status: "pending", remote_ref: null });
  });

  it("si la cuenta pierde el permiso mientras la red procesa, queda para revisar (no en error)", async () => {
    fake("tiktok", async (ctx) => {
      ctx.saveRef({ committed: true, uploaded: true });
      return { status: "wait", ms: 10 };
    });
    const { targetId, accountId, job } = setup("tiktok");
    expect((await handlePublishTarget(job)).type).toBe("wait");
    db.prepare("UPDATE accounts SET status = 'needs_reauth' WHERE id = ?").run(accountId);
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("needs_review");
  });
});

describe("nada se queda colgado", () => {
  it("un trabajo de publicación muerto deja el destino en error o para revisar, nunca 'publicando'", async () => {
    const a = setup();
    db.prepare("UPDATE post_targets SET status = 'publishing' WHERE id = ?").run(a.targetId);
    onPublishJobDead(a.job, "error interno");
    expect(target(a.targetId).status).toBe("failed");

    const b = setup();
    db.prepare("UPDATE post_targets SET status = 'publishing', remote_ref = ? WHERE id = ?").run('{"committed":true}', b.targetId);
    onPublishJobDead(b.job, "error interno");
    expect(target(b.targetId).status).toBe("needs_review");
  });

  it("un vídeo cuyo trabajo muere pasa a error y se puede reintentar", () => {
    const mediaId = makeMedia(user.workspaceId);
    db.prepare("UPDATE media SET status = 'transcribing' WHERE id = ?").run(mediaId);
    onMediaJobDead({ ref_id: mediaId });
    expect((db.prepare("SELECT status FROM media WHERE id = ?").get(mediaId) as Media).status).toBe("error");
  });

  it("un trabajo que tumba el proceso una y otra vez se da por perdido", () => {
    jobs.enqueue("process_media", "m-crash", user.workspaceId);
    const j = jobs.claim("process_media", 60_000, "w1")!;
    db.prepare("UPDATE jobs SET attempts = max_attempts, locked_until = 0 WHERE id = ?").run(j.id);
    expect(jobs.claim("process_media", 60_000, "w2")).toBeUndefined();
    const dead = jobs.reapExhausted();
    expect(dead.map((d) => d.id)).toEqual([j.id]);
    expect(db.prepare("SELECT status FROM jobs WHERE id = ?").get(j.id)).toMatchObject({ status: "failed" });
  });
});

describe("errores de las redes", () => {
  it("clasifica los errores de Meta que llegan como 400", async () => {
    const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 400 }));
    vi.stubGlobal("fetch", reply({ error: { message: "Too many calls", code: 4 } }));
    await expect(http("https://graph.facebook.com/x")).rejects.toMatchObject({ retryable: true });
    vi.stubGlobal("fetch", reply({ error: { message: "temporal", code: 99, is_transient: true } }));
    await expect(http("https://graph.facebook.com/x")).rejects.toMatchObject({ retryable: true });
    vi.stubGlobal("fetch", reply({ error: { message: "Session expired", code: 190 } }));
    await expect(http("https://graph.facebook.com/x")).rejects.toMatchObject({ auth: true, retryable: false });
    vi.stubGlobal("fetch", reply({ error: { message: "Invalid parameter", code: 100 } }));
    await expect(http("https://graph.facebook.com/x")).rejects.toMatchObject({ retryable: false, auth: false });
  });
});

describe("YouTube reanuda la subida en vez de repetirla", () => {
  const SESSION = "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc";

  function ctxFor(ref: Record<string, unknown>) {
    const mediaId = makeMedia(user.workspaceId);
    const media = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Media;
    const filePath = path.join(UPLOAD_DIR, media.filename);
    fs.writeFileSync(filePath, Buffer.alloc(1000, 1));
    const saved: Record<string, unknown>[] = [];
    return {
      saved,
      ctx: {
        account: { id: 1, access_token: "tok" },
        post: { title: "t" },
        media,
        filePath,
        caption: "c",
        hashtags: [],
        options: {},
        cover: { path: null, offsetMs: null },
        ref,
        saveRef: (p: Record<string, unknown>) => {
          Object.assign(ref, p);
          saved.push(p);
        },
      } as unknown as PublishContext,
    };
  }

  it("si la sesión ya terminó, devuelve el vídeo sin volver a subir", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "vid1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { ctx } = ctxFor({ uploadUrl: SESSION, committed: true });
    await expect(originals.youtube.publish(ctx)).resolves.toMatchObject({ status: "done", remoteId: "vid1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si la subida quedó a medias (308 + Range), continúa desde el byte siguiente", async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push(init);
        if (calls.length === 1) return new Response(null, { status: 308, headers: { Range: "bytes=0-399" } });
        return new Response(JSON.stringify({ id: "vid2" }), { status: 201 });
      }),
    );
    const { ctx } = ctxFor({ uploadUrl: SESSION, committed: true });
    await expect(originals.youtube.publish(ctx)).resolves.toMatchObject({ remoteId: "vid2" });
    expect((calls[1].headers as Record<string, string>)["Content-Range"]).toBe("bytes 400-999/1000");
    expect((calls[1].body as Blob).size).toBe(600);
  });

  it("si la sesión caducó (404), empieza una nueva: YouTube no llegó a crear el vídeo", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        if (urls.length === 1) return new Response(null, { status: 404 });
        if (urls.length === 2) return new Response(null, { status: 200, headers: { Location: `${SESSION}&n=2` } });
        return new Response(JSON.stringify({ id: "vid3" }), { status: 200 });
      }),
    );
    const { ctx, saved } = ctxFor({ uploadUrl: SESSION, committed: true });
    await expect(originals.youtube.publish(ctx)).resolves.toMatchObject({ remoteId: "vid3" });
    expect(saved).toContainEqual({ uploadUrl: `${SESSION}&n=2`, committed: true });
  });

  it("no envía el token a una URL de subida que no sea de Google", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { ctx } = ctxFor({ uploadUrl: "https://evil.example/upload", committed: true });
    await expect(originals.youtube.publish(ctx)).rejects.toThrow(/URL de subida no válida/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
