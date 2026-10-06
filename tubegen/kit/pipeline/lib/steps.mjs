import fs from "node:fs";
import path from "node:path";
import { DATA, OUT, ROOT, jobDir, loadChannel, log, readJson, slugify, writeJson } from "./config.mjs";
import { askJson } from "./llm.mjs";
import { ideasPrompt, scriptPrompt } from "./prompts.mjs";
import { voiceScenes } from "./tts.mjs";
import { fetchMedia, pickMusic } from "./media.mjs";

const IDEAS = path.join(DATA, "ideas.json");
const HISTORY = path.join(DATA, "history.json");

export const history = () => readJson(HISTORY, []);
export const ideas = () => readJson(IDEAS, []);

// ---------- 1. Ideas ----------
export async function generateIdeas(count = 15) {
  const channel = loadChannel();
  const done = [...history().map((h) => h.title), ...ideas().map((i) => i.workingTitle)];
  const outliers = readJson(path.join(DATA, "outliers.json"), []);
  const res = await askJson(ideasPrompt({ channel, count, done, outliers }), { maxTokens: 16000 });
  const list = ideas();
  for (const i of res.ideas) list.push({ id: slugify(i.workingTitle || i.topic), status: "new", createdAt: new Date().toISOString(), ...i });
  writeJson(IDEAS, list);
  log(`${res.ideas.length} ideas nuevas → data/ideas.json`);
  return res.ideas;
}

/** Siguiente idea: la de mejor puntuación entre las nuevas, rotando pilares. */
export function nextIdea() {
  const list = ideas().filter((i) => i.status === "new");
  if (!list.length) return null;
  const lastPillar = history().at(-1)?.pillar;
  list.sort((a, b) => (b.score ?? 5) - (a.score ?? 5) + (a.pillar === lastPillar ? 2 : 0) - (b.pillar === lastPillar ? 2 : 0));
  return list[0];
}

export function markIdea(id, status) {
  const list = ideas();
  const i = list.find((x) => x.id === id);
  if (i) i.status = status;
  writeJson(IDEAS, list);
}

// ---------- 2. Guion ----------
export async function writeScript(idea) {
  const channel = loadChannel();
  const date = new Date().toISOString().slice(0, 10);
  const base = `${date}-${slugify(idea.workingTitle || idea.topic)}`;
  // Mismo tema el mismo día → sufijo -2, -3… para no sobrescribir el guion anterior.
  let id = base;
  for (let n = 2; fs.existsSync(jobDir(id)); n++) id = `${base}-${n}`;
  const dir = jobDir(id);
  fs.mkdirSync(dir, { recursive: true });
  const avoidTitles = history().map((h) => h.title);
  const script = await askJson(scriptPrompt({ channel, idea, avoidTitles }), { maxTokens: 64000, web: true }); // margen para razonamiento + búsquedas + JSON
  validateScript(script);
  writeJson(path.join(dir, "script.json"), script);
  writeJson(path.join(dir, "meta.json"), { id, idea, status: "scripted", createdAt: new Date().toISOString() });
  log(`Guion: "${script.title}" → jobs/${id}/script.json`);
  return id;
}

function validateScript(s) {
  const need = ["title", "description", "long", "short", "thumbnail"];
  for (const k of need) if (!s[k]) throw new Error(`Guion sin "${k}"`);
  const scenes = s.long.sections.flatMap((x) => x.scenes);
  if (scenes.length < 10) throw new Error(`Guion largo demasiado corto (${scenes.length} escenas)`);
  for (const sc of [...scenes, ...s.short.scenes]) {
    if (!sc.text || !sc.visual?.kind) throw new Error(`Escena inválida: ${JSON.stringify(sc).slice(0, 200)}`);
  }
}

// ---------- 3. Voz + material → props de Remotion ----------
export async function produce(id, { only } = {}) {
  const channel = loadChannel();
  const dir = jobDir(id);
  const script = readJson(path.join(dir, "script.json"));
  const music = pickMusic(ROOT, channel, dir);
  const base = {
    id,
    channelName: channel.name,
    theme: channel.theme,
    music,
    musicVolume: channel.music?.volume ?? 0.06,
  };

  if (!only || only === "long") {
    const scenes = script.long.sections.flatMap((sec, si) => sec.scenes.map((sc, i) => ({ ...sc, section: si, sectionStart: i === 0 })));
    await voiceScenes(scenes, dir, "long", channel.voice);
    await fetchMedia(scenes, dir, { vertical: false });
    writeJson(path.join(dir, "long.json"), { ...base, id: `${id}-long`, title: script.title, captions: false, endScreen: true, scenes });
  }
  if (!only || only === "short") {
    const scenes = structuredClone(script.short.scenes);
    await voiceScenes(scenes, dir, "short", channel.voice);
    await fetchMedia(scenes, dir, { vertical: true });
    writeJson(path.join(dir, "short.json"), { ...base, id: `${id}-short`, title: script.short.title, captions: true, endScreen: false, scenes });
  }
  updateMeta(id, { status: "produced" });
}

export function updateMeta(id, patch) {
  const file = path.join(jobDir(id), "meta.json");
  const meta = { ...readJson(file, { id }), ...patch, updatedAt: new Date().toISOString() };
  writeJson(file, meta);
  return meta;
}

