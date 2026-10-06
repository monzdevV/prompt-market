import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { upsertAccount } from "@/lib/accounts";
import { analyticsRanges, followersSeries, pickAnalyticsRange, workspaceTz } from "@/lib/analytics";
import { handleConvertMedia, requestVertical } from "@/lib/convert";
import { saveCover } from "@/lib/covers";
import { db, UPLOAD_DIR, type Media, type Post, type Target } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import * as jobs from "@/lib/jobs";
import { requestRegenerate } from "@/lib/media";
import { PLANS, planLimitError, usageSummary, type Limits } from "@/lib/plans";
import { dayKey } from "@/lib/platforms/insights";
import { createPost } from "@/lib/posts";
import { inviteToTeam } from "@/lib/team";
import { makeAccount, makeMedia, makeUser } from "./helpers";

/** Regla de producto: Free puede hacer TODO menos usar la IA (transcripción + título, descripción y hashtags). */
let free: { userId: string; workspaceId: string };
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const env = { python: process.env.PYTHON_BIN, script: process.env.VERTICAL_SCRIPT };

beforeAll(async () => {
  free = await makeUser(undefined, "free");
  process.env.PYTHON_BIN = process.execPath;
  process.env.VERTICAL_SCRIPT = path.join(__dirname, "fixtures", "fake-vertical.cjs");
});
afterAll(() => {
  process.env.PYTHON_BIN = env.python;
  process.env.VERTICAL_SCRIPT = env.script;
});
beforeEach(() => {
  db.prepare("DELETE FROM jobs").run();
});

describe("plan Free: todo incluido menos la IA", () => {
  it("los tres planes solo se diferencian en la IA", () => {
    const { aiGenerationsPerMonth: _f, ...freeRest } = PLANS.free.limits;
    for (const p of [PLANS.pro, PLANS.business]) {
      const { aiGenerationsPerMonth, ...rest } = p.limits;
      expect(rest).toEqual(freeRest);
      expect(aiGenerationsPerMonth).toBeGreaterThan(0);
    }
    expect(PLANS.free.limits.aiGenerationsPerMonth).toBe(0);
  });

  it("conecta muchas cuentas (las mismas que Pro y Business)", async () => {
    const u = await makeUser(undefined, "free");
    const n = PLANS.business.limits.socialAccounts;
    for (let i = 0; i < n; i++) {
      upsertAccount(u.workspaceId, { platform: i % 2 ? "youtube" : "instagram", external_id: `a${i}`, name: `a${i}`, access_token: "t" });
    }
    expect(usageSummary(u.workspaceId).used.socialAccounts).toBe(n);
  });

  it("programa publicaciones, con portada propia", () => {
    const account = makeAccount(free.workspaceId, "youtube");
    const mediaId = makeMedia(free.workspaceId);
    const cover = saveCover(free.workspaceId, JPEG);
    const at = Date.now() + 3 * 24 * 3600_000;
    const id = createPost(free.workspaceId, free.userId, {
      mediaId,
      title: "Mi vídeo",
      description: "Texto escrito a mano",
      hashtags: ["uno"],
      targets: [{ accountId: account, options: { format: "short" } }],
      scheduledAt: at,
      cover: { id: cover },
    });
    const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post;
    expect(post).toMatchObject({ scheduled_at: at, cover_file: `${free.workspaceId}/${cover}` });
    expect((db.prepare("SELECT * FROM post_targets WHERE post_id = ?").get(id) as Target).status).not.toBe("failed");
    expect(db.prepare("SELECT run_after FROM jobs WHERE kind = 'publish_target'").get()).toMatchObject({ run_after: at });
  });

  it("convierte a vertical", async () => {
    const src = makeMedia(free.workspaceId);
    const m = db.prepare("SELECT * FROM media WHERE id = ?").get(src) as Media;
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, m.filename), "video-original");
    const v = requestVertical(free.workspaceId, src);
    await expect(handleConvertMedia(jobs.claim("convert_media", 60_000)!)).resolves.toEqual({ type: "done" });
    expect(db.prepare("SELECT status, height FROM media WHERE id = ?").get(v.id)).toMatchObject({ status: "ready", height: 1920 });
  });

  it("ve 730 días de analítica", () => {
    expect(analyticsRanges(free.workspaceId)).toContain(730);
    const days = pickAnalyticsRange(free.workspaceId, "730");
    expect(days).toBe(730);
    const account = makeAccount(free.workspaceId, "instagram");
    const old = dayKey(Date.now() - 700 * 24 * 3600_000, workspaceTz(free.workspaceId));
    db.prepare("INSERT INTO account_snapshots (account_id, workspace_id, day, followers, captured_at) VALUES (?, ?, ?, ?, ?)").run(
      account,
      free.workspaceId,
      old,
      1234,
      Date.now(),
    );
    expect(followersSeries(free.workspaceId, account, days)).toContainEqual({ day: old, followers: 1234 });
  });

  it("el único 402 en Free es la IA: el resto de topes (iguales en todos los planes) responden 409", async () => {
    const keys = Object.keys(PLANS.free.limits).filter((k) => k !== "aiGenerationsPerMonth") as (keyof Limits)[];
    for (const k of keys) expect(planLimitError(k, 1).status).toBe(409);
    expect(planLimitError("aiGenerationsPerMonth", 0).status).toBe(402);

    // Equipo lleno: 409, no 402
    const u = await makeUser(undefined, "free");
    for (let i = 1; i < PLANS.free.limits.teamMembers; i++) await inviteToTeam(u.workspaceId, u.userId, `p${i}-${u.workspaceId}@test.dev`);
    await expect(inviteToTeam(u.workspaceId, u.userId, `extra-${u.workspaceId}@test.dev`)).rejects.toMatchObject({ status: 409 });

    // La IA: 402 explicando en qué planes está
    const mediaId = makeMedia(u.workspaceId);
    let err: unknown;
    try {
      requestRegenerate(u.workspaceId, mediaId);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 402, code: "plan_limit", message: expect.stringMatching(/Pro y Business/) });
    // Y no encoló nada ni gastó IA
    expect(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE kind = 'process_media'").get()).toMatchObject({ n: 0 });
    expect(usageSummary(u.workspaceId).used.aiGenerationsPerMonth).toBe(0);
  });

  it("un vídeo en error de cuando era Pro no puede reintentar la IA en Free (402 antes de cualquier otra comprobación)", async () => {
    const u = await makeUser(undefined, "free");
    const mediaId = makeMedia(u.workspaceId);
    db.prepare("UPDATE media SET status = 'error', size = 0, transcript = NULL WHERE id = ?").run(mediaId);
    expect(() => requestRegenerate(u.workspaceId, mediaId)).toThrow(expect.objectContaining({ status: 402 }));
  });
});
