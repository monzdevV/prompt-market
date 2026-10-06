import type { NewAccount } from "../accounts";
import { coverMime } from "../covers";
import { publishingEnabled } from "../features";
import {
  assertHost,
  fileBlob,
  fileSize,
  form,
  http,
  HttpError,
  redirectUri,
  RejectedError,
  UnknownOutcomeError,
  uploadTimeoutMs,
  type Connector,
  type PublishContext,
  type PublishOutcome,
  type Publisher,
} from "./common";

const V = process.env.META_GRAPH_VERSION ?? "v25.0";
export const GRAPH = `https://graph.facebook.com/${V}`;

/**
 * Permisos mínimos (cada uno pasa por App Review, así que no se pide ninguno que no se use):
 * - Lectura/analítica: listar Páginas, leer su interacción, perfil y métricas de Instagram.
 * - Publicación (solo si está activada): publicar Reels y vídeos en la Página.
 * `business_management` hace falta para Páginas gestionadas desde un Business Manager.
 */
function scopes() {
  const read = ["pages_show_list", "pages_read_engagement", "business_management", "instagram_basic", "instagram_manage_insights"];
  const publish = [
    ...(publishingEnabled("instagram") ? ["instagram_content_publish"] : []),
    ...(publishingEnabled("facebook") ? ["pages_manage_posts"] : []),
  ];
  return [...read, ...publish];
}

/** Un solo inicio de sesión con Facebook conecta tus Páginas y sus cuentas de Instagram profesionales. */
export const metaConnector: Connector = {
  id: "meta",
  label: "Facebook + Instagram",
  platforms: ["facebook", "instagram"],
  envVars: ["META_APP_ID", "META_APP_SECRET"],
  authUrl(state) {
    const q = form({
      client_id: process.env.META_APP_ID!,
      redirect_uri: redirectUri("meta"),
      response_type: "code",
      scope: scopes().join(","),
      state,
    });
    return `https://www.facebook.com/${V}/dialog/oauth?${q}`;
  },
  async callback(code) {
    const app = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
    const short = await http(`${GRAPH}/oauth/access_token?${form({ ...app, redirect_uri: redirectUri("meta"), code })}`);
    // Token de usuario de larga duración -> los tokens de Página derivados no caducan
    const long = await http(
      `${GRAPH}/oauth/access_token?${form({ ...app, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token })}`,
    );
    // Id del usuario de Facebook (ámbito de la app): lo usa el callback de eliminación de datos de Meta
    const me = await http<{ id: string }>(`${GRAPH}/me?${form({ fields: "id", access_token: long.access_token })}`);
    // Permisos que el usuario aceptó de verdad (en el diálogo puede desmarcar algunos)
    const perms = await http<{ data?: { permission: string; status: string }[] }>(
      `${GRAPH}/me/permissions?${form({ access_token: long.access_token })}`,
    );
    const granted = (perms.data ?? []).filter((p) => p.status === "granted").map((p) => p.permission);
    const pages: any[] = [];
    let next: string | undefined = `${GRAPH}/me/accounts?${form({
      fields: "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}",
      limit: "100",
      access_token: long.access_token,
    })}`;
    for (let i = 0; next && i < 10; i++) {
      const r: { data?: any[]; paging?: { next?: string } } = await http(next);
      pages.push(...(r.data ?? []));
      next = r.paging?.next;
    }
    // Instagram primero: con un plan limitado, las cuentas de Instagram (lo que la mayoría viene a
    // conectar) no se quedan fuera por haber ocupado antes los huecos con Páginas de Facebook
    const igAccounts: NewAccount[] = [];
    const out: NewAccount[] = [];
    for (const p of pages) {
      out.push({
        platform: "facebook",
        external_id: p.id,
        name: p.name,
        avatar: p.picture?.data?.url ?? null,
        access_token: p.access_token,
        meta: { fb_user_id: me.id },
        granted_scopes: granted,
      });
      const ig = p.instagram_business_account;
      if (ig) {
        igAccounts.push({
          platform: "instagram",
          external_id: ig.id,
          name: `@${ig.username}`,
          avatar: ig.profile_picture_url ?? null,
          access_token: p.access_token,
          meta: { page_id: p.id, username: ig.username, fb_user_id: me.id },
          granted_scopes: granted,
        });
      }
    }
    return { accounts: [...igAccounts, ...out] };
  },
};

const RUPLOAD_HOST = /^rupload\.facebook\.com$/;