// ---------- 4. Textos para YouTube ----------
const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};
const GAP = 0.3; // igual que en src/Episode.tsx

/** Capítulos a partir de las secciones y la duración real de la voz. */
export function chapters(script, long) {
  const out = [];
  let t = 0;
  for (const sc of long.scenes) {
    if (sc.sectionStart) out.push(`${fmt(out.length === 0 ? 0 : t)} ${script.long.sections[sc.section].heading}`);
    t += sc.duration + GAP;
  }
  return out.length >= 3 ? out : [];
}

/** Subtítulos SRT del vídeo largo (YouTube los indexa: ayuda al SEO). */
export function srt(long) {
  const lines = [];
  let offset = 0;
  let n = 1;
  const ts = (s) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  for (const sc of long.scenes) {
    // Un subtítulo por frase con los tiempos por palabra (la puntuación ya viene alineada con el guion).
    const sentences = [];
    let cur = [];
    for (const w of sc.words ?? []) {
      cur.push(w);
      if (/[.!?…]["'»”)]*$/.test(w.text)) {
        sentences.push(cur);
        cur = [];
      }
    }
    if (cur.length) sentences.push(cur);
    if (sentences.length > 1) {
      sentences.forEach((ws, i) => {
        const end = i === sentences.length - 1 ? sc.duration : sentences[i + 1][0].start;
        lines.push(`${n++}\n${ts(offset + ws[0].start)} --> ${ts(offset + end)}\n${ws.map((w) => w.text).join(" ")}\n`);
      });
    } else {
      lines.push(`${n++}\n${ts(offset)} --> ${ts(offset + sc.duration)}\n${sc.text}\n`);
    }
    offset += sc.duration + GAP;
  }
  return lines.join("\n");
}

export function youtubeTexts(id) {
  const channel = loadChannel();
  const dir = jobDir(id);
  const script = readJson(path.join(dir, "script.json"));
  const long = readJson(path.join(dir, "long.json"));
  const credits = [...new Set([...(long?.scenes ?? [])].map((s) => s.visual.credit).filter(Boolean))];
  const sources = (script.sources ?? []).map((s) => `• ${s.claim} — ${s.source}${s.url ? ` ${s.url}` : ""}`);
  // La línea de IA va al final, debajo de las fuentes: se quita cualquier "Fuentes abajo/arriba." del canal
  // y se añade la referencia correcta solo si hay fuentes (el Short no las lleva).
  const disclosureBase = channel.youtube.disclosureLine.replace(/\s*Fuentes (abajo|arriba)\.?/i, "").trim();
  const disclosure = (withSources) => (withSources ? `${disclosureBase} Fuentes arriba.` : disclosureBase);
  const longDesc = [
    script.description,
    "",
    ...(long ? chapters(script, long) : []),
    "",
    sources.length ? "Fuentes:" : "",
    ...sources,
    "",
    credits.length ? `Material visual: ${credits.slice(0, 12).join(" · ")}` : "",
    disclosure(sources.length > 0),
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n")
    .slice(0, 4900);
  const tags = [...new Set([...(script.tags ?? []), ...channel.youtube.defaultTags])].slice(0, 20);
  return {
    long: { title: script.title.slice(0, 100), description: longDesc, tags },
    short: {
      title: script.short.title.slice(0, 100),
      description: `${script.short.description}\n\n${disclosure(false)}`.slice(0, 4900),
      tags,
    },
  };
}

/** Hoja de revisión humana: lo que hay que mirar antes de publicar. */
export function writeReview(id) {
  const dir = jobDir(id);
  const script = readJson(path.join(dir, "script.json"));
  const texts = youtubeTexts(id);
  const outDir = path.join(OUT, id);
  fs.mkdirSync(outDir, { recursive: true });
  const md = `# Revisión: ${script.title}

Antes de publicar, comprueba:
- [ ] Los datos son correctos (mira las fuentes de abajo)
- [ ] El vídeo largo se ve y suena bien de principio a fin
- [ ] El Short se entiende solo y engancha en el primer segundo
- [ ] La miniatura se lee en pequeño

Para publicar: \`npm run upload -- ${id}\`

## Títulos alternativos
${(script.titleOptions ?? []).map((t) => `- ${t}`).join("\n")}

## Vídeo largo
**${texts.long.title}**

\`\`\`
${texts.long.description}
\`\`\`

Tags: ${texts.long.tags.join(", ")}

## Short
**${texts.short.title}**

\`\`\`
${texts.short.description}
\`\`\`

## Fuentes
${(script.sources ?? []).map((s) => `- ${s.claim} — ${s.source} ${s.url ?? ""}`).join("\n")}
`;
  fs.writeFileSync(path.join(outDir, "REVISAR.md"), md);
  return path.join(outDir, "REVISAR.md");
}

export function recordHistory(entry) {
  // Una entrada por job: si se sube en dos tandas (largo y luego Short) se actualiza la misma.
  const h = history().filter((x) => x.id !== entry.id);
  h.push({ ...entry, at: new Date().toISOString() });
  writeJson(HISTORY, h);
}
