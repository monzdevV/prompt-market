import fs from "node:fs";
import type { AccountWithTokens, Media, Platform, Post } from "../db";
import type { NewAccount } from "../accounts";

export const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Códigos de la Graph API de Meta que llegan con HTTP 400 pero son pasajeros (límites de uso, errores temporales)
// Fuente: developers.facebook.com/docs/graph-api/overview/rate-limiting (4, 17, 32 y 80001-80009 de Business Use Case).
// El resto de errores temporales llegan marcados con is_transient.
const META_TRANSIENT_CODES = new Set([4, 17, 32, 80001, 80002, 80003, 80004, 80005, 80006, 80007, 80008, 80009]);
// Token caducado o revocado en Meta
const META_AUTH_CODE = 190;

/** Error HTTP de una red. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail: { code?: number; transient?: boolean } = {},
  ) {
    super(message);
  }
  /** El fallo puede ser pasajero (429, 5xx, red caída o error temporal declarado por la red). */
  get retryable() {
    return (
      this.status === 0 ||
      this.status === 408 ||
      this.status === 429 ||
      this.status >= 500 ||
      !!this.detail.transient ||
      (this.detail.code !== undefined && META_TRANSIENT_CODES.has(this.detail.code))
    );
  }
  /** El permiso (token) ya no vale: hay que reconectar la cuenta. */
  get auth() {
    return this.status === 401 || this.detail.code === META_AUTH_CODE;
  }
}

/**
 * No sabemos si la red llegó a publicar (p. ej. se cortó la conexión justo en el paso que publica).
 * El destino pasa a "revisar" y nunca se reintenta solo: reintentar podría duplicar el vídeo.
 */
export class UnknownOutcomeError extends Error {}

/**
 * La red confirma que NO publicó el vídeo (lo rechazó o falló su procesado). Es el único error
 * que deja un destino ya "committed" como fallido reintentable.
 */
export class RejectedError extends Error {}

/**
 * Progreso guardado en post_targets.remote_ref. Cada adaptador guarda lo necesario para continuar
 * y marca committed=true justo ANTES del paso que puede dejar el vídeo publicado.
 */
export type RemoteRef = { committed?: boolean } & Record<string, unknown>;

export type PublishContext = {
  account: AccountWithTokens;
  post: Post;
  media: Media;
  filePath: string;
  /** Descripción + hashtags ya formateados */
  caption: string;
  hashtags: string[];
  options: Record<string, unknown>;
  /** Portada: imagen propia (ruta en disco, si existe) y/o fotograma elegido en ms */
  cover: { path: string | null; offsetMs: number | null };
  ref: RemoteRef;
  /** Guarda (y fusiona) el progreso en la base de forma síncrona antes de seguir. */
  saveRef(patch: RemoteRef): void;
};

export type PublishOutcome =
  | { status: "done"; remoteId: string; url?: string }
  /** Aún procesando en la red: vuelve a llamarme dentro de ms sin ocupar al ejecutor. */
  | { status: "wait"; ms: number };

/**
 * Quién es la persona en la red (para «Entrar con Google/TikTok»). `subject` es su id estable en
 * esa red (Google: `sub` del ID token; TikTok: `open_id`). TikTok no da email.
 */
export type SocialIdentity = {
  provider: "google" | "tiktok";
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
};

export type ConnectResult = { accounts: NewAccount[]; identity?: SocialIdentity };

/** Un "conector" de OAuth. Meta crea cuentas de Facebook e Instagram con un solo login. */
export type Connector = {
  id: string;
  label: string;
  platforms: Platform[];
  envVars: string[];
  /** Si usa PKCE, authUrl recibe el reto y callback el verificador. */
  pkce?: boolean;
  /**
   * `publish`: pedir también los permisos de publicación (autorización incremental donde la red lo permite).
   * `loginOnly`: solo identificar a la persona para «Entrar con…», sin conectar la red (sin permisos sensibles).
   */
  authUrl(state: string, codeChallenge?: string, opts?: { publish?: boolean; loginOnly?: boolean }): string;
  callback(code: string, codeVerifier?: string): Promise<ConnectResult>;
};

export type Publisher = {
  publish(ctx: PublishContext): Promise<PublishOutcome>;
  /** Renueva el token si está a punto de caducar. Devuelve la cuenta actualizada. */
  refresh?(account: AccountWithTokens): Promise<AccountWithTokens>;
};

export function redirectUri(connector: string) {
  return `${APP_URL()}/api/oauth/${connector}/callback`;
}

export function configured(envVars: string[]) {
  return envVars.every((v) => !!process.env[v]);
}

function errorMessage(body: any, text: string) {
  const msg =
    body?.error?.message ?? body?.error_description ?? body?.error?.code ?? body?.message ?? body?.error ?? text.slice(0, 300);
  return typeof msg === "string" ? msg : JSON.stringify(msg).slice(0, 300);
}

/**
 * Tiempo máximo para subir `bytes` a una red: 10 min + 1 min por cada 20 MB (≈ 330 kB/s mínimo).
 * Evita que una conexión colgada ocupe un hueco de publicación indefinidamente.
 */
export function uploadTimeoutMs(bytes: number) {
  return 10 * 60_000 + Math.ceil(bytes / (20 * 1024 * 1024)) * 60_000;
}

/** fetch + JSON + errores tipados. Para subidas de vídeo pasa uploadTimeoutMs(tamaño). */
export async function http<T = any>(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, timeoutMs ? { ...init, signal: AbortSignal.timeout(timeoutMs) } : init);
  } catch (e) {
    throw new HttpError(0, `Sin conexión con ${new URL(url).host}: ${e instanceof Error ? e.message : String(e)}`);
  }
  const text = await res.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // Respuesta no JSON: se queda como texto
  }
  if (!res.ok) {
    const code = typeof body?.error?.code === "number" ? body.error.code : undefined;
    // TikTok devuelve el motivo como texto (p. ej. «unaudited_client_can_only_post_to_private_accounts»): se conserva
    const textCode = typeof body?.error?.code === "string" && body.error.code !== "ok" ? ` [${body.error.code}]` : "";
    throw new HttpError(res.status, `${res.status} ${errorMessage(body, text)}${textCode}`, { code, transient: body?.error?.is_transient === true });
  }
  return body as T;
}

export function form(data: Record<string, string>) {
  return new URLSearchParams(data);
}

export function fileSize(file: string) {
  return fs.statSync(file).size;
}

/** El fichero como Blob respaldado por disco: se envía en streaming, sin cargarlo entero en memoria. */
export function fileBlob(file: string, type?: string) {
  return fs.openAsBlob(file, type ? { type } : undefined);
}

/** Comprueba que una URL guardada (p. ej. de subida) es https y del proveedor esperado. */
export function assertHost(url: string, allowed: RegExp) {
  let host = "";
  try {
    const u = new URL(url);
    host = u.protocol === "https:" ? u.hostname : "";
  } catch {
    // URL inválida
  }
  if (!host || !allowed.test(host)) throw new Error("URL de subida no válida");
  return url;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
