import { beforeAll, describe, expect, it } from "vitest";
import { upsertAccount } from "@/lib/accounts";
import { db } from "@/lib/db";
import { createMedia, requestRegenerate, reserveStorage, storageQuotaBytes, usedStorageBytes } from "@/lib/media";
import { PLANS, usageSummary } from "@/lib/plans";
import { makeUser } from "./helpers";

let free: { userId: string; workspaceId: string };

beforeAll(async () => {
  free = await makeUser(undefined, "free");
});

const media = (ws: string) => {
  const id = crypto.randomUUID();
  createMedia({ id, workspaceId: ws, filename: `${id}.mp4`, originalName: "v.mp4", mime: "video/mp4", size: 1 });
  return id;
};

describe("límites del plan (aplicados en el servidor)", () => {
  it("vídeos sin límite en todos los planes (lo que se paga es la IA): Free puede subir los que quiera", () => {
    for (let i = 0; i < 25; i++) media(free.workspaceId);
    expect(usageSummary(free.workspaceId).used.videosPerMonth).toBe(25);
    expect(Object.values(PLANS).every((p) => !Number.isFinite(p.limits.videosPerMonth))).toBe(true);
  });

  it("regenerar con IA cuenta para el límite de textos de IA (planes de pago)", async () => {
    const u = await makeUser(undefined, "pro");
    const id = media(u.workspaceId);
    db.prepare("UPDATE media SET status = 'ready' WHERE id = ?").run(id);
    // La subida ya gastó 1; se agotan los que quedan menos uno
    db.prepare("UPDATE usage SET value = ? WHERE workspace_id = ? AND metric = 'ai_generations'").run(
      PLANS.pro.limits.aiGenerationsPerMonth - 1,
      u.workspaceId,
    );
    requestRegenerate(u.workspaceId, id);
    db.prepare("UPDATE media SET status = 'ready' WHERE id = ?").run(id);
    expect(() => requestRegenerate(u.workspaceId, id)).toThrow(/textos de IA/);
  });

  it("Free no incluye IA: el vídeo queda listo al subirlo, sin transcribir ni gastar textos de IA", async () => {
    const u = await makeUser(undefined, "free");
    const id = media(u.workspaceId);
    expect(db.prepare("SELECT status FROM media WHERE id = ?").get(id)).toMatchObject({ status: "ready" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE kind = 'process_media' AND ref_id = ?").get(id)).toMatchObject({ n: 0 });
    expect(usageSummary(u.workspaceId).used.aiGenerationsPerMonth).toBe(0);
    // Pedir la IA a mano: error 402 que explica en qué planes está
    expect(() => requestRegenerate(u.workspaceId, id)).toThrow(expect.objectContaining({ status: 402, message: expect.stringMatching(/Pro y Business/) }));
  });

  it("si el plan pasa a Free con un vídeo en cola, se queda listo sin IA (no falla ni cobra)", async () => {
    const { handleProcessMedia } = await import("@/lib/media-processing");
    const jobs = await import("@/lib/jobs");
    const u = await makeUser(undefined, "pro");
    db.prepare("DELETE FROM jobs").run();
    const id = crypto.randomUUID();
    createMedia({ id, workspaceId: u.workspaceId, filename: `${id}.mp4`, originalName: "v.mp4", mime: "video/mp4", size: 1 });
    db.prepare("UPDATE workspaces SET plan = 'free' WHERE id = ?").run(u.workspaceId);
    const job = jobs.claim("process_media", 60_000)!;
    expect(job.ref_id).toBe(id);
    await expect(handleProcessMedia(job)).resolves.toEqual({ type: "done" });
    expect(db.prepare("SELECT status, error FROM media WHERE id = ?").get(id)).toMatchObject({ status: "ready", error: null });
  });

  it("cuentas conectadas: una nueva por encima del límite se rechaza, reconectar una existente no", async () => {
    const u = await makeUser(undefined, "free");
    const add = (ext: string) => upsertAccount(u.workspaceId, { platform: "youtube", external_id: ext, name: ext, access_token: "t" });
    for (let i = 0; i < PLANS.free.limits.socialAccounts; i++) add(`c${i}`);
    expect(() => add("extra")).toThrow(/cuentas conectadas/);
    expect(() => add("c0")).not.toThrow();
  });

  it("subidas en paralelo reservan espacio: no pueden superar la cuota entre todas", async () => {
    const u = await makeUser(undefined, "free");
    const quota = storageQuotaBytes(u.workspaceId);
    const release = reserveStorage(u.workspaceId, quota - 10);
    expect(quota - usedStorageBytes(u.workspaceId)).toBe(10);
    release();
    release();
    expect(usedStorageBytes(u.workspaceId)).toBe(0);
  });
});
