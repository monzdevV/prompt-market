// Detecta vídeos "outlier": rinden muchas veces más que la media de su canal.
// Es la señal de demanda más fiable para elegir temas. Solo necesita YOUTUBE_API_KEY (lectura).
// Uso: npm run outliers [-- --days 30 --shorts]
import path from "node:path";
import { google } from "googleapis";
import { DATA, args, env, loadChannel, log, writeJson } from "./lib/config.mjs";

const a = args();
const channel = loadChannel();
const key = env("YOUTUBE_API_KEY");
if (!key) throw new Error("Falta YOUTUBE_API_KEY en .env");
const yt = google.youtube({ version: "v3", auth: key });

const days = Number(a.days ?? 30);
const shorts = Boolean(a.shorts);
const after = new Date(Date.now() - days * 864e5).toISOString();
const seeds = channel.seeds ?? channel.pillars.map((p) => p.id);

const iso = (d) => {
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
};
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

const found = new Map();
for (const { q, lang } of seeds) {
  const res = await yt.search.list({
    part: ["id"],
    q,
    type: ["video"],
    order: "viewCount",
    publishedAfter: after,
    relevanceLanguage: lang,
    videoDuration: shorts ? "short" : "medium",
    maxResults: 50,
  });
  for (const it of res.data.items ?? []) found.set(it.id.videoId, { q, lang });
  log(`"${q}" (${lang}): ${res.data.items?.length ?? 0}`);
}

const videos = [];
for (const ids of chunk([...found.keys()], 50)) {
  const r = await yt.videos.list({ part: ["snippet", "statistics", "contentDetails"], id: ids });
  videos.push(...(r.data.items ?? []));
}
const chans = new Map();
for (const ids of chunk([...new Set(videos.map((v) => v.snippet.channelId))], 50)) {
  const r = await yt.channels.list({ part: ["statistics", "snippet"], id: ids });
  for (const c of r.data.items ?? []) chans.set(c.id, c);
}

const now = Date.now();
const rows = [];
for (const v of videos) {
  const c = chans.get(v.snippet.channelId);
  if (!c) continue;
  const views = +v.statistics.viewCount || 0;
  const subs = +c.statistics.subscriberCount || 1;
  const vids = +c.statistics.videoCount || 1;
  // Media aproximada del canal (vistas totales / vídeos). Más barato en cuota que leer sus últimos vídeos.
  const baseline = Math.max(1, (+c.statistics.viewCount || 0) / vids);
  const hours = Math.max(1, (now - new Date(v.snippet.publishedAt)) / 36e5);
  const ageDays = (now - new Date(c.snippet.publishedAt)) / 864e5;
  const dur = iso(v.contentDetails.duration);
  const outlier = views / baseline;
  const isShort = dur <= 180;
  if (isShort !== shorts) continue;
  if (outlier < (shorts ? 3 : 5) || views < (shorts ? 100_000 : 20_000)) continue;
  if (subs > 100_000 && ageDays > 180) continue;
  const score =
    0.45 * Math.log2(outlier) + 0.25 * Math.log2(Math.max(1, views / subs)) + 0.15 * Math.log2(views / hours) + (ageDays < 90 ? 1 : 0);
  rows.push({
    title: v.snippet.title,
    url: `https://youtu.be/${v.id}`,
    channel: c.snippet.title,
    lang: found.get(v.id)?.lang,
    seed: found.get(v.id)?.q,
    views,
    subs,
    outlier: +outlier.toFixed(1),
    viewsPerHour: Math.round(views / hours),
    channelAgeDays: Math.round(ageDays),
    durationS: dur,
    score: +score.toFixed(2),
  });
}
rows.sort((a, b) => b.score - a.score);
writeJson(path.join(DATA, shorts ? "outliers-shorts.json" : "outliers.json"), rows);
console.table(rows.slice(0, 20).map(({ title, outlier, views, subs, lang }) => ({ title: title.slice(0, 60), outlier, views, subs, lang })));
log(`${rows.length} outliers → data/${shorts ? "outliers-shorts" : "outliers"}.json`);
