import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db, UPLOAD_DIR, type Media, type Post, type Target } from "@/lib/db";
import { coverFileFor, saveCover } from "@/lib/covers";
import { defaultFormat, formatProblem, shapeOf } from "@/lib/core/formats";
import { UnknownOutcomeError, type PublishContext } from "@/lib/platforms/common";
import { facebook, instagram } from "@/lib/platforms/meta";
import { youtube } from "@/lib/platforms/youtube";
import { createPost } from "@/lib/posts";
import { makeAccount, makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

beforeAll(async () => {
  user = await makeUser();
});

afterEach(() => {
  vi.unstubAllGlobals();
  db.prepare("DELETE FROM jobs").run();
});

function mediaOf(seconds: number | null) {
  const id = makeMedia(user.workspaceId);
  db.prepare("UPDATE media SET duration_s = ? WHERE id = ?").run(seconds, id);
  return id;
}

function post(accountId: number, mediaId: string, options?: unknown, cover?: { id?: string | null; offsetMs?: number | null }) {
  const id = createPost(user.workspaceId, user.userId, {
    mediaId,
    title: "t",
    description: "d",
    hashtags: [],
    targets: [{ accountId, options }],
    scheduledAt: null,
    cover,
  });
  return {
    post: db.prepare("SELECT * FROM posts WHERE id = ?").get(id) as Post,
    target: db.prepare("SELECT * FROM post_targets WHERE post_id = ?").get(id) as Target,
  };
}

describe("formatos por red", () => {
  it("por defecto: Short si dura hasta 3 min, vídeo si más; Reel en Instagram; vídeo en Facebook", () => {
    expect(defaultFormat("youtube", 45)).toBe("short");
    expect(defaultFormat("youtube", 600)).toBe("video");
    expect(defaultFormat("instagram", 45)).toBe("reel");
    expect(defaultFormat("facebook", 45)).toBe("video");
  });

  it("valida la duración de cada formato según la red (y no bloquea si aún no se sabe)", () => {
    expect(formatProblem("instagram", "story", 75, "Instagram")).toMatch(/máximo es 60 s/);
    expect(formatProblem("facebook", "reel", 2, "Facebook")).toMatch(/mínimo es 3 s/);
    expect(formatProblem("youtube", "short", 200, "YouTube")).toMatch(/máximo es 3 min/);
    expect(formatProblem("instagram", "story", null, "Instagram")).toBeNull();
  });

  it("vídeo horizontal: no se puede publicar como Short, ni como Reel/historia de Facebook; por defecto va como vídeo", () => {
    expect(shapeOf(1280, 720)).toBe("horizontal");
    expect(shapeOf(1080, 1920)).toBe("vertical");
    expect(shapeOf(1080, 1080)).toBe("square");
    expect(defaultFormat("youtube", 10, "horizontal")).toBe("video");
    expect(defaultFormat("youtube", 10, "vertical")).toBe("short");
    expect(formatProblem("youtube", "short", 10, "YouTube", "horizontal")).toMatch(/horizontal.*vertical o cuadrado.*vídeo normal/);
    expect(formatProblem("youtube", "short", 10, "YouTube", "square")).toBeNull();
    expect(formatProblem("facebook", "reel", 10, "Facebook", "square")).toMatch(/vertical \(9:16\)/);
    expect(formatProblem("instagram", "reel", 10, "Instagram", "horizontal")).toBeNull();
  });

  it("guarda el formato elegido y rechaza los que no existen o no caben", () => {
    const ig = makeAccount(user.workspaceId, "instagram");
    expect(JSON.parse(post(ig, mediaOf(20), { format: "story" }).target.options)).toEqual({ format: "story" });
    expect(JSON.parse(post(ig, mediaOf(20)).target.options)).toEqual({ format: "reel" });
    expect(() => post(ig, mediaOf(20), { format: "short" })).toThrow(/Formato no válido/);
    expect(() => post(ig, mediaOf(90), { format: "story" })).toThrow(/máximo es 60 s/);
  });
});

describe("portada", () => {
  it("solo acepta JPG o PNG de verdad (por contenido), de hasta 2 MB", () => {
    expect(() => saveCover(user.workspaceId, Buffer.from("<svg onload=alert(1)>"))).toThrow(/JPG o PNG/);
    expect(() => saveCover(user.workspaceId, Buffer.concat([JPEG, Buffer.alloc(2 * 1024 * 1024)]))).toThrow(/2 MB/);
    expect(saveCover(user.workspaceId, JPEG)).toMatch(/\.jpg$/);
  });

  it("una portada de otro espacio no se puede usar (ni rutas inventadas)", async () => {
    const other = await makeUser();
    const foreign = saveCover(other.workspaceId, JPEG);
    expect(() => coverFileFor(user.workspaceId, foreign)).toThrow(/ya no existe/);
    expect(() => coverFileFor(user.workspaceId, "../../studio.db")).toThrow(/no válida/);
  });

  it("se guarda con la publicación: imagen y fotograma", () => {
    const yt = makeAccount(user.workspaceId, "youtube");
    db.prepare("UPDATE accounts SET granted_scopes = NULL WHERE id = ?").run(yt);
    const coverId = saveCover(user.workspaceId, JPEG);
    const { post: p } = post(yt, mediaOf(30), { format: "short" }, { id: coverId, offsetMs: 1500 });
    expect(p.cover_file).toBe(`${user.workspaceId}/${coverId}`);
    expect(p.cover_offset_ms).toBe(1500);
    expect(() => post(yt, mediaOf(30), undefined, { offsetMs: 60_000 })).toThrow(/fuera del vídeo/);
  });
});

function ctx(options: Record<string, unknown>, cover: PublishContext["cover"] = { path: null, offsetMs: null }) {
  const mediaId = makeMedia(user.workspaceId);
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Media;
  const filePath = path.join(UPLOAD_DIR, media.filename);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(filePath, Buffer.alloc(100, 1));
  const ref: Record<string, unknown> = {};
  return {
    ref,
    ctx: {
      account: { id: 1, external_id: "123", access_token: "tok" },
      post: { title: "Título" },
      media,
      filePath,
      caption: "Texto #tag",
      hashtags: ["tag"],
      options,
      cover,
      ref,
      saveRef: (p: Record<string, unknown>) => Object.assign(ref, p),
    } as unknown as PublishContext,
  };
}

/** fetch simulado que registra cada llamada (URL + cuerpo como objeto) y responde en orden */
function scripted(responses: (() => Response)[]) {
  const calls: { url: string; body: Record<string, string> | null; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : null;
      calls.push({ url: String(url), body, init });
      const next = responses[calls.length - 1];
      if (!next) throw new Error(`Llamada inesperada: ${url}`);
      return next();
    }),
  );
  return calls;
}
const json = (data: unknown, status = 200) => () => new Response(JSON.stringify(data), { status });

