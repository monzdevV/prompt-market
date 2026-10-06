// Bucle de mejora: lee YouTube Analytics, puntúa cada vídeo y calcula qué pilares rinden mejor.
// El resultado (data/performance.json) sube la prioridad de las ideas de los pilares ganadores.
import fs from "node:fs";
import path from "node:path";
import { DATA, SECRETS, log, readJson, writeJson } from "./lib/config.mjs";
import { analytics } from "./lib/youtube.mjs";

if (!fs.existsSync(path.join(SECRETS, "youtube-token.json"))) {
  log("Stats: YouTube aún no conectado (npm run auth). Me lo salto.");
  process.exit(0);
}
const rows = await analytics(28);
const history = readJson(path.join(DATA, "history.json"), []);
const pillarOf = new Map();
for (const h of history) for (const u of Object.values(h.uploads ?? {})) pillarOf.set(u.videoId, h.pillar);

const byPillar = {};
for (const r of rows) {
  const p = pillarOf.get(r.video);
  if (!p) continue;
  // Mezcla: vistas relativas + % visto + suscriptores por 1000 vistas. Nunca optimizar solo CTR/vistas.
  const score = Math.log10(1 + r.views) + r.averageViewPercentage / 25 + (r.subscribersGained / Math.max(1, r.views)) * 1000;
  (byPillar[p] ??= []).push(score);
}
const pillars = Object.fromEntries(
  Object.entries(byPillar).map(([p, s]) => [p, +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2)]),
);
writeJson(path.join(DATA, "performance.json"), { at: new Date().toISOString(), videos: rows, pillars });

// Ajusta la puntuación de las ideas pendientes: +2 al mejor pilar, -1 al peor (70/20/10 de facto).
const ranked = Object.entries(pillars).sort((a, b) => b[1] - a[1]);
if (ranked.length >= 2) {
  const file = path.join(DATA, "ideas.json");
  const ideas = readJson(file, []);
  for (const i of ideas) {
    if (i.status !== "new") continue;
    i.boost = i.pillar === ranked[0][0] ? 2 : i.pillar === ranked.at(-1)[0] ? -1 : 0;
    i.score = (i.baseScore ??= i.score ?? 5) + i.boost;
  }
  writeJson(file, ideas);
}
log(`Stats: ${rows.length} vídeos. Pilares: ${JSON.stringify(pillars)}`);
