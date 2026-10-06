import { clipWords, YOUTUBE_TITLE_LIMIT } from "../core/caption";
import {
  assertHost,
  fileBlob,
  fileSize,
  form,
  http,
  HttpError,
  redirectUri,
  RejectedError,
  uploadTimeoutMs,
  type Connector,
  type SocialIdentity,
  type PublishContext,
  type PublishOutcome,
  type Publisher,
} from "./common";

import { refreshIfNeeded } from "./refresh";
import { coverMime } from "../covers";
import { log } from "../log";

const GOOGLE_UPLOAD_HOST = /(^|\.)googleapis\.com$/;

/**
 * Lectura al conectar (canal, vídeos y analítica). La subida se pide solo cuando el usuario
 * va a publicar, con autorización incremental (include_granted_scopes), como recomienda Google.
 */
export const YT_READ_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];
export const YT_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

/** ¿Puede publicar esta cuenta? Las conectadas antes de guardar permisos pidieron la subida al conectar. */
export function youtubeCanUpload(grantedScopes: string | null) {
  return grantedScopes === null || grantedScopes.split(" ").includes(YT_UPLOAD_SCOPE);
}

/**
 * Identidad de Google a partir del ID token. Llega directamente del endpoint de tokens de Google por
 * HTTPS (no del navegador), así que según la documentación no hace falta verificar la firma; sí se
 * comprueba que va dirigido a nuestra app (aud), quién lo emite (iss) y que no ha caducado.
 * developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo
 */
export function googleIdentity(idToken: unknown, now = Date.now()): Omit<SocialIdentity, "name"> | null {
  if (typeof idToken !== "string") return null;
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  let claims: { sub?: string; aud?: string; iss?: string; exp?: number; email?: string; email_verified?: boolean };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!claims.sub || claims.aud !== process.env.GOOGLE_CLIENT_ID) return null;
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
  if (!claims.exp || claims.exp * 1000 < now) return null;
  return { provider: "google", subject: claims.sub, email: claims.email?.toLowerCase() ?? null, emailVerified: claims.email_verified === true };
}

export const youtubeConnector: Connector = {
  id: "youtube",
  label: "YouTube",
  platforms: ["youtube"],
  envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  pkce: true,
  authUrl(state, codeChallenge, opts) {
    const q = form({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri("youtube"),
      response_type: "code",
      // openid + email: identifican a la persona para «Entrar con Google» (permisos básicos, no sensibles).
      // loginOnly: solo eso (YouTube se conecta por otra vía), así Google no muestra el aviso de app sin verificar
      scope: (opts?.loginOnly
        ? ["openid", "email", "profile"]
        : ["openid", "email", ...YT_READ_SCOPES, ...(opts?.publish ? [YT_UPLOAD_SCOPE] : [])]
      ).join(" "),
      include_granted_scopes: "true",
      access_type: "offline",
      prompt: "consent",
      state,
      ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: "S256" } : {}),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  },
  async callback(code, codeVerifier) {
    const tok = await http("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: form({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri("youtube"),
        grant_type: "authorization_code",
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
    // El usuario puede aceptar solo algunos permisos: guardamos los concedidos de verdad
    const granted = typeof tok.scope === "string" ? tok.scope.split(" ") : [];
    // Solo inicio de sesión (sin permisos de YouTube): no hay canal que conectar
    const canRead = YT_READ_SCOPES.some((s) => granted.includes(s));
    const ch = canRead
      ? await http("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
          headers: { Authorization: `Bearer ${tok.access_token}` },
        })
      : { items: [] };
    const accounts = (ch.items ?? []).map((c: any) => ({
      platform: "youtube" as const,
      external_id: c.id,
      name: c.snippet.title,
      avatar: c.snippet.thumbnails?.default?.url ?? null,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? null,
      expires_at: Date.now() + tok.expires_in * 1000,
      granted_scopes: granted,
    }));
    const identity = googleIdentity(tok.id_token);
    return { accounts, identity: identity ? { ...identity, name: accounts[0]?.name ?? identity.email ?? "" } : undefined };
  },
};

async function uploadedVideo(res: Response) {
  const video = await res.json();
  return { status: "done" as const, remoteId: video.id as string, url: `https://www.youtube.com/watch?v=${video.id}` };
}

/**
 * Miniatura personalizada: POST /upload/youtube/v3/thumbnails/set?videoId= (scope youtube.upload, JPEG/PNG).
 * developers.google.com/youtube/v3/docs/thumbnails/set
 * YouTube solo la acepta en canales con las miniaturas personalizadas activadas (canal verificado por
 * teléfono): si no, responde 403. El vídeo ya está publicado, así que un fallo aquí no lo deshace:
 * se registra y el vídeo queda con la miniatura automática.
 */
async function setThumbnail(accessToken: string, videoId: string, file: string) {
  const res = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": coverMime(file) },
    body: await fileBlob(file),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new HttpError(res.status, `YouTube ${res.status} al poner la miniatura: ${(await res.text()).slice(0, 200)}`);
}