describe("Instagram: Reel, solo Reels e historia", () => {
  it("historia: media_type=STORIES, sin texto ni portada", async () => {
    const calls = scripted([json({ id: "c1" }), json({ success: true })]);
    const { ctx: c } = ctx({ format: "story" }, { path: null, offsetMs: 2000 });
    await instagram.publish(c);
    expect(calls[0].body).toMatchObject({ media_type: "STORIES", upload_type: "resumable" });
    expect(calls[0].body).not.toHaveProperty("caption");
    expect(calls[0].body).not.toHaveProperty("thumb_offset");
  });

  it("solo en Reels: share_to_feed=false y fotograma de portada con thumb_offset", async () => {
    const calls = scripted([json({ id: "c2" }), json({ success: true })]);
    const { ctx: c } = ctx({ format: "reel_only" }, { path: null, offsetMs: 2500 });
    await instagram.publish(c);
    expect(calls[0].body).toMatchObject({ media_type: "REELS", share_to_feed: "false", thumb_offset: "2500", caption: "Texto #tag" });
  });
});

describe("Facebook: Reel e historia en tres pasos", () => {
  it("Reel: start → subida a rupload → finish con descripción; enlace al Reel", async () => {
    const calls = scripted([
      json({ video_id: "v9", upload_url: "https://rupload.facebook.com/video-upload/v25.0/v9" }),
      json({ success: true }),
      json({ success: true }),
    ]);
    const { ctx: c, ref } = ctx({ format: "reel" });
    await expect(facebook.publish(c)).resolves.toMatchObject({ status: "done", remoteId: "v9", url: "https://www.facebook.com/reel/v9" });
    expect(calls[0].url).toMatch(/\/123\/video_reels$/);
    expect(calls[0].body).toMatchObject({ upload_phase: "start" });
    expect(calls[1].url).toBe("https://rupload.facebook.com/video-upload/v25.0/v9");
    expect(calls[2].body).toMatchObject({ upload_phase: "finish", video_id: "v9", video_state: "PUBLISHED", description: "Texto #tag" });
    expect(ref).toMatchObject({ committed: true, uploaded: true });
  });

  it("historia: usa video_stories y, si se corta al publicar, no repite a ciegas", async () => {
    scripted([json({ video_id: "s1", upload_url: "https://rupload.facebook.com/video-upload/v25.0/s1" }), json({ success: true }), json({ success: true, post_id: "p1" })]);
    const { ctx: c } = ctx({ format: "story" });
    await expect(facebook.publish(c)).resolves.toMatchObject({ remoteId: "p1" });

    const again = ctx({ format: "story" });
    again.ref.committed = true;
    await expect(facebook.publish(again.ctx)).rejects.toBeInstanceOf(UnknownOutcomeError);
  });

  it("no envía el token a una URL de subida que no sea de Facebook", async () => {
    scripted([json({ video_id: "x", upload_url: "https://evil.example/up" })]);
    const { ctx: c } = ctx({ format: "reel" });
    await expect(facebook.publish(c)).rejects.toThrow(/URL de subida no válida/);
  });
});

