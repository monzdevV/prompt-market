import { z } from "zod";
import { db, tx, type Platform, type Post, type PostStatus, type Target, type TargetStatus } from "./db";
import { badRequest, conflict, notFound } from "./errors";
import { buildCaption, CAPTION_LIMIT, normalizeHashtags, overLimit } from "./core/caption";
import { TikTokOptionsSchema, validateTikTokOptions } from "./core/tiktok-options";
import { defaultFormat, formatDef, formatProblem, isValidFormat } from "./core/formats";
import { coverFileFor } from "./covers";
import { cancelQueued, enqueue, reschedule } from "./jobs";
import { defaultBrandId } from "./brands";
import { publishingEnabled, tiktokAudited, tiktokSchedulingAllowed } from "./features";
import { isRelayed } from "./platforms/uploadpost";
import { PLATFORM_LABEL } from "./platforms/labels";
import { youtubeCanUpload } from "./platforms/youtube";

export const CreatePostSchema = z.object({
  mediaId: z.string().min(1, "Falta el vídeo"),
  title: z.string().trim().max(100, "El título no puede pasar de 100 caracteres").default(""),
  description: z.string().trim().min(1, "Escribe una descripción").max(5000, "La descripción es demasiado larga"),
  hashtags: z.array(z.string().max(100)).max(30, "Máximo 30 hashtags").default([]),
  targets: z
    .array(z.object({ accountId: z.number().int().positive(), options: z.unknown().optional() }))
    .min(1, "Elige al menos una red")
    .max(20),
  scheduledAt: z.number().int().nullable(),
  /** Portada: imagen subida antes (/api/covers) y/o fotograma del vídeo en ms */
  cover: z
    .object({
      id: z.string().max(60).nullable().optional(),
      offsetMs: z.number().int().min(0).max(24 * 3600_000).nullable().optional(),
    })
    .optional(),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 3600_000;

export function createPost(workspaceId: string, userId: string, input: CreatePostInput) {
  const now = Date.now();
  const scheduledAt = input.scheduledAt ?? now;
  if (scheduledAt < now - 60_000) throw badRequest("La fecha programada ya ha pasado");
  if (scheduledAt > now + MAX_SCHEDULE_AHEAD_MS) throw badRequest("Solo se puede programar hasta un año vista");
  const hashtags = normalizeHashtags(input.hashtags);
  const caption = buildCaption(input.description, hashtags);

  return tx(() => {
    const media = db.prepare("SELECT id, size, duration_s FROM media WHERE id = ? AND workspace_id = ?").get(input.mediaId, workspaceId) as
      | { id: string; size: number; duration_s: number | null }
      | undefined;
    if (!media) throw notFound("El vídeo");
    if (media.size === 0) throw badRequest("El fichero de este vídeo ya se borró para liberar espacio. Súbelo de nuevo.");
    const coverFile = input.cover?.id ? coverFileFor(workspaceId, input.cover.id) : null;
    const coverOffsetMs = input.cover?.offsetMs ?? null;
    if (coverOffsetMs !== null && media.duration_s !== null && coverOffsetMs > media.duration_s * 1000) {
      throw badRequest("El fotograma de portada está fuera del vídeo");
    }

    const accountIds = [...new Set(input.targets.map((t) => t.accountId))];
    const accounts = db
      .prepare(
        `SELECT id, platform, granted_scopes, external_id FROM accounts WHERE workspace_id = ? AND status = 'active' AND id IN (${accountIds.map(() => "?").join(",")})`,
      )
      .all(workspaceId, ...accountIds) as { id: number; platform: Platform; granted_scopes: string | null; external_id: string }[];
    for (const a of accounts) {
      if (a.platform === "youtube" && !youtubeCanUpload(a.granted_scopes)) {
        throw badRequest("Para publicar en YouTube, autoriza la publicación desde Cuentas");
      }
    }
    if (accounts.length !== accountIds.length) {
      throw badRequest("Alguna de las cuentas ya no está conectada. Recarga la página.");
    }
    const platformOf = new Map(accounts.map((a) => [a.id, a.platform]));
    // Conectadas a través de Upload-Post: su app de TikTok ya está auditada (se puede programar y publicar en público)
    const relayed = new Set(accounts.filter(isRelayed).map((a) => a.id));

    const tooLong = overLimit(caption, accounts.map((a) => a.platform));
    if (tooLong.length) {
      throw badRequest(
        `El texto es demasiado largo para ${tooLong.map((p) => `${PLATFORM_LABEL[p]} (máx. ${CAPTION_LIMIT[p]})`).join(", ")}`,
      );
    }

    const targets = accountIds.map((accountId) => {
      const platform = platformOf.get(accountId)!;
      if (!publishingEnabled(platform)) {
        throw badRequest(`La publicación en ${PLATFORM_LABEL[platform]} está desactivada de momento`);
      }
      const raw = input.targets.find((t) => t.accountId === accountId)?.options;
      if (platform !== "tiktok") {
        // Formato (Short, Reel, Historia…): si no llega, el habitual; si llega, tiene que existir en esa red
        const asked = (raw as { format?: unknown } | undefined)?.format;
        if (asked !== undefined && !isValidFormat(platform, asked)) throw badRequest(`Formato no válido para ${PLATFORM_LABEL[platform]}`);
        const format = asked ?? defaultFormat(platform, media.duration_s);
        const problem = formatProblem(platform, format, media.duration_s, PLATFORM_LABEL[platform]);
        if (problem) throw badRequest(problem);
        return { accountId, options: format ? { format: formatDef(platform, format)!.id } : {} };
      }
      // TikTok exige que el usuario elija la privacidad y declare el contenido comercial en cada vídeo
      if (scheduledAt > now + 60_000 && !tiktokSchedulingAllowed() && !relayed.has(accountId)) {
        throw badRequest("En TikTok de momento solo se puede publicar al momento, sin programar");
      }
      const parsed = TikTokOptionsSchema.safeParse(raw);
      if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? "Completa las opciones de TikTok");
      const problem = validateTikTokOptions(parsed.data);
      if (problem) throw badRequest(problem);
      if (!tiktokAudited() && !relayed.has(accountId) && parsed.data.privacyLevel !== "SELF_ONLY") {
        throw badRequest("Hasta que TikTok apruebe la app, los vídeos solo pueden publicarse como «Solo yo»");
      }
      return { accountId, options: parsed.data };
    });

    const { id } = db
      .prepare(
        `INSERT INTO posts (workspace_id, brand_id, media_id, title, description, hashtags, scheduled_at, status, created_by, created_at, cover_file, cover_offset_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?) RETURNING id`,
      )
      .get(
        workspaceId,
        defaultBrandId(workspaceId),
        input.mediaId,
        input.title,
        input.description,
        JSON.stringify(hashtags),
        scheduledAt,
        userId,
        now,
        coverFile,
        coverOffsetMs,
      ) as {
      id: number;
    };
    const insertTarget = db.prepare("INSERT INTO post_targets (post_id, account_id, options) VALUES (?, ?, ?) RETURNING id");
    for (const t of targets) {
      const row = insertTarget.get(id, t.accountId, JSON.stringify(t.options)) as { id: number };
      enqueue("publish_target", row.id, workspaceId, scheduledAt);
    }
    return id;
  });
}

function getPost(workspaceId: string, postId: number) {
  const post = db
    .prepare("SELECT * FROM posts WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL")
    .get(postId, workspaceId) as Post | undefined;
  if (!post) throw notFound("La publicación");
  return post;
}

/** Cuentas en las que se publicó (para sincronizar sus métricas). */
export function postAccountIds(workspaceId: string, postId: number) {
  const post = getPost(workspaceId, postId);
  return targetsOf(post.id).map((t) => t.account_id);
}

function targetsOf(postId: number) {
  return db.prepare("SELECT * FROM post_targets WHERE post_id = ?").all(postId) as Target[];
}

export function derivePostStatus(targets: Pick<Target, "status">[], scheduledAt: number, now = Date.now()): PostStatus {
  const count = (s: TargetStatus) => targets.filter((t) => t.status === s).length;
  if (count("publishing")) return "publishing";
  if (count("pending")) return scheduledAt > now ? "scheduled" : "publishing";
  if (targets.length && count("published") === targets.length) return "done";
  if (count("published") === 0 && count("needs_review") === 0) return "failed";
  return "partial";
}

export function refreshPostStatus(postId: number) {
  const post = db.prepare("SELECT scheduled_at FROM posts WHERE id = ?").get(postId) as { scheduled_at: number } | undefined;
  if (!post) return;
  db.prepare("UPDATE posts SET status = ? WHERE id = ?").run(derivePostStatus(targetsOf(postId), post.scheduled_at), postId);
}

export function publishNow(workspaceId: string, postId: number) {
  tx(() => {
    const post = getPost(workspaceId, postId);
    const pending = targetsOf(post.id).filter((t) => t.status === "pending");
    if (!pending.length) throw conflict("Esta publicación ya no está pendiente");
    const now = Date.now();
    db.prepare("UPDATE posts SET scheduled_at = ? WHERE id = ?").run(now, post.id);
    for (const t of pending) reschedule("publish_target", t.id, now);
    refreshPostStatus(post.id);
  });
}

export function reschedulePost(workspaceId: string, postId: number, at: number) {
  if (at < Date.now()) throw badRequest("Elige una fecha futura");
  if (at > Date.now() + MAX_SCHEDULE_AHEAD_MS) throw badRequest("Solo se puede programar hasta un año vista");
  tx(() => {
    const post = getPost(workspaceId, postId);
    const targets = targetsOf(post.id);
    if (post.status !== "scheduled" || targets.some((t) => t.status !== "pending")) {
      throw conflict("Solo se pueden reprogramar publicaciones que aún no han empezado");
    }
    db.prepare("UPDATE posts SET scheduled_at = ? WHERE id = ?").run(at, post.id);
    for (const t of targets) reschedule("publish_target", t.id, at);
  });
}

/**
 * Reintenta solo los destinos con fallo seguro ('failed'). Los 'needs_review' (resultado incierto)
 * no se reintentan nunca a ciegas: el usuario debe resolverlos antes para no duplicar el vídeo.
 */
export function retryFailed(workspaceId: string, postId: number) {
  tx(() => {
    const post = getPost(workspaceId, postId);
    const failed = targetsOf(post.id).filter((t) => t.status === "failed");
    if (!failed.length) throw conflict("No hay destinos con error que reintentar");
    for (const t of failed) {
      db.prepare("UPDATE post_targets SET status = 'pending', error = NULL, remote_ref = NULL WHERE id = ?").run(t.id);
      enqueue("publish_target", t.id, workspaceId);
    }
    db.prepare("UPDATE posts SET scheduled_at = MIN(scheduled_at, ?) WHERE id = ?").run(Date.now(), post.id);
    refreshPostStatus(post.id);
  });
}

/** Resolución manual de un destino dudoso tras comprobarlo en la red. */
export function resolveReview(workspaceId: string, targetId: number, outcome: "published" | "not_published", url?: string) {
  tx(() => {
    const row = db
      .prepare(
        `SELECT t.id, t.post_id FROM post_targets t JOIN posts p ON p.id = t.post_id
         WHERE t.id = ? AND p.workspace_id = ? AND t.status = 'needs_review'`,
      )
      .get(targetId, workspaceId) as { id: number; post_id: number } | undefined;
    if (!row) throw notFound("El destino pendiente de revisión");
    if (outcome === "published") {
      db.prepare(
        "UPDATE post_targets SET status = 'published', error = NULL, remote_url = COALESCE(?, remote_url), published_at = ? WHERE id = ?",
      ).run(url ?? null, Date.now(), row.id);
    } else {
      db.prepare("UPDATE post_targets SET status = 'failed', error = 'Marcada como no publicada', remote_ref = NULL WHERE id = ?").run(
        row.id,
      );
    }
    refreshPostStatus(row.post_id);
  });
}

/** Borra la publicación de la app (no de las redes). No se permite mientras se está subiendo. */
export function deletePost(workspaceId: string, postId: number) {
  tx(() => {
    const post = getPost(workspaceId, postId);
    const targets = targetsOf(post.id);
    if (targets.some((t) => t.status === "publishing")) {
      throw conflict("Espera a que termine de publicarse para borrarla");
    }
    cancelQueued("publish_target", targets.map((t) => t.id));
    // Borrado lógico: desaparece de la app pero se conserva el historial de lo ya publicado y sus métricas.
    // Los destinos pendientes se retiran para que nunca se publiquen.
    db.prepare("DELETE FROM post_targets WHERE post_id = ? AND status = 'pending'").run(post.id);
    db.prepare("UPDATE posts SET deleted_at = ? WHERE id = ?").run(Date.now(), post.id);
  });
}

// ── Lecturas para las páginas ──────────────────────────────────────────────

export type PostTarget = Target & { platform: Platform; account_name: string };
export type PostRow = Post & { original_name: string; targets: PostTarget[] };

export function listPosts(
  workspaceId: string,
  opts: { from?: number; to?: number; limit?: number; statuses?: PostStatus[] } = {},
) {
  const where = ["p.workspace_id = ?", "p.deleted_at IS NULL"];
  const args: (string | number)[] = [workspaceId];
  if (opts.from != null) {
    where.push("p.scheduled_at >= ?");
    args.push(opts.from);
  }
  if (opts.to != null) {
    where.push("p.scheduled_at < ?");
    args.push(opts.to);
  }
  if (opts.statuses?.length) {
    where.push(`p.status IN (${opts.statuses.map(() => "?").join(",")})`);
    args.push(...opts.statuses);
  }
  const limit = Math.min(Math.max(1, Math.trunc(opts.limit ?? 200)), 1000);
  const posts = db
    .prepare(
      `SELECT p.*, m.original_name FROM posts p JOIN media m ON m.id = p.media_id
       WHERE ${where.join(" AND ")} ORDER BY p.scheduled_at DESC LIMIT ${limit}`,
    )
    .all(...args) as unknown as PostRow[];
  if (!posts.length) return posts;
  const targets = db
    .prepare(
      `SELECT t.*, a.platform, a.name AS account_name FROM post_targets t JOIN accounts a ON a.id = t.account_id
       WHERE t.post_id IN (${posts.map(() => "?").join(",")}) ORDER BY a.platform`,
    )
    .all(...posts.map((p) => p.id)) as PostTarget[];
  const byPost = new Map<number, PostTarget[]>();
  for (const t of targets) byPost.set(t.post_id, [...(byPost.get(t.post_id) ?? []), t]);
  for (const p of posts) p.targets = byPost.get(p.id) ?? [];
  return posts;
}
