import path from "node:path";
import type { Account, Platform } from "../db";
import { db } from "../db";
import { disconnectAccount, markNeedsReauth, upsertAccount, type NewAccount } from "../accounts";
import { clipWords, normalizeHashtag, YOUTUBE_TITLE_LIMIT } from "../core/caption";
import { TikTokOptionsSchema } from "../core/tiktok-options";
import { coverMime } from "../covers";
import { ApiError } from "../errors";
import { log } from "../log";
import { EMPTY_METRICS, num, type Insights, type MetricValues, type RemotePost } from "./insights";
import {
  APP_URL,
  assertHost,
  fileBlob,
  fileSize,
  http,
  HttpError,
  RejectedError,
  UnknownOutcomeError,
  uploadTimeoutMs,
  type Publisher,
} from "./common";
import { withShortsTag } from "./youtube";

/*
 * Upload-Post (upload-post.com): publica en TikTok, Instagram, YouTube y Facebook con sus apps ya
 * aprobadas por cada red, así que no dependemos de nuestras propias revisiones.
 *
 *  - Cada espacio de trabajo es un «perfil» suyo (username = ep-<id del espacio>).
 *  - El cliente conecta sus redes en su página de conexión (con nuestro logo y en español) y vuelve.
 *  - Guardamos una fila en `accounts` por red conectada, con external_id «up:…» (así nunca choca con
 *    una cuenta conectada directamente) y un token de relleno: los tokens reales los guarda Upload-Post.
 *  - La programación la sigue haciendo nuestro ejecutor: a la hora, mandamos el vídeo y consultamos
 *    el resultado. Reprogramar, «Publicar ya» o borrar funcionan igual que con la conexión directa.
 *
 * Documentación: docs.upload-post.com (api/user-profiles, api/upload-video, api/upload-status,
 * api/get-facebook-pages, api/get-tiktok-settings). Consultada el 23/09/2026.
 */

const BASE = "https://api.upload-post.com";
const CONNECT_HOST = /(^|\.)upload-post\.com$/;
type RelayPlatform = "tiktok" | "instagram" | "youtube" | "facebook" | "x";
const ALL: RelayPlatform[] = ["tiktok", "instagram", "youtube", "facebook", "x"];
/** Nombres que usa Upload-Post: X es «x» en la página de conexión y en los resultados, pero «twitter» al subir vídeo. */
const UPLOAD_NAME: Record<RelayPlatform, string> = { tiktok: "tiktok", instagram: "instagram", youtube: "youtube", facebook: "facebook", x: "twitter" };
const ALIASES: Record<RelayPlatform, string[]> = { tiktok: ["tiktok"], instagram: ["instagram"], youtube: ["youtube"], facebook: ["facebook"], x: ["x", "twitter"] };

/**
 * Redes que van por Upload-Post (UPLOAD_POST_PLATFORMS, por defecto Instagram, YouTube, Facebook y X).
 * TikTok se deja fuera por defecto: va con nuestra propia app cuando TikTok la apruebe, o se añade
 * aquí («…,tiktok») con un plan de pago de Upload-Post (el gratis no publica en TikTok).
 */
export function relayPlatforms(): RelayPlatform[] {
  const asked = (process.env.UPLOAD_POST_PLATFORMS || "instagram,youtube,facebook,x").split(",").map((p) => p.trim().toLowerCase());
  return ALL.filter((p) => asked.includes(p));
}
/** Tiempo máximo esperando el resultado de una publicación antes de pedir que se revise a mano. */
const RESULT_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const POLL_MS = 10_000;
/** Token de relleno en account_tokens: los de verdad los guarda Upload-Post. */
const NO_TOKEN = "upload-post";

export function uploadPostEnabled() {
  return !!process.env.UPLOAD_POST_API_KEY;
}

/** Cuenta conectada a través de Upload-Post. */
export function isRelayed(account: Pick<Account, "external_id">) {
  return account.external_id.startsWith("up:");
}

type RelayMeta = { via: "uploadpost"; profile: string; handle?: string | null; pageId?: string };