/** «Short»: YouTube lo decide por duración y proporción; #Shorts en la descripción ayuda a que lo clasifique. */
export function withShortsTag(caption: string) {
  return /(^|\s)#shorts\b/i.test(caption) ? caption : `${caption}\n\n#Shorts`.trim();
}

async function publishVideo(ctx: PublishContext): Promise<PublishOutcome> {
  const out = await uploadVideo(ctx);
  if (out.status === "done" && ctx.cover.path) {
    try {
      await setThumbnail(ctx.account.access_token, out.remoteId, ctx.cover.path);
    } catch (e) {
      log.warn("youtube.thumbnail_failed", { videoId: out.remoteId, err: e });
    }
  }
  return out;
}

export const youtube: Publisher = {
  refresh: (account) =>
    refreshIfNeeded(account, async (a) => {
      const tok = await http("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: form({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: a.refresh_token!,
          grant_type: "refresh_token",
        }),
      });
      return { access: tok.access_token, refresh: null, expiresInS: tok.expires_in };
    }),

  /**
   * Subida reanudable de YouTube. La URL de la sesión se guarda antes de enviar bytes:
   * si el proceso se corta, se pregunta a YouTube cuánto recibió y se continúa desde ahí.
   * El vídeo solo existe cuando la subida termina, así que reanudar nunca lo duplica.
   */
  publish: publishVideo,
};

async function uploadVideo({ account, post, media, filePath, caption, hashtags, options, ref, saveRef }: PublishContext): Promise<PublishOutcome> {
  {
    if (options.format === "short") caption = withShortsTag(caption);
    const size = fileSize(filePath);
    let uploadUrl = typeof ref.uploadUrl === "string" ? assertHost(ref.uploadUrl, GOOGLE_UPLOAD_HOST) : null;
    let offset = 0;

    if (uploadUrl) {
      let st: Response;
      try {
        st = await fetch(uploadUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${account.access_token}`, "Content-Range": `bytes */${size}` },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (e) {
        throw new HttpError(0, `Sin conexión con YouTube al comprobar la subida: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (st.status === 200 || st.status === 201) return uploadedVideo(st);
      if (st.status === 308) {
        const range = st.headers.get("range");
        offset = range ? Number(range.split("-")[1]) + 1 : 0;
      } else if (st.status === 404 || st.status === 410) {
        // Sesión caducada: YouTube no llegó a crear el vídeo, se empieza de cero
        uploadUrl = null;
      } else {
        throw new HttpError(st.status, `YouTube ${st.status} al comprobar la subida`);
      }
    }

    if (!uploadUrl) {
      const title = clipWords(post.title || media.original_name.replace(/\.[^.]+$/, ""), YOUTUBE_TITLE_LIMIT);
      const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(size),
          "X-Upload-Content-Type": media.mime,
        },
        body: JSON.stringify({
          snippet: { title, description: caption, tags: hashtags.slice(0, 15), categoryId: "22" },
          // Mientras el proyecto de Google no pase la auditoría, YouTube deja los vídeos en privado
          status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
        }),
      });
      if (!init.ok) {
        const text = await init.text();
        let msg = text.slice(0, 300);
        try {
          msg = JSON.parse(text).error.message;
        } catch {
          // Cuerpo no JSON
        }
        throw new HttpError(init.status, `YouTube ${init.status}: ${msg}`);
      }
      const location = init.headers.get("location");
      if (!location) throw new Error("YouTube no devolvió la URL de subida");
      uploadUrl = assertHost(location, GOOGLE_UPLOAD_HOST);
      saveRef({ uploadUrl, committed: true });
      offset = 0;
    }

    const blob = await fileBlob(filePath);
    let res: Response;
    try {
      res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": media.mime,
          // Content-Length lo pone fetch a partir del Blob
          ...(offset ? { "Content-Range": `bytes ${offset}-${size - 1}/${size}` } : {}),
        },
        body: blob.slice(offset),
        signal: AbortSignal.timeout(uploadTimeoutMs(size - offset)),
      });
    } catch (e) {
      // Corte de red: el siguiente intento consulta la sesión y continúa
      throw new HttpError(0, `Se cortó la subida a YouTube: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (res.status === 200 || res.status === 201) return uploadedVideo(res);
    // 308 = la subida quedó incompleta pero la sesión sigue viva: el siguiente intento consulta y continúa
    if (res.status === 308) throw new HttpError(0, "La subida a YouTube quedó incompleta; se reanudará");
    const err = new HttpError(res.status, `YouTube ${res.status}: ${(await res.text()).slice(0, 300)}`);
    // 4xx (salvo permisos/límites) = YouTube rechazó el vídeo: no existe y se puede reintentar desde cero
    if (!err.retryable && !err.auth && res.status !== 403) throw new RejectedError(err.message);
    throw err;
  }
}
