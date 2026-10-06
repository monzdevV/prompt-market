import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { exec } from "node:child_process";
import { google } from "googleapis";
import { SECRETS, env, log } from "./config.mjs";

const TOKEN = path.join(SECRETS, "youtube-token.json");
const PORT = 5391;
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

function oauthClient() {
  const id = env("GOOGLE_CLIENT_ID");
  const secret = env("GOOGLE_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env (ver README)");
  return new google.auth.OAuth2(id, secret, REDIRECT);
}

/** Abre el navegador, el usuario autoriza su canal y se guarda el refresh token en secrets/. */
export async function authorize() {
  const client = oauthClient();
  const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES });
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== "/oauth2callback") return res.end();
      res.end("Listo. Ya puedes cerrar esta pestaña y volver a la terminal.");
      server.close();
      u.searchParams.get("code") ? resolve(u.searchParams.get("code")) : reject(new Error(u.searchParams.get("error")));
    });
    server.listen(PORT, "127.0.0.1", () => {
      log("Abre esta URL si no se abre sola:\n" + url);
      exec(`${process.platform === "win32" ? "start \"\"" : "open"} "${url}"`);
    });
  });
  const { tokens } = await client.getToken(code);
  fs.mkdirSync(SECRETS, { recursive: true });
  fs.writeFileSync(TOKEN, JSON.stringify(tokens, null, 2));
  client.setCredentials(tokens);
  const me = await google.youtube({ version: "v3", auth: client }).channels.list({ part: ["snippet"], mine: true });
  log(`Autorizado: ${me.data.items?.[0]?.snippet?.title ?? "(sin canal)"}`);
}

export function authed() {
  if (!fs.existsSync(TOKEN)) throw new Error("No hay token de YouTube. Ejecuta: npm run auth");
  const client = oauthClient();
  client.setCredentials(JSON.parse(fs.readFileSync(TOKEN, "utf8")));
  client.on("tokens", (t) => {
    const saved = JSON.parse(fs.readFileSync(TOKEN, "utf8"));
    fs.writeFileSync(TOKEN, JSON.stringify({ ...saved, ...t }, null, 2));
  });
  return client;
}

/** Nombre de la pista de subtítulos en el idioma del canal (channels/<canal>.json → lang): "es" → "Español". */
const languageName = (lang) => {
  try {
    const name = new Intl.DisplayNames([lang], { type: "language" }).of(lang) ?? lang;
    return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1);
  } catch {
    return lang;
  }
};

/**
 * Sube un vídeo. Ojo: mientras el proyecto de Google Cloud no pase la auditoría de la API,
 * YouTube fuerza los vídeos subidos por API a "privado". Se publican a mano desde Studio.
 */
export async function uploadVideo({ file, title, description, tags, channel, publishAt, thumbnail, captionsSrt }) {
  const auth = authed();
  const yt = google.youtube({ version: "v3", auth });
  const status = {
    privacyStatus: publishAt ? "private" : channel.youtube.privacy ?? "private",
    selfDeclaredMadeForKids: channel.youtube.madeForKids ?? false,
    containsSyntheticMedia: channel.youtube.containsSyntheticMedia ?? false,
    embeddable: true,
  };
  if (publishAt) status.publishAt = publishAt;
  const size = fs.statSync(file).size;
  log(`Subiendo ${path.basename(file)} (${(size / 1e6).toFixed(1)} MB)…`);
  const res = await yt.videos.insert(
    {
      part: ["snippet", "status"],
      notifySubscribers: true,
      requestBody: {
        snippet: {
          title,
          description,
          tags,
          categoryId: channel.youtube.categoryId ?? "27",
          defaultLanguage: channel.lang,
          defaultAudioLanguage: channel.lang,
        },
        status,
      },
      media: { body: fs.createReadStream(file) },
    },
    {
      onUploadProgress: (e) => process.stdout.write(`\r  ${Math.round((e.bytesRead / size) * 100)}%   `),
    },
  );
  process.stdout.write("\n");
  const videoId = res.data.id;
  if (!videoId) throw new Error(`YouTube no devolvió videoId al subir ${path.basename(file)}`);
  log(`Subido: https://youtu.be/${videoId} (estado: ${res.data.status?.privacyStatus})`);

  if (thumbnail) {
    try {
      await yt.thumbnails.set({ videoId, media: { mimeType: "image/png", body: fs.createReadStream(thumbnail) } });
      log("Miniatura puesta.");
    } catch (e) {
      log(`Miniatura no aplicada (¿canal sin verificar por teléfono?): ${e.message}`);
    }
  }
  if (captionsSrt) {
    try {
      await yt.captions.insert({
        part: ["snippet"],
        requestBody: { snippet: { videoId, language: channel.lang, name: languageName(channel.lang), isDraft: false } },
        media: { mimeType: "application/x-subrip", body: Readable.from([captionsSrt]) },
      });
      log("Subtítulos subidos.");
    } catch (e) {
      log(`Subtítulos no subidos: ${e.message}`);
    }
  }
  return { videoId, privacy: res.data.status?.privacyStatus };
}

/** Estadísticas básicas de vídeos propios (para el bucle de mejora). */
export async function videoStats(ids) {
  const yt = google.youtube({ version: "v3", auth: authed() });
  const res = await yt.videos.list({ part: ["statistics", "contentDetails", "snippet"], id: ids });
  return res.data.items ?? [];
}

/** Métricas de YouTube Analytics por vídeo en los últimos `days` días. */
export async function analytics(days = 28) {
  const ya = google.youtubeAnalytics({ version: "v2", auth: authed() });
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const res = await ya.reports.query({
    ids: "channel==MINE",
    startDate: start,
    endDate: end,
    dimensions: "video",
    metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,shares",
    sort: "-views",
    maxResults: 200,
  });
  const cols = res.data.columnHeaders.map((c) => c.name);
  return (res.data.rows ?? []).map((r) => Object.fromEntries(r.map((v, i) => [cols[i], v])));
}