function relayMeta(account: Pick<Account, "meta">): RelayMeta {
  const m = JSON.parse(account.meta || "{}") as Partial<RelayMeta>;
  if (m.via !== "uploadpost" || !m.profile) throw new Error("Cuenta de Upload-Post sin perfil");
  return m as RelayMeta;
}

/**
 * Perfil de Upload-Post de cada espacio. UPLOAD_POST_PROFILE fija uno para pruebas (el plan gratis
 * solo admite 2 perfiles); nunca en producción, donde todos los espacios compartirían cuentas.
 */
export const profileName = (workspaceId: string) =>
  process.env.NODE_ENV !== "production" && process.env.UPLOAD_POST_PROFILE ? process.env.UPLOAD_POST_PROFILE : `ep-${workspaceId}`;

/** La clave de API no vale: es un problema nuestro, no de la cuenta del cliente (no pedir reconectar). */
export class UploadPostKeyError extends Error {}

async function up<T = any>(pathname: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const key = process.env.UPLOAD_POST_API_KEY;
  if (!key) throw new UploadPostKeyError("Upload-Post no está configurado (falta UPLOAD_POST_API_KEY)");
  try {
    return await http<T>(`${BASE}${pathname}`, { ...init, headers: { ...init.headers, Authorization: `Apikey ${key}` } }, timeoutMs);
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) throw new UploadPostKeyError("Upload-Post rechazó la clave de API (UPLOAD_POST_API_KEY)");
    throw e;
  }
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Crea el perfil del espacio si aún no existe. Se pregunta antes: al crear, Upload-Post comprueba el
 * límite de perfiles del plan antes que si ya existe, y respondería 403 aunque el perfil ya estuviera.
 */
export async function ensureProfile(workspaceId: string) {
  try {
    await up(`/api/uploadposts/users/${encodeURIComponent(profileName(workspaceId))}`);
    return;
  } catch (e) {
    if (!(e instanceof HttpError && e.status === 404)) throw e;
  }
  try {
    await up("/api/uploadposts/users", json({ username: profileName(workspaceId) }));
  } catch (e) {
    if (e instanceof HttpError && e.status === 409) return;
    if (e instanceof HttpError && e.status === 403) {
      throw new ApiError(409, "plan_limit", "El servicio de publicación ha llegado a su máximo de clientes. Revisa tu plan de Upload-Post.");
    }
    throw e;
  }
}

/**
 * Enlace a la página de conexión de Upload-Post para este espacio (válido 48 h). Al terminar, el botón
 * de su página devuelve al cliente a /api/uploadpost/return, que trae las cuentas conectadas.
 */
export async function connectUrl(workspaceId: string) {
  await ensureProfile(workspaceId);
  const r = await up<{ access_url?: string }>(
    "/api/uploadposts/users/generate-jwt",
    json({
      username: profileName(workspaceId),
      redirect_url: `${APP_URL()}/api/uploadpost/return`,
      logo_image: `${APP_URL()}/brand/manny-mark.png`,
      redirect_button_text: "Volver a Manny",
      // Su página usa el título como nombre de quien invita («Al conectar una cuenta, Manny obtiene permiso…»)
      connect_title: "Manny",
      connect_description: "Conecta las redes en las que quieres publicar desde Manny. Puedes desconectarlas cuando quieras.",
      platforms: relayPlatforms(),
      show_calendar: false,
      language: "es",
      connect_theme: "dark",
    }),
  );
  if (!r.access_url) throw new Error("Upload-Post no devolvió el enlace de conexión");
  return assertHost(r.access_url, CONNECT_HOST);
}

type SocialAccount = {
  username?: string;
  handle?: string;
  display_name?: string;
  social_images?: string;
  reauth_required?: boolean;
  capabilities?: string[];
};

const httpsOrNull = (u: unknown) => (typeof u === "string" && u.startsWith("https://") ? u : null);

/**
 * Trae las redes conectadas en Upload-Post y deja `accounts` igual: añade o reactiva las conectadas y
 * desconecta las que el cliente quitó allí. Facebook: una fila por Página (Meta solo publica en Páginas).
 */
