import type { AccountWithTokens } from "../db";
import { tiktokChunks } from "../core/chunks";
import { TikTokOptionsSchema } from "../core/tiktok-options";
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
  type Publisher,
} from "./common";
import { publishingEnabled } from "../features";
import { refreshIfNeeded } from "./refresh";

export const API = "https://open.tiktokapis.com/v2";
/**
 * TikTok rechaza como «malformed» el Content-Type que pone fetch por defecto a un URLSearchParams
 * (`application/x-www-form-urlencoded;charset=UTF-8`): hay que mandarlo exacto, como en su documentación.
 * developers.tiktok.com/doc/oauth-user-access-token-management
 */
export const TIKTOK_FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" };
const STATUS_TIMEOUT_MS = 20 * 60_000;

export async function tt(path: string, token: string, body?: unknown) {
  const r = await http(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body ?? {}),
  });
  if (r.error && r.error.code !== "ok") throw new Error(`TikTok: ${r.error.message || r.error.code}`);
  return r.data;
}

/**
 * Motivos documentados por los que TikTok rechaza iniciar una publicación, en palabras del usuario.
 * En init aún no se ha publicado nada: es un rechazo definitivo (RejectedError) salvo límites pasajeros.
 * developers.tiktok.com/doc/content-posting-api-reference-direct-post (Error handling)
 */
const TIKTOK_INIT_ERRORS: Record<string, string> = {
  unaudited_client_can_only_post_to_private_accounts:
    "Tu cuenta de TikTok tiene que estar en privado mientras TikTok revisa esta app. Ponla en privado (Perfil → Configuración y privacidad → Privacidad → Cuenta privada) y pulsa Reintentar.",
  spam_risk_too_many_posts: "Has llegado al máximo de publicaciones diarias desde apps en esta cuenta de TikTok. Prueba mañana.",
  spam_risk_user_banned_from_posting: "TikTok no permite publicar a esta cuenta ahora mismo.",
  reached_active_user_cap: "TikTok ha limitado por hoy las publicaciones desde esta app. Prueba más tarde.",
  privacy_level_option_mismatch: "La privacidad elegida ya no está disponible en esta cuenta de TikTok: elígela de nuevo.",
  scope_not_authorized: "Falta el permiso de publicación de TikTok: vuelve a conectar la cuenta en Cuentas.",
};

function tiktokInitError(e: unknown) {
  if (!(e instanceof HttpError)) return e;
  const code = /\[([a-z_]+)\]$/.exec(e.message)?.[1];
  const friendly = code ? TIKTOK_INIT_ERRORS[code] : undefined;
  if (!friendly || e.retryable || e.auth) return e;
  return new RejectedError(friendly);
}

export type CreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec?: number;
};

/** Datos que TikTok obliga a mostrar antes de publicar (avatar, nombre, opciones de privacidad…). */
export async function creatorInfo(account: AccountWithTokens): Promise<CreatorInfo> {
  const d = await tt("/post/publish/creator_info/query/", account.access_token);
  return { ...d, privacy_level_options: d.privacy_level_options ?? [] };
}

