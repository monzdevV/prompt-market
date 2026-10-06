import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { ROOT, env, log } from "./config.mjs";

/** Duración exacta de un audio con ffprobe */
export const audioDuration = (file) => {
  try {
    return Number(
      execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file])
        .toString()
        .trim(),
    );
  } catch (e) {
    if (e.code === "ENOENT") throw new Error(FFPROBE_MISSING);
    throw e;
  }
};

const FFPROBE_MISSING =
  "No encuentro ffprobe (viene con FFmpeg) en el PATH. Instálalo y abre una terminal nueva:\n" +
  "  Windows: winget install Gyan.FFmpeg\n" +
  "  macOS:   brew install ffmpeg\n" +
  "  Linux:   sudo apt install ffmpeg   (o el gestor de tu distro)";

/** Falla pronto (antes de generar la voz) si no hay ffprobe. */
function checkFfprobe() {
  const r = spawnSync("ffprobe", ["-version"], { stdio: "ignore" });
  if (r.error || r.status !== 0) throw new Error(FFPROBE_MISSING);
}

/**
 * Intérprete de Python: variable PYTHON del .env/entorno; si no, `python3` en macOS/Linux y `python` en Windows.
 * Comprueba que existe (en Windows `python` puede ser el atajo vacío de la Microsoft Store).
 */
function pythonBin() {
  const bin = env("PYTHON", process.platform === "win32" ? "python" : "python3");
  const r = spawnSync(bin, ["--version"], { stdio: "ignore" });
  if (r.error || r.status !== 0) {
    throw new Error(
      `No encuentro Python ("${bin}"). Instala Python 3.10+ (https://www.python.org/downloads/) y luego: ${bin} -m pip install edge-tts\n` +
        "Si está instalado con otro nombre o ruta, ponlo en .env: PYTHON=<ruta o comando>",
    );
  }
  return bin;
}

/**
 * Genera la voz de cada escena en <dir>/audio/<prefix>-NN.mp3 y rellena scene.audio, scene.duration y scene.words.
 * Las rutas quedan relativas a `dir` (que es la carpeta pública del render).
 */
export async function voiceScenes(scenes, dir, prefix, voiceCfg) {
  checkFfprobe();
  const audioDir = path.join(dir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const items = scenes.map((s, i) => ({ text: s.text, out: path.join(audioDir, `${prefix}-${String(i).padStart(3, "0")}.mp3`) }));
  const useEleven = voiceCfg.provider === "elevenlabs" && env("ELEVENLABS_API_KEY") && voiceCfg.elevenVoiceId;
  if (useEleven) {
    for (const it of items) await eleven(it, voiceCfg);
  } else {
    const spec = path.join(audioDir, `${prefix}-spec.json`);
    fs.writeFileSync(spec, JSON.stringify({ voice: voiceCfg.edgeVoice, rate: voiceCfg.rate ?? "+0%", items }));
    log(`edge-tts: ${items.length} frases con ${voiceCfg.edgeVoice}`);
    const r = spawnSync(pythonBin(), [path.join(ROOT, "pipeline", "tts_edge.py"), spec], { stdio: ["ignore", "ignore", "inherit"] });
    if (r.status !== 0) throw new Error("edge-tts falló (¿falta `pip install edge-tts`?)");
  }
  scenes.forEach((s, i) => {
    const out = items[i].out;
    s.audio = path.relative(dir, out).replaceAll("\\", "/");
    s.duration = audioDuration(out);
    s.words = punctuate(JSON.parse(fs.readFileSync(out.replace(/\.mp3$/, ".words.json"), "utf8")), s.text);
  });
  return scenes;
}

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

/**
 * edge-tts devuelve las palabras sin puntuación. Las alineamos con el texto original del guion
 * para recuperar signos («¿», comas, puntos…) y que los subtítulos corten por frase.
 * Si una palabra no casa (números leídos distinto, etc.) se deja tal cual.
 */
export function punctuate(words, text) {
  const tokens = text.split(/\s+/).filter((t) => norm(t));
  let j = 0;
  let rest = ""; // resto de un token que la voz partió en varias palabras (p. ej. "físico-químico")
  let restToken = "";
  for (const w of words) {
    const n = norm(w.text);
    if (!n) continue;
    if (rest) {
      if (rest.startsWith(n)) {
        rest = rest.slice(n.length);
        if (!rest) w.text += restToken.match(/[^\p{L}\p{N}]*$/u)[0];
        continue;
      }
      rest = "";
    }
    // Busca la palabra en los siguientes tokens del guion (tolera algún token saltado).
    for (let k = j; k < Math.min(tokens.length, j + 4); k++) {
      const t = norm(tokens[k]);
      if (t === n) {
        w.text = tokens[k];
        j = k + 1;
        break;
      }
      if (t.startsWith(n)) {
        w.text = tokens[k].match(/^[^\p{L}\p{N}]*/u)[0] + w.text;
        rest = t.slice(n.length);
        restToken = tokens[k];
        j = k + 1;
        break;
      }
    }
  }
  return words;
}

/** ElevenLabs con tiempos por carácter → los agrupamos en palabras. */
async function eleven(item, cfg) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.elevenVoiceId}/with-timestamps`, {
    method: "POST",
    headers: { "xi-api-key": env("ELEVENLABS_API_KEY"), "content-type": "application/json" },
    body: JSON.stringify({ text: item.text, model_id: cfg.elevenModel ?? "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = await res.json();
  fs.writeFileSync(item.out, Buffer.from(data.audio_base64, "base64"));
  const a = data.alignment;
  const words = [];
  let cur = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  fs.writeFileSync(item.out.replace(/\.mp3$/, ".words.json"), JSON.stringify(words));
  log(`ElevenLabs ok ${path.basename(item.out)}`);
}
