import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { badRequest } from "../errors";
import { log } from "../log";
import { getTranscriber } from "../transcriber";
import { MannyError } from "./llm";

/*
 * Lectura de vídeos y perfiles públicos de TikTok y YouTube con yt-dlp, en este ordenador.
 * No hay API oficial para ver las métricas de otras cuentas: se lee lo mismo que ve cualquiera en la web.
 * TikTok bloquea a yt-dlp si no se hace pasar por un navegador, por eso va con --impersonate (curl_cffi).
 */

export type Platform = "tt" | "yt";

export type VideoMeta = {
  platform: Platform;
  id: string;
  url: string;
  handle: string;
  caption: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  duration: number | null;
  postedAt: number | null;
  thumb: string | null;
  music: string | null;
  hashtags: string[];
};

export type ProfileMeta = {
  handle: string;
  nickname: string;
  followers: number | null;
  bio: string;
  videos: VideoMeta[];
};

const TT_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);
const TT_SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

/** Sin el @ y en minúsculas, o null si no parece un usuario. */
export function cleanHandle(raw: string, platform: Platform): string | null {
  const h = raw.trim().replace(/^@/, "").replace(/\/+$/, "");
  const ok = platform === "tt" ? /^[A-Za-z0-9._]{1,40}$/ : /^[A-Za-z0-9._-]{1,60}$/;
  return ok.test(h) ? h.toLowerCase() : null;
}

/** Acepta @usuario o el enlace del perfil/canal. */
export function parseAccount(input: string, platform: Platform): string | null {
  const t = input.trim();
  if (!/^https?:\/\//i.test(t)) return cleanHandle(t, platform);
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  const first = u.pathname.split("/").filter(Boolean)[0] ?? "";
  if (platform === "tt" && TT_HOSTS.has(u.hostname) && first.startsWith("@")) return cleanHandle(first, "tt");
  if (platform === "yt" && YT_HOSTS.has(u.hostname) && first.startsWith("@")) return cleanHandle(first, "yt");
  return null;
}

export type ParsedVideoUrl = { platform: Platform; id: string | null; handle: string | null; url: string; short: boolean };

/** Reconoce enlaces de vídeo de TikTok y YouTube. Cualquier otro sitio se rechaza (nunca se pasa a yt-dlp). */
export function parseVideoUrl(input: string): ParsedVideoUrl | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (TT_SHORT_HOSTS.has(u.hostname)) return { platform: "tt", id: null, handle: null, url: u.toString(), short: true };
  if (TT_HOSTS.has(u.hostname)) {
    const m = u.pathname.match(/^\/@([A-Za-z0-9._]+)\/(?:video|photo)\/(\d{8,25})/);
    if (!m) return null;
    return { platform: "tt", id: m[2], handle: m[1].toLowerCase(), url: `https://www.tiktok.com/@${m[1]}/video/${m[2]}`, short: false };
  }
  if (YT_HOSTS.has(u.hostname)) {
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,20})/)?.[1] ?? null;
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return { platform: "yt", id, handle: null, url: `https://www.youtube.com/watch?v=${id}`, short: false };
  }
  return null;
}

/** Los enlaces cortos de TikTok (vm.tiktok.com) redirigen al vídeo: se sigue la redirección sin salir de TikTok. */
export async function resolveShortLink(url: string): Promise<ParsedVideoUrl> {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(12_000) });
    const loc = res.headers.get("location");
    const parsed = loc ? parseVideoUrl(new URL(loc, url).toString()) : null;
    if (parsed && !parsed.short) return parsed;
  } catch {
    // Se trata abajo
  }
  throw new MannyError("No he podido abrir ese enlace corto de TikTok. Pega el enlace largo del vídeo (el que sale en el navegador).");
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
export const extractHashtags = (text: string) => [...new Set((text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.toLowerCase()))].slice(0, 15);

type Raw = Record<string, unknown>;

