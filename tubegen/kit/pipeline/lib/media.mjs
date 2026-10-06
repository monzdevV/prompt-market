import fs from "node:fs";
import path from "node:path";
import { env, log } from "./config.mjs";

const PEXELS = "https://api.pexels.com";

async function pexels(url) {
  const res = await fetch(url, { headers: { Authorization: env("PEXELS_API_KEY") } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  return res.json();
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`descarga ${res.status}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/**
 * Busca material libre en Pexels para las escenas que traen `mediaQuery`.
 * Escenas "broll" → vídeo; el resto → foto (más ligera, se anima con Ken Burns).
 * Sin PEXELS_API_KEY no hace nada: la plantilla funciona solo con gráficos.
 */
export async function fetchMedia(scenes, dir, { vertical }) {
  if (!env("PEXELS_API_KEY")) {
    log("Sin PEXELS_API_KEY: vídeo solo con gráficos.");
    return scenes;
  }
  const mediaDir = path.join(dir, "media");
  fs.mkdirSync(mediaDir, { recursive: true });
  const orientation = vertical ? "portrait" : "landscape";
  const used = new Set();
  for (const [i, s] of scenes.entries()) {
    const q = s.mediaQuery;
    if (!q) continue;
    try {
      const wantVideo = s.visual.kind === "broll";
      if (wantVideo) {
        const data = await pexels(`${PEXELS}/videos/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=8&size=medium`);
        const v = data.videos?.find((v) => !used.has(v.id) && v.duration >= 4);
        if (!v) continue;
        used.add(v.id);
        const target = vertical ? 1920 : 1080;
        const file = v.video_files
          .filter((f) => f.file_type === "video/mp4" && f.height)
          .sort((a, b) => Math.abs((vertical ? a.height : a.height) - target) - Math.abs((vertical ? b.height : b.height) - target))[0];
        const name = `m-${orientation}-${i}.mp4`;
        await download(file.link, path.join(mediaDir, name));
        s.visual.media = `media/${name}`;
        s.visual.credit = `Vídeo: ${v.user?.name ?? "Pexels"} / Pexels`;
      } else {
        const data = await pexels(`${PEXELS}/v1/search?query=${encodeURIComponent(q)}&orientation=${orientation}&per_page=8`);
        const p = data.photos?.find((p) => !used.has(p.id));
        if (!p) continue;
        used.add(p.id);
        const name = `m-${orientation}-${i}.jpg`;
        await download(vertical ? p.src.portrait : p.src.landscape, path.join(mediaDir, name));
        s.visual.media = `media/${name}`;
        s.visual.credit = `Foto: ${p.photographer} / Pexels`;
      }
      log(`media ${i}: ${q}`);
    } catch (e) {
      log(`media ${i} (${q}) falló: ${e.message}`);
    }
  }
  return scenes;
}

/** Elige una pista de música al azar de assets/music (pon ahí mp3 con licencia libre). */
export function pickMusic(root, channel, dir) {
  const musicDir = path.join(root, channel.music?.dir ?? "assets/music");
  if (!fs.existsSync(musicDir)) return undefined;
  const tracks = fs.readdirSync(musicDir).filter((f) => /\.(mp3|m4a|wav)$/i.test(f));
  if (!tracks.length) return undefined;
  const t = tracks[Math.floor(Math.random() * tracks.length)];
  fs.mkdirSync(path.join(dir, "music"), { recursive: true });
  fs.copyFileSync(path.join(musicDir, t), path.join(dir, "music", t));
  return `music/${t}`;
}
