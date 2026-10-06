import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { db, type Target } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { HttpError, UnknownOutcomeError, type Publisher, type PublishContext } from "@/lib/platforms/common";
import { publishers } from "@/lib/platforms";
import { createPost, retryFailed } from "@/lib/posts";
import { handlePublishTarget } from "@/lib/publisher";
import { makeAccount, makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };
const original = publishers.youtube;

beforeAll(async () => {
  user = await makeUser();
});

afterEach(() => {
  publishers.youtube = original;
});

function fake(publish: (ctx: PublishContext) => ReturnType<Publisher["publish"]>) {
  publishers.youtube = { publish };
}

/** Crea una publicación con un destino y reclama su trabajo, como haría el ejecutor. */
function setup() {
  const accountId = makeAccount(user.workspaceId, "youtube");
  const postId = createPost(user.workspaceId, user.userId, {
    mediaId: makeMedia(user.workspaceId),
    title: "t",
    description: "d",
    hashtags: ["uno"],
    targets: [{ accountId }],
    scheduledAt: null,
  });
  const target = db.prepare("SELECT * FROM post_targets WHERE post_id = ?").get(postId) as Target;
  const job = jobs.claim("publish_target", 60_000)!;
  expect(job.ref_id).toBe(String(target.id));
  return { accountId, postId, targetId: target.id, job };
}

const target = (id: number) => db.prepare("SELECT * FROM post_targets WHERE id = ?").get(id) as Target;
const postStatus = (id: number) => (db.prepare("SELECT status FROM posts WHERE id = ?").get(id) as { status: string }).status;

describe("publicar un destino", () => {
  it("éxito: queda publicado con enlace y la publicación completa", async () => {
    fake(async (ctx) => {
      expect(ctx.caption).toBe("d\n\n#uno");
      expect(ctx.account.access_token).toBe("access-secreto");
      return { status: "done", remoteId: "abc", url: "https://youtu.be/abc" };
    });
    const { targetId, postId, job } = setup();
    expect(await handlePublishTarget(job)).toEqual({ type: "done" });
    expect(target(targetId)).toMatchObject({ status: "published", remote_id: "abc", error: null });
    expect(postStatus(postId)).toBe("done");
  });

  it("un trabajo repetido sobre un destino ya publicado no vuelve a publicar", async () => {
    let calls = 0;
    fake(async () => {
      calls++;
      return { status: "done", remoteId: "x" };
    });
    const { job } = setup();
    await handlePublishTarget(job);
    await handlePublishTarget(job);
    expect(calls).toBe(1);
  });

  it("guarda el progreso y el siguiente intento continúa desde ahí", async () => {
    const seen: unknown[] = [];
    fake(async (ctx) => {
      seen.push({ ...ctx.ref });
      if (!ctx.ref.sessionUrl) {
        ctx.saveRef({ sessionUrl: "https://upload/1", committed: true });
        return { status: "wait", ms: 10 };
      }
      return { status: "done", remoteId: "v1" };
    });
    const { targetId, job } = setup();
    expect(await handlePublishTarget(job)).toEqual({ type: "wait", ms: 10 });
    expect(target(targetId).status).toBe("publishing");
    expect(JSON.parse(target(targetId).remote_ref!)).toMatchObject({ sessionUrl: "https://upload/1" });
    await handlePublishTarget(job);
    expect(seen[1]).toMatchObject({ sessionUrl: "https://upload/1", committed: true });
    expect(target(targetId).status).toBe("published");
  });

  it("fallo pasajero: se reintenta; agotados los intentos antes de publicar, queda en error", async () => {
    fake(async () => {
      throw new HttpError(503, "503 no disponible");
    });
    const { targetId, postId, job } = setup();
    expect(await handlePublishTarget(job)).toMatchObject({ type: "retry" });
    expect(target(targetId).status).toBe("publishing");

    await handlePublishTarget({ ...job, attempts: job.max_attempts });
    expect(target(targetId).status).toBe("failed");
    expect(postStatus(postId)).toBe("failed");
  });

  it("fallo pasajero después de empezar a publicar: queda para revisar, nunca en error reintentable", async () => {
    fake(async (ctx) => {
      ctx.saveRef({ committed: true });
      throw new HttpError(0, "Sin conexión");
    });
    const { targetId, postId, job } = setup();
    await handlePublishTarget({ ...job, attempts: job.max_attempts });
    expect(target(targetId).status).toBe("needs_review");
    expect(postStatus(postId)).toBe("partial");
    expect(() => retryFailed(user.workspaceId, postId)).toThrow(/No hay destinos con error/);
  });

  it("resultado incierto: pasa a revisar sin reintentar", async () => {
    fake(async () => {
      throw new UnknownOutcomeError("no sabemos");
    });
    const { targetId, job } = setup();
    expect(await handlePublishTarget(job)).toEqual({ type: "done" });
    expect(target(targetId)).toMatchObject({ status: "needs_review", error: "no sabemos" });
  });

  it("rechazo definitivo (4xx): error y se puede reintentar a mano desde cero", async () => {
    fake(async (ctx) => {
      ctx.saveRef({ step: 1 });
      throw new HttpError(400, "400 vídeo no válido");
    });
    const { targetId, postId, job } = setup();
    await handlePublishTarget(job);
    expect(target(targetId)).toMatchObject({ status: "failed", error: "400 vídeo no válido" });
    retryFailed(user.workspaceId, postId);
    expect(target(targetId)).toMatchObject({ status: "pending", remote_ref: null, error: null });
  });

  it("permiso revocado (401): la cuenta pasa a 'reconectar'", async () => {
    fake(async () => {
      throw new HttpError(401, "401 token inválido");
    });
    const { accountId, targetId, job } = setup();
    await handlePublishTarget(job);
    expect(target(targetId).status).toBe("failed");
    expect(db.prepare("SELECT status FROM accounts WHERE id = ?").get(accountId)).toMatchObject({ status: "needs_reauth" });
  });

  it("cuenta desconectada: falla sin llamar a la red", async () => {
    let called = false;
    fake(async () => {
      called = true;
      return { status: "done", remoteId: "x" };
    });
    const { accountId, targetId, job } = setup();
    db.prepare("UPDATE accounts SET status = 'disconnected' WHERE id = ?").run(accountId);
    await handlePublishTarget(job);
    expect(called).toBe(false);
    expect(target(targetId).status).toBe("failed");
  });

  it("reprogramada al futuro mientras esperaba: vuelve a esperar", async () => {
    fake(async () => ({ status: "done", remoteId: "x" }));
    const { postId, job } = setup();
    db.prepare("UPDATE posts SET scheduled_at = ? WHERE id = ?").run(Date.now() + 3600_000, postId);
    const d = await handlePublishTarget(job);
    expect(d.type).toBe("wait");
  });
});