/** Convierte un vídeo tal como lo da yt-dlp (completo o de listado) a nuestro formato. */
export function toMeta(d: Raw, platform: Platform, handleHint = ""): VideoMeta | null {
  const id = typeof d.id === "string" || typeof d.id === "number" ? String(d.id) : "";
  if (!id) return null;
  const handle = String(d.uploader ?? handleHint).replace(/^@/, "").toLowerCase() || handleHint.toLowerCase();
  const caption = String(d.description || d.title || "").trim();
  const duration = num(d.duration);
  const ts = num(d.timestamp);
  let url: string;
  if (platform === "tt") url = `https://www.tiktok.com/@${handle}/video/${id}`;
  else url = duration !== null && duration <= 180 ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  const thumbs = Array.isArray(d.thumbnails) ? (d.thumbnails as Raw[]) : [];
  const thumb = (thumbs.find((t) => t.id === "cover") ?? thumbs[0])?.url ?? (typeof d.thumbnail === "string" ? d.thumbnail : null);
  const music = platform === "tt" && typeof d.track === "string" && d.track ? d.track + (Array.isArray(d.artists) && d.artists[0] ? ` · ${d.artists[0]}` : "") : null;
  return {
    platform,
    id,
    url,
    handle,
    caption,
    views: num(d.view_count),
    likes: num(d.like_count),
    comments: num(d.comment_count),
    shares: num(d.repost_count),
    saves: num(d.save_count),
    duration,
    postedAt: ts ? ts * 1000 : null,
    thumb: typeof thumb === "string" ? thumb : null,
    music,
    hashtags: extractHashtags(caption),
  };
}

/* ───────────── yt-dlp ───────────── */

function ytdlpCommand(): [string, string[]] {
  const custom = process.env.MANNY_YTDLP;
  if (custom) return [custom, []];
  return [process.env.PYTHON_BIN || "python", ["-m", "yt_dlp"]];
}

function safeEnv() {
  const keep = /^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG|LC_.*|PYTHON.*|XDG_.*|VIRTUAL_ENV|CONDA_.*)$/i;
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => keep.test(k)));
  return { ...env, PYTHONIOENCODING: "utf-8" } as unknown as NodeJS.ProcessEnv;
}

function friendlyYtdlpError(stderr: string, platform: Platform | null): MannyError {
  if (/No module named yt_dlp|not recognized|ENOENT/i.test(stderr)) {
    return new MannyError("Falta yt-dlp en este ordenador. Instálalo con «pip install yt-dlp curl_cffi» y vuelve a intentarlo.");
  }
  if (/impersonat|curl_cffi/i.test(stderr) && /not available|no impersonate|requires/i.test(stderr)) {
    return new MannyError("Falta curl_cffi para que TikTok no bloquee la lectura. Instálalo con «pip install curl_cffi».");
  }
  if (/private|login|not available|removed|deleted|unavailable|404/i.test(stderr)) {
    return new MannyError(`${platform === "tt" ? "TikTok" : "YouTube"} dice que ese contenido no está disponible o es privado.`);
  }
  if (/Unexpected response|403|429|blocked|captcha|rate/i.test(stderr)) {
    return new MannyError("TikTok ha bloqueado la lectura ahora mismo. Espera unos minutos y vuelve a intentarlo.", true);
  }
  return new MannyError("No he podido leer eso. Comprueba el enlace y vuelve a intentarlo.", true);
}

let chain: Promise<unknown> = Promise.resolve();

/** Una lectura cada vez y con una pausa corta: TikTok limita a quien pide muchas seguidas. */
function runYtdlp(args: string[], opts: { platform: Platform | null; timeoutMs?: number }): Promise<string> {
  const next = chain.then(() => spawnYtdlp(args, opts));
  chain = next.then(
    () => new Promise((r) => setTimeout(r, 600)),
    () => undefined,
  );
  return next;
}

function spawnYtdlp(args: string[], opts: { platform: Platform | null; timeoutMs?: number }): Promise<string> {
  const [bin, pre] = ytdlpCommand();
  const full = [...pre, "--no-warnings", ...(opts.platform === "tt" ? ["--impersonate", "chrome"] : []), ...args];
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, full, { env: safeEnv(), windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new MannyError("La lectura tardó demasiado. Vuelve a intentarlo.", true));
    }, opts.timeoutMs ?? 90_000);
    proc.stdout.setEncoding("utf8").on("data", (d) => (stdout += d));
    proc.stderr.setEncoding("utf8").on("data", (d) => (stderr += d));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(friendlyYtdlpError(String(e), opts.platform));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 || (stdout.trim() && opts.platform === "yt")) return resolve(stdout);
      log.warn("manny.ytdlp_failed", { code, stderr: stderr.slice(0, 400) });
      reject(friendlyYtdlpError(stderr, opts.platform));
    });
  });
}

const jsonLines = (out: string): Raw[] =>
  out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"))
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Raw];
      } catch {
        return [];
      }
    });

/** Métricas y datos de un vídeo suelto. */
export async function fetchVideo(p: ParsedVideoUrl): Promise<VideoMeta> {
  const out = await runYtdlp(["--skip-download", "--dump-single-json", p.url], { platform: p.platform });
  const d = jsonLines(out)[0];
  const meta = d && toMeta(d, p.platform, p.handle ?? "");
  if (!meta) throw new MannyError("No he podido leer ese vídeo. Pega su descripción o lo que dice y trabajo con eso.");
  return meta;
}