/**
 * Reels (/video_reels) e historias (/video_stories) de Página, en tres pasos documentados:
 * start → subir bytes a rupload.facebook.com → finish. Solo `finish` publica, así que hasta ahí
 * reintentar es seguro; a partir de ahí un corte es incierto y pasa a «Comprobar».
 * developers.facebook.com/docs/video-api/guides/reels-publishing · developers.facebook.com/docs/page-stories-api
 */
async function publishPageShortForm(kind: "reel" | "story", ctx: PublishContext): Promise<PublishOutcome> {
  const { account, filePath, caption, ref, saveRef } = ctx;
  const tok = account.access_token;
  const edge = kind === "reel" ? "video_reels" : "video_stories";
  const what = kind === "reel" ? "el Reel" : "la historia";
  if (ref.committed) {
    throw new UnknownOutcomeError(`Se cortó al publicar ${what} en Facebook: comprueba en tu Página si salió`);
  }
  let videoId = typeof ref.videoId === "string" ? ref.videoId : null;
  let uploadUrl = typeof ref.uploadUrl === "string" ? assertHost(ref.uploadUrl, RUPLOAD_HOST) : null;
  if (!videoId || !uploadUrl) {
    const start = await http(`${GRAPH}/${account.external_id}/${edge}`, {
      method: "POST",
      body: form({ upload_phase: "start", access_token: tok }),
    });
    videoId = String(start.video_id);
    uploadUrl = assertHost(String(start.upload_url), RUPLOAD_HOST);
    saveRef({ videoId, uploadUrl, uploaded: false });
  }
  if (!ref.uploaded) {
    const size = fileSize(filePath);
    await http(
      uploadUrl,
      { method: "POST", headers: { Authorization: `OAuth ${tok}`, offset: "0", file_size: String(size) }, body: await fileBlob(filePath) },
      uploadTimeoutMs(size),
    );
    saveRef({ uploaded: true });
  }
  saveRef({ committed: true });
  let res: { success?: boolean; post_id?: string };
  try {
    res = await http(`${GRAPH}/${account.external_id}/${edge}`, {
      method: "POST",
      body: form(
        kind === "reel"
          ? { upload_phase: "finish", video_id: videoId, video_state: "PUBLISHED", description: caption, access_token: tok }
          : { upload_phase: "finish", video_id: videoId, access_token: tok },
      ),
    });
  } catch (e) {
    // 4xx definitivo: Facebook dijo que no (no se publicó); corte o 5xx: incierto
    if (e instanceof HttpError && !e.retryable && !e.auth) throw new RejectedError(e.message);
    throw new UnknownOutcomeError(`No sabemos si Facebook publicó ${what} (${e instanceof Error ? e.message : String(e)}). Compruébalo en tu Página.`);
  }
  if (res.success === false) throw new RejectedError(`Facebook no publicó ${what}`);
  const url = kind === "reel" ? `https://www.facebook.com/reel/${videoId}` : undefined;
  return { status: "done", remoteId: res.post_id ?? videoId, url };
}

export const facebook: Publisher = {
  /**
   * Vídeo normal: una sola petición que sube y publica. Si se corta a mitad no sabemos si Facebook
   * llegó a crear el vídeo, así que ese caso pasa a "revisar" en lugar de reintentarse.
   * Reel e historia: ver publishPageShortForm.
   */
  async publish(ctx) {
    if (ctx.options.format === "reel" || ctx.options.format === "story") return publishPageShortForm(ctx.options.format, ctx);
    const { account, filePath, caption, media, cover, ref, saveRef } = ctx;
    if (ref.committed) {
      throw new UnknownOutcomeError("La subida a Facebook se interrumpió: comprueba en tu Página si el vídeo se publicó");
    }
    const body = new FormData();
    body.append("access_token", account.access_token);
    body.append("description", caption);
    body.append("source", await fileBlob(filePath, media.mime), media.original_name);
    // Portada propia: `thumb` (imagen) en /{page-id}/videos — developers.facebook.com/docs/graph-api/reference/page/videos/
    if (cover.path) body.append("thumb", await fileBlob(cover.path, coverMime(cover.path)), `portada.${cover.path.endsWith(".png") ? "png" : "jpg"}`);
    saveRef({ committed: true });
    try {
      const r = await http(
        `https://graph-video.facebook.com/${V}/${account.external_id}/videos`,
        { method: "POST", body },
        uploadTimeoutMs(fileSize(filePath)),
      );
      return { status: "done", remoteId: r.id, url: `https://www.facebook.com/${r.id}` };
    } catch (e) {
      // Una respuesta 4xx es un rechazo definitivo (no se publicó); un corte o un 5xx es incierto
      if (e instanceof HttpError && !e.retryable && !e.auth) throw new RejectedError(e.message);
      throw new UnknownOutcomeError(
        `No sabemos si Facebook publicó el vídeo (${e instanceof Error ? e.message : String(e)}). Compruébalo en tu Página.`,
      );
    }
  },
};