export async function syncRelayedAccounts(workspaceId: string) {
  const profile = profileName(workspaceId);
  const r = await up<{ profile?: { social_accounts?: Record<string, SocialAccount | string | null> } }>(
    `/api/uploadposts/users/${encodeURIComponent(profile)}`,
  ).catch((e) => {
    // Aún no existe el perfil: no hay nada conectado
    if (e instanceof HttpError && e.status === 404) return { profile: { social_accounts: {} } };
    throw e;
  });
  const social: Record<string, SocialAccount | string | null> = r.profile?.social_accounts ?? {};

  const found: (NewAccount & { reauth: boolean })[] = [];
  for (const platform of relayPlatforms()) {
    const a = ALIASES[platform].map((k) => social[k]).find((v) => v && typeof v === "object");
    if (!a || typeof a !== "object") continue;
    const base = { access_token: NO_TOKEN, avatar: httpsOrNull(a.social_images), reauth: !!a.reauth_required };
    if (platform === "facebook") {
      const pages = await up<{ pages?: { page_id: string; page_name: string }[] }>(
        `/api/uploadposts/facebook/pages?profile=${encodeURIComponent(profile)}`,
      );
      for (const p of pages.pages ?? []) {
        found.push({
          ...base,
          platform,
          external_id: `up:fb:${p.page_id}`,
          name: p.page_name || "Página de Facebook",
          meta: { via: "uploadpost", profile, pageId: String(p.page_id) } satisfies RelayMeta,
        });
      }
      continue;
    }
    found.push({
      ...base,
      platform,
      external_id: `up:${a.username || a.handle || platform}`,
      name: a.display_name || (a.handle ? `@${a.handle}` : platform),
      meta: { via: "uploadpost", profile, handle: a.handle ?? null } satisfies RelayMeta,
    });
  }

  const ids: number[] = [];
  let overLimit = 0;
  for (const { reauth, ...a } of found) {
    try {
      const id = upsertAccount(workspaceId, a);
      if (reauth) markNeedsReauth(id);
      ids.push(id);
    } catch (e) {
      if (e instanceof ApiError && e.code === "plan_limit") overLimit++;
      else throw e;
    }
  }

  // Las que el cliente desconectó en la página de Upload-Post
  const current = db
    .prepare("SELECT id FROM accounts WHERE workspace_id = ? AND status != 'disconnected' AND external_id LIKE 'up:%'")
    .all(workspaceId) as { id: number }[];
  const removed: number[] = [];
  for (const { id } of current) {
    if (ids.includes(id)) continue;
    // Si no cupo por el plan, no es que la quitara: se deja como estaba
    if (overLimit) continue;
    disconnectAccount(workspaceId, id);
    removed.push(id);
  }
  log.info("uploadpost.synced", { workspaceId, accounts: ids.length, removed: removed.length, overLimit });
  return { ids, overLimit, removed };
}

/** Opciones de privacidad de TikTok que admite esa cuenta (hay que ofrecer solo esas). */
export async function relayedTiktokSettings(account: Pick<Account, "meta">) {
  const { profile } = relayMeta(account);
  return up<{
    privacy_level_options: string[];
    max_video_post_duration_sec?: number;
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
  }>(`/api/uploadposts/tiktok/settings?profile=${encodeURIComponent(profile)}`);
}