type TikTokUser = { nickname: string; followers: number | null; bio: string };

/** Seguidores y nombre de un perfil de TikTok, leídos de su página pública. */
export async function fetchTikTokUser(handle: string): Promise<TikTokUser> {
  const empty = { nickname: "", followers: null, bio: "" };
  try {
    const res = await fetch(`https://www.tiktok.com/@${handle}`, { headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return empty;
    const html = await res.text();
    const json = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    if (json) {
      const info = (JSON.parse(json) as { __DEFAULT_SCOPE__?: Record<string, { userInfo?: { user?: Raw; stats?: Raw } }> }).__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
      if (info?.user) {
        return { nickname: String(info.user.nickname ?? ""), followers: num(info.stats?.followerCount), bio: String(info.user.signature ?? "") };
      }
    }
    const f = html.match(/"followerCount":(\d+)/)?.[1];
    return { ...empty, followers: f ? Number(f) : null, nickname: html.match(/"nickname":"([^"]*)"/)?.[1] ?? "" };
  } catch {
    return empty;
  }
}

/** Últimos vídeos de un perfil de TikTok o de la pestaña de Shorts de un canal de YouTube, con sus métricas. */
export async function fetchProfile(platform: Platform, handle: string, limit = 30): Promise<ProfileMeta> {
  if (platform === "tt") {
    const [user, out] = await Promise.all([
      fetchTikTokUser(handle),
      runYtdlp(["--flat-playlist", "--dump-json", "--playlist-end", String(limit), `https://www.tiktok.com/@${handle}`], { platform: "tt", timeoutMs: 120_000 }),
    ]);
    const videos = jsonLines(out).flatMap((d) => toMeta(d, "tt", handle) ?? []);
    if (!videos.length && user.followers === null) throw new MannyError(`No encuentro la cuenta @${handle} en TikTok. Revisa que esté bien escrita.`);
    return { handle, ...user, videos };
  }
  const out = await runYtdlp(["--flat-playlist", "--dump-json", "--playlist-end", String(limit), `https://www.youtube.com/@${handle}/shorts`], { platform: "yt", timeoutMs: 120_000 });
  const rows = jsonLines(out);
  const videos = rows.flatMap((d) => toMeta(d, "yt", handle) ?? []);
  if (!videos.length) throw new MannyError(`No encuentro Shorts del canal @${handle} en YouTube. Revisa que esté bien escrito.`);
  const first = rows[0] ?? {};
  return { handle, nickname: String(first.channel ?? first.uploader ?? ""), followers: num(first.channel_follower_count), bio: "", videos };
}

/** Búsqueda en YouTube. Se piden muchos resultados y se deja solo lo corto, porque casi todo lo que sale son vídeos largos. */
export async function searchYoutube(query: string, opts: { onlyShort: boolean; limit?: number }): Promise<VideoMeta[]> {
  const q = query.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
  if (!q) throw badRequest("Escribe qué quieres buscar");
  const fetchN = opts.onlyShort ? 60 : 25;
  const out = await runYtdlp(["--flat-playlist", "--dump-json", `ytsearch${fetchN}:${q}${opts.onlyShort ? " #shorts" : ""}`], { platform: "yt", timeoutMs: 90_000 });
  let videos = jsonLines(out).flatMap((d) => {
    const m = toMeta(d, "yt");
    if (m) m.handle = String(d.channel ?? d.uploader ?? "");
    return m ?? [];
  });
  if (opts.onlyShort) videos = videos.filter((v) => v.duration !== null && v.duration <= 90);
  return videos.sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, opts.limit ?? 20);
}

/** Descarga el vídeo (en pequeño), lo transcribe con el Whisper local y borra el archivo. Devuelve null si no se puede. */
export async function transcribeVideo(p: ParsedVideoUrl): Promise<string | null> {
  const dir = path.join(os.tmpdir(), `manny-${randomUUID().slice(0, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    await runYtdlp(
      ["--no-playlist", "-f", "worst[ext=mp4]/worst", "--match-filter", "duration<=600", "--max-filesize", "80M", "-o", path.join(dir, "v.%(ext)s"), p.url],
      { platform: p.platform, timeoutMs: 180_000 },
    );
    const file = fs.readdirSync(dir).find((f) => f.startsWith("v."));
    if (!file) return null;
    const { text } = await getTranscriber().transcribe(path.join(dir, file));
    return text.trim() || null;
  } catch (e) {
    log.warn("manny.transcribe_skipped", { err: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