// Meta recomienda consultar el estado del contenedor una vez por minuto durante 5 minutos como máximo
const IG_PROCESSING_TIMEOUT_MS = 5 * 60_000;
const IG_POLL_MS = 60_000;

/**
 * Reels de Instagram en pasos: contenedor -> subir bytes -> esperar procesado -> publicar.
 * Entre pasos el trabajo se libera ("wait") y se retoma; solo media_publish deja el Reel publicado.
 */
export const instagram: Publisher = {
  async publish({ account, filePath, caption, options, cover, ref, saveRef }) {
    const tok = account.access_token;
    // Formato: Reel (perfil + pestaña Reels), solo pestaña Reels, o historia (media_type=STORIES)
    const story = options.format === "story";
    const what = story ? "la historia" : "el Reel";
    let containerId = typeof ref.containerId === "string" ? ref.containerId : null;

    if (ref.committed && containerId) {
      // Se cortó durante media_publish: comprobamos si el contenedor llegó a publicarse
      const st = await http(`${GRAPH}/${containerId}?${form({ fields: "status_code", access_token: tok })}`);
      if (st.status_code === "PUBLISHED") {
        throw new UnknownOutcomeError(`Instagram publicó ${what} pero no pudimos obtener el enlace: compruébalo en tu perfil`);
      }
      if (st.status_code !== "FINISHED") {
        throw new UnknownOutcomeError(`Estado inesperado de ${what} en Instagram (${st.status_code}): compruébalo en tu perfil`);
      }
      // FINISHED y no publicado: es seguro volver a pedir la publicación
    }

    if (!containerId) {
      // thumb_offset: fotograma de portada en ms (vídeos y reels; las historias no llevan portada ni texto)
      const fields: Record<string, string> = story
        ? { media_type: "STORIES", upload_type: "resumable", access_token: tok }
        : {
            media_type: "REELS",
            upload_type: "resumable",
            caption,
            share_to_feed: options.format === "reel_only" ? "false" : "true",
            ...(cover.offsetMs !== null ? { thumb_offset: String(cover.offsetMs) } : {}),
            access_token: tok,
          };
      const container = await http(`${GRAPH}/${account.external_id}/media`, { method: "POST", body: form(fields) });
      containerId = container.id as string;
      saveRef({ containerId, uploaded: false });
    }

    if (!ref.uploaded) {
      const size = fileSize(filePath);
      await http(
        `https://rupload.facebook.com/ig-api-upload/${V}/${containerId}`,
        {
          method: "POST",
          headers: { Authorization: `OAuth ${tok}`, offset: "0", file_size: String(size) },
          body: await fileBlob(filePath),
        },
        uploadTimeoutMs(size),
      );
      saveRef({ uploaded: true, processingDeadline: Date.now() + IG_PROCESSING_TIMEOUT_MS });
      return { status: "wait", ms: IG_POLL_MS };
    }

    if (!ref.committed) {
      const st = await http(`${GRAPH}/${containerId}?${form({ fields: "status_code,status", access_token: tok })}`);
      if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
        throw new RejectedError(`Instagram no pudo procesar el vídeo: ${st.status ?? st.status_code}`);
      }
      if (st.status_code !== "FINISHED") {
        if (Date.now() > Number(ref.processingDeadline ?? 0)) throw new Error("Instagram tardó demasiado en procesar el vídeo");
        return { status: "wait", ms: IG_POLL_MS };
      }
    }

    // A partir de aquí un corte es incierto: el siguiente intento consulta el contenedor antes de nada
    saveRef({ committed: true });
    let pub: { id: string };
    try {
      pub = await http(`${GRAPH}/${account.external_id}/media_publish`, {
        method: "POST",
        body: form({ creation_id: containerId, access_token: tok }),
      });
    } catch (e) {
      // Instagram respondió que no (4xx definitivo): no se publicó y se puede reintentar sin duplicar
      if (e instanceof HttpError && !e.retryable && !e.auth) throw new RejectedError(e.message);
      throw e;
    }
    let url: string | undefined;
    try {
      url = (await http(`${GRAPH}/${pub.id}?${form({ fields: "permalink", access_token: tok })}`)).permalink;
    } catch {
      // El enlace es opcional: el Reel ya está publicado
    }
    return { status: "done", remoteId: pub.id, url };
  },
};