export const tiktokConnector: Connector = {
  id: "tiktok",
  label: "TikTok",
  platforms: ["tiktok"],
  envVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
  authUrl(state) {
    const q = form({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      // Perfil y estadísticas de la cuenta, lista de vídeos con métricas y (si está activada) publicación
      scope: ["user.info.basic", "user.info.profile", "user.info.stats", "video.list", ...(publishingEnabled("tiktok") ? ["video.publish"] : [])].join(","),
      response_type: "code",
      redirect_uri: redirectUri("tiktok"),
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
  },
  async callback(code) {
    const tok = await http(`${API}/oauth/token/`, {
      method: "POST",
      headers: TIKTOK_FORM_HEADERS,
      body: form({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri("tiktok"),
      }),
    });
    if (tok.error) throw new Error(`TikTok: ${tok.error_description || tok.error}`);
    const me = await http(`${API}/user/info/?fields=open_id,display_name,avatar_url,username`, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const u = me.data.user;
    return {
      identity: { provider: "tiktok", subject: u.open_id, email: null, emailVerified: false, name: u.display_name ?? "" },
      accounts: [
      {
        platform: "tiktok" as const,
        external_id: u.open_id,
        name: u.display_name,
        avatar: u.avatar_url ?? null,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expires_at: Date.now() + tok.expires_in * 1000,
        meta: { username: u.username ?? null },
        granted_scopes: typeof tok.scope === "string" ? tok.scope.split(",") : [],
      },
      ],
    };
  },
};

export const tiktok: Publisher = {
  refresh: (account) =>
    refreshIfNeeded(account, async (a) => {
      const tok = await http(`${API}/oauth/token/`, {
        method: "POST",
        headers: TIKTOK_FORM_HEADERS,
        body: form({
          client_key: process.env.TIKTOK_CLIENT_KEY!,
          client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: a.refresh_token!,
        }),
      });
      if (tok.error) throw new HttpError(400, `TikTok: ${tok.error_description || tok.error}`);
      // El refresh token de TikTok rota: hay que guardar el nuevo
      return { access: tok.access_token, refresh: tok.refresh_token, expiresInS: tok.expires_in };
    }),

  /**
   * Direct Post en pasos: init (guarda publish_id) -> subir trozos -> consultar estado.
   * En cuanto TikTok recibe el último trozo publica solo, por eso committed se marca antes de subir.
   */
  async publish({ account, media, filePath, caption, options, cover, ref, saveRef }) {
    const tok = account.access_token;

    if (ref.publishId && !ref.uploaded) {
      if (!ref.committed) {
        saveRef({ publishId: undefined });
      } else {
        // Se cortó durante la subida. Si TikTok marca FAILED, no publicó y empezamos de nuevo.
        // Si sigue en PROCESSING_UPLOAD no sabemos si llegó el último trozo: mejor revisar que duplicar.
        const st = await tt("/post/publish/status/fetch/", tok, { publish_id: ref.publishId });
        if (st.status === "FAILED") {
          saveRef({ publishId: undefined, committed: false });
        } else if (st.status === "PROCESSING_UPLOAD") {
          throw new UnknownOutcomeError("La subida a TikTok se interrumpió: comprueba en la app si el vídeo se publicó");
        } else {
          saveRef({ uploaded: true, statusDeadline: Date.now() + STATUS_TIMEOUT_MS });
        }
      }
    }

    if (!ref.publishId) {
      const o = TikTokOptionsSchema.parse(options);
      const creator = await creatorInfo(account);
      if (!creator.privacy_level_options.includes(o.privacyLevel)) {
        throw new Error("La privacidad elegida ya no está disponible en esta cuenta de TikTok: elígela de nuevo");
      }
      const maxS = creator.max_video_post_duration_sec;
      if (maxS && media.duration_s && media.duration_s > maxS) {
        throw new Error(`El vídeo dura ${Math.round(media.duration_s)} s y TikTok permite ${maxS} s en esta cuenta`);
      }
      const size = fileSize(filePath);
      const { chunkSize, count } = tiktokChunks(size);
      const init = await tt("/post/publish/video/init/", tok, {
        post_info: {
          title: caption.slice(0, 2200),
          privacy_level: o.privacyLevel,
          disable_comment: !o.allowComment || creator.comment_disabled,
          disable_duet: !o.allowDuet || creator.duet_disabled,
          disable_stitch: !o.allowStitch || creator.stitch_disabled,
          brand_content_toggle: o.commercial.enabled && o.commercial.brandedContent,
          brand_organic_toggle: o.commercial.enabled && o.commercial.yourBrand,
          // Portada: fotograma en ms (TikTok no admite subir una imagen propia como portada)
          ...(cover.offsetMs !== null ? { video_cover_timestamp_ms: cover.offsetMs } : {}),
        },
        source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunkSize, total_chunk_count: count },
      }).catch((e) => {
        throw tiktokInitError(e);
      });
      saveRef({ publishId: init.publish_id, uploadUrl: init.upload_url, username: creator.creator_username ?? null });
    }

    if (!ref.uploaded) {
      const size = fileSize(filePath);
      const blob = await fileBlob(filePath);
      saveRef({ committed: true });
      for (const { start, end } of tiktokChunks(size).ranges) {
        let res: Response;
        try {
          res = await fetch(assertHost(String(ref.uploadUrl), /(^|\.)(tiktokapis|tiktok|tiktokv|byteoversea)\.com$/), {
            method: "PUT",
            headers: {
              "Content-Type": media.mime || "video/mp4",
              "Content-Length": String(end - start),
              "Content-Range": `bytes ${start}-${end - 1}/${size}`,
            },
            body: blob.slice(start, end),
            signal: AbortSignal.timeout(uploadTimeoutMs(end - start)),
          });
        } catch (e) {
          throw new HttpError(0, `Se cortó la subida a TikTok: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (!res.ok) throw new HttpError(res.status, `TikTok subida ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      saveRef({ uploaded: true, statusDeadline: Date.now() + STATUS_TIMEOUT_MS });
      return { status: "wait", ms: 5000 };
    }

    const st = await tt("/post/publish/status/fetch/", tok, { publish_id: ref.publishId });
    if (st.status === "PUBLISH_COMPLETE") {
      const id = st.publicaly_available_post_id?.[0];
      const user = typeof ref.username === "string" ? ref.username : null;
      return {
        status: "done",
        remoteId: id ? String(id) : String(ref.publishId),
        url: id && user ? `https://www.tiktok.com/@${user}/video/${id}` : undefined,
      };
    }
    if (st.status === "SEND_TO_USER_INBOX") return { status: "done", remoteId: String(ref.publishId) };
    if (st.status === "FAILED") throw new RejectedError(`TikTok rechazó el vídeo: ${st.fail_reason ?? "sin motivo"}`);
    if (Date.now() > Number(ref.statusDeadline ?? 0)) {
      throw new UnknownOutcomeError("TikTok sigue procesando el vídeo: comprueba en la app si se publicó");
    }
    return { status: "wait", ms: 5000 };
  },

};