describe("TikTok: motivos de rechazo claros", () => {
  it("cuenta pública con la app sin auditar: mensaje en español y sin reintentos a ciegas", async () => {
    const { tiktok } = await import("@/lib/platforms/tiktok");
    const creator = {
      data: { privacy_level_options: ["SELF_ONLY"], creator_username: "yo", comment_disabled: false, duet_disabled: false, stitch_disabled: false },
      error: { code: "ok" },
    };
    scripted([
      json(creator),
      json({ error: { code: "unaudited_client_can_only_post_to_private_accounts", message: "Please review our integration guidelines" } }, 403),
    ]);
    const { ctx: c } = ctx({
      privacyLevel: "SELF_ONLY",
      allowComment: true,
      allowDuet: false,
      allowStitch: false,
      commercial: { enabled: false, yourBrand: false, brandedContent: false },
    });
    const err = await tiktok.publish(c).catch((e) => e);
    expect(err).toBeInstanceOf((await import("@/lib/platforms/common")).RejectedError);
    expect(err.message).toMatch(/cuenta de TikTok tiene que estar en privado/);
  });
});

describe("YouTube: Short y miniatura", () => {
  const SESSION = "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=s";

  it("Short añade #Shorts a la descripción y pone la miniatura propia tras subir", async () => {
    const coverFile = path.join(UPLOAD_DIR, "..", "cover-test.jpg");
    fs.writeFileSync(coverFile, JPEG);
    const calls = scripted([
      () => new Response(null, { status: 200, headers: { Location: SESSION } }),
      json({ id: "yt1" }),
      json({ items: [] }),
    ]);
    const { ctx: c } = ctx({ format: "short" }, { path: coverFile, offsetMs: null });
    await expect(youtube.publish(c)).resolves.toMatchObject({ remoteId: "yt1" });
    const meta = JSON.parse(String(calls[0].init.body));
    expect(meta.snippet.description).toBe("Texto #tag\n\n#Shorts");
    expect(calls[2].url).toMatch(/thumbnails\/set\?videoId=yt1/);
    expect((calls[2].init.headers as Record<string, string>)["Content-Type"]).toBe("image/jpeg");
  });

  it("si YouTube no deja poner la miniatura (canal sin verificar), el vídeo sigue publicado", async () => {
    const coverFile = path.join(UPLOAD_DIR, "..", "cover-test.jpg");
    fs.writeFileSync(coverFile, JPEG);
    scripted([
      () => new Response(null, { status: 200, headers: { Location: SESSION } }),
      json({ id: "yt2" }),
      json({ error: { message: "forbidden" } }, 403),
    ]);
    const { ctx: c } = ctx({ format: "video" }, { path: coverFile, offsetMs: null });
    await expect(youtube.publish(c)).resolves.toMatchObject({ status: "done", remoteId: "yt2" });
  });
});