/** Al borrar la cuenta de Manny: borra su perfil en Upload-Post (y con él las conexiones a sus redes). */
export async function deleteRelayProfile(workspaceId: string) {
  // Con el perfil fijo de pruebas no se borra: es compartido
  if (!uploadPostEnabled() || profileName(workspaceId) !== `ep-${workspaceId}`) return;
  try {
    await up("/api/uploadposts/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: profileName(workspaceId) }) });
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return;
    throw e;
  }
}

const FB_TYPE: Record<string, string> = { video: "VIDEO", reel: "REELS", story: "STORIES" };

/** Campos del formulario de subida para esa red (docs.upload-post.com/api/upload-video). */
async function uploadForm(ctx: Parameters<Publisher["publish"]>[0], requestId: string) {
  const { account, post, media, filePath, caption, hashtags, options, cover } = ctx;
  const meta = relayMeta(account);
  const fd = new FormData();
  const title = clipWords(post.title || media.original_name.replace(/\.[^.]+$/, ""), YOUTUBE_TITLE_LIMIT);
  fd.append("user", meta.profile);
  fd.append("platform[]", UPLOAD_NAME[account.platform as RelayPlatform] ?? account.platform);
  fd.append("title", title);
  fd.append("async_upload", "true");
  fd.append("request_id", requestId);
  fd.append("external_id", `post-${post.id}`);
  const addCover = async (field: string) => {
    if (!cover.path) return;
    fd.append(field, await fileBlob(cover.path, coverMime(cover.path)), path.basename(cover.path));
  };

  switch (account.platform) {
    case "youtube":
      fd.append("youtube_title", title);
      fd.append("youtube_description", options.format === "short" ? withShortsTag(caption) : caption);
      for (const t of hashtags.map(normalizeHashtag).filter(Boolean).slice(0, 15)) fd.append("tags[]", t);
      fd.append("privacyStatus", "public");
      await addCover("thumbnail");
      break;
    case "instagram":
      fd.append("instagram_title", caption);
      fd.append("media_type", options.format === "story" ? "STORIES" : "REELS");
      if (options.format !== "story") fd.append("share_to_feed", options.format === "reel_only" ? "false" : "true");
      if (cover.offsetMs !== null) fd.append("thumb_offset", String(cover.offsetMs));
      break;
    case "facebook":
      if (!meta.pageId) throw new RejectedError("Falta la Página de Facebook: vuelve a conectar Facebook");
      fd.append("facebook_page_id", meta.pageId);
      fd.append("facebook_media_type", FB_TYPE[String(options.format)] ?? "VIDEO");
      fd.append("facebook_title", title);
      fd.append("facebook_description", caption);
      break;
    case "x":
      // 280 caracteres ya validados al programar; sin hilo aunque el texto fuera largo
      fd.append("x_title", caption);
      fd.append("x_long_text_as_post", "false");
      break;
    case "tiktok": {
      const o = TikTokOptionsSchema.parse(options);
      fd.append("tiktok_title", caption.slice(0, 2200));
      fd.append("post_mode", "DIRECT_POST");
      fd.append("privacy_level", o.privacyLevel);
      fd.append("disable_comment", String(!o.allowComment));
      fd.append("disable_duet", String(!o.allowDuet));
      fd.append("disable_stitch", String(!o.allowStitch));
      fd.append("brand_content_toggle", String(o.commercial.enabled && o.commercial.brandedContent));
      fd.append("brand_organic_toggle", String(o.commercial.enabled && o.commercial.yourBrand));
      if (cover.offsetMs !== null) fd.append("cover_timestamp", String(cover.offsetMs));
      // Solo algunas conexiones admiten portada propia; si no, Upload-Post la ignora con un aviso
      await addCover("tiktok_cover_image");
      break;
    }
    default:
      throw new RejectedError("Esta red no se puede publicar a través del servicio de publicación");
  }
  fd.append("video", await fileBlob(filePath, media.mime || "video/mp4"), media.original_name || "video.mp4");
  return fd;
}

type PlatformResult = {
  platform?: string;
  status?: string;
  success?: boolean;
  skipped?: boolean;
  url?: string;
  post_url?: string;
  post_id?: string;
  publish_id?: string;
  error?: string;
  message?: string;
};

function finished(r: PlatformResult, requestId: string, platformLabel: string) {
  if (r.skipped || r.status === "skipped") {
    throw new RejectedError(`${platformLabel} ya no está conectado en la página de conexión: vuelve a conectarlo en Cuentas`);
  }
  if (r.success === false || r.status === "failed") {
    throw new RejectedError(`${platformLabel} no publicó el vídeo: ${r.error ?? r.message ?? "sin motivo"}`);
  }
  const url = httpsOrNull(r.url) ?? httpsOrNull(r.post_url) ?? undefined;
  return { status: "done" as const, remoteId: String(r.post_id ?? r.publish_id ?? requestId), url };
}

const LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", x: "X" };

/** X no tiene conexión directa (la API de X es de pago por publicación): solo a través de Upload-Post. */
export const xDirect: Publisher = {
  async publish() {
    throw new RejectedError("X solo se puede publicar a través del servicio de publicación: conéctalo en Cuentas → «Conectar mis redes»");
  },
};

/**
 * Publicación a través de Upload-Post, en dos pasos que se pueden retomar:
 *  1. Enviar el vídeo con async_upload y un request_id nuestro. La cabecera Idempotency-Key lleva el
 *     mismo id: si el envío se corta y se repite, Upload-Post devuelve el trabajo que ya tenía en vez de
 *     publicar dos veces.
 *  2. Consultar /status con ese request_id hasta que la red termine.
 */
export const uploadPostPublisher: Publisher = {
  async publish(ctx) {
    const { account, ref, saveRef } = ctx;
    const label = LABEL[account.platform] ?? account.platform;
    if (typeof ref.requestId !== "string") {
      saveRef({ requestId: `ep-${ctx.post.id}-${account.id}-${Date.now().toString(36)}`, deadline: Date.now() + RESULT_TIMEOUT_MS });
    }
    const requestId = String(ref.requestId);

    if (!ref.accepted) {
      const body = await uploadForm(ctx, requestId);
      // A partir de aquí el vídeo puede quedar publicado aunque se corte la respuesta
      saveRef({ committed: true });
      let res: { results?: Record<string, PlatformResult>; request_id?: string; job_id?: string };
      try {
        res = await up("/api/upload", { method: "POST", headers: { "Idempotency-Key": requestId }, body }, uploadTimeoutMs(fileSize(ctx.filePath)));
      } catch (e) {
        // 4xx (salvo límites y tiempos): Upload-Post rechazó la petición y no llegó a publicar nada
        if (e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429) {
          throw new RejectedError(`${label}: ${e.message.replace(/^\d+\s*/, "")}`);
        }
        // Cupo mensual agotado: no se publicó y no se arregla reintentando en unos minutos
        if (e instanceof HttpError && e.status === 429 && /monthly limit/i.test(e.message)) {
          throw new RejectedError("El servicio de publicación ha llegado a su límite mensual de vídeos. Revisa tu plan de Upload-Post.");
        }
        if (e instanceof UploadPostKeyError) throw new RejectedError(e.message);
        throw e;
      }
      // Terminó en la misma petición (vídeos pequeños)
      const now = ALIASES[account.platform as RelayPlatform]?.map((k) => res.results?.[k]).find(Boolean);
      if (now) return finished(now, requestId, label);
      saveRef({ accepted: true });
      return { status: "wait", ms: POLL_MS };
    }

    let st: { status?: string; message?: string; results?: PlatformResult[] };
    try {
      st = await up(`/api/uploadposts/status?request_id=${encodeURIComponent(requestId)}`);
    } catch (e) {
      // Recién aceptado puede tardar en aparecer
      if (e instanceof HttpError && e.status === 404) st = { status: "pending" };
      else throw e;
    }
    const names = ALIASES[account.platform as RelayPlatform] ?? [account.platform];
    const r = st.results?.find((x) => names.includes(String(x.platform)));
    const platformDone = r && ["completed", "failed", "skipped"].includes(String(r.status));
    if (st.status === "completed" || platformDone) {
      if (r) return finished(r, requestId, label);
    }
    if (st.status === "failed") {
      if (r) return finished({ ...r, success: false }, requestId, label);
      // Sin resultados: Upload-Post dejó de tener noticias del envío. No sabemos si la red lo publicó.
      throw new UnknownOutcomeError(`${label}: el servicio de publicación no confirmó el resultado (${st.message ?? "sin respuesta"}). Compruébalo en la red.`);
    }
    if (Date.now() > Number(ref.deadline ?? 0)) {
      throw new UnknownOutcomeError(`${label} sigue procesando el vídeo: comprueba en la red si se publicó`);
    }
    return { status: "wait", ms: POLL_MS };
  },
};

/** Nombre de la red en la API de analítica de Upload-Post (X es «x»). */
const analyticsName = (p: string) => (p === "x" ? "x" : p);
/** Máximo de publicaciones cuyas métricas se piden en cada sincronización (su API las consulta en directo a la red). */
const MAX_POSTS_PER_SYNC = 40;

type AnalyticsData = {
  followers?: unknown;
  following?: unknown;
  video_count?: unknown;
  metric_type?: string;
  reach_timeseries?: { date: string; value: unknown }[];
};

/**
 * Analítica de las cuentas conectadas por Upload-Post (docs.upload-post.com/api/get-analytics):
 *  - perfil: seguidores y el último día de la serie diaria (alcance o visualizaciones, según la red);
 *  - publicaciones: las que publicamos nosotros por Upload-Post, con sus métricas por request_id.
 * Igual que el resto: null = la red no da ese dato; nunca se inventa un 0.
 */
export const relayInsights: Insights = {
  readScopes: [],
  async profile(account) {
    const meta = relayMeta(account);
    const name = analyticsName(account.platform);
    const q = new URLSearchParams({ platforms: name });
    if (account.platform === "facebook" && meta.pageId) q.set("page_id", meta.pageId);
    const r = await up<Record<string, AnalyticsData | string | undefined>>(`/api/analytics/${encodeURIComponent(meta.profile)}?${q}`);
    const d = [r[name], r.twitter].find((v): v is AnalyticsData => !!v && typeof v === "object");
    if (!d) return { followers: null, following: null, mediaCount: null };
    const last = d.reach_timeseries?.at(-1);
    const value = last ? num(last.value) : null;
    const metric: keyof MetricValues = d.metric_type === "reach" ? "reach" : "views";
    return {
      followers: num(d.followers),
      following: num(d.following),
      mediaCount: num(d.video_count),
      daily: last && /^\d{4}-\d{2}-\d{2}$/.test(last.date) && value !== null ? { day: last.date, metrics: { [metric]: value } } : null,
    };
  },
  async recentPosts(account, since) {
    const targets = db
      .prepare(
        `SELECT t.remote_id, t.remote_url, t.remote_ref, t.published_at, p.description, p.title FROM post_targets t JOIN posts p ON p.id = t.post_id
         WHERE t.account_id = ? AND t.status = 'published' AND t.published_at >= ? AND t.remote_id IS NOT NULL
         ORDER BY t.published_at DESC LIMIT ?`,
      )
      .all(account.id, since, MAX_POSTS_PER_SYNC) as {
      remote_id: string;
      remote_url: string | null;
      remote_ref: string | null;
      published_at: number;
      description: string;
      title: string;
    }[];
    const posts: RemotePost[] = [];
    let failedMetrics = 0;
    for (const t of targets) {
      const requestId = t.remote_ref ? (JSON.parse(t.remote_ref) as { requestId?: string }).requestId : undefined;
      let metrics: MetricValues = EMPTY_METRICS;
      if (requestId) {
        try {
          const r = await up<{ platforms?: Record<string, { post_metrics?: Record<string, unknown>; post_metrics_error?: string }> }>(
            `/api/uploadposts/post-analytics/${encodeURIComponent(requestId)}?platform=${analyticsName(account.platform)}`,
          );
          const names = ALIASES[account.platform as RelayPlatform] ?? [account.platform];
          const m = names.map((k) => r.platforms?.[k]).find(Boolean)?.post_metrics;
          if (m) {
            metrics = {
              ...EMPTY_METRICS,
              views: num(m.views ?? m.impressions ?? m.plays),
              reach: num(m.reach),
              likes: num(m.likes),
              comments: num(m.comments),
              shares: num(m.shares ?? m.retweets),
              saves: num(m.saves ?? m.saved),
            };
          } else failedMetrics++;
        } catch (e) {
          if (e instanceof UploadPostKeyError) throw e;
          failedMetrics++;
        }
      } else failedMetrics++;
      posts.push({
        remoteId: t.remote_id,
        mediaType: "video",
        caption: t.description || t.title || null,
        permalink: t.remote_url,
        thumbnailUrl: null,
        publishedAt: t.published_at,
        metrics,
      });
    }
    return { posts, failedMetrics };
  },
};
