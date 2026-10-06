// Hace un vídeo completo: idea → guion → voz y material → render → hoja de revisión (→ subida si se pide).
// Uso: npm run make                          → siguiente idea del backlog
//      npm run make -- --topic "..."         → tema concreto
//      npm run make -- --job <id>            → retoma un job existente donde se quedó
//      npm run make -- --upload [--schedule] → sube al terminar (normalmente se revisa antes)
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ROOT, args, jobDir, log, readJson } from "./lib/config.mjs";
import { generateIdeas, markIdea, nextIdea, produce, updateMeta, writeReview, writeScript } from "./lib/steps.mjs";
import { renderJob } from "./lib/render.mjs";

const a = args();
let id = a.job;

if (!id) {
  let idea = a.topic ? { topic: a.topic, workingTitle: a.topic, pillar: a.pillar } : nextIdea();
  if (!idea) {
    await generateIdeas(15);
    idea = nextIdea();
  }
  log(`Tema: ${idea.workingTitle ?? idea.topic}`);
  id = await writeScript(idea);
  if (idea.id) markIdea(idea.id, "scripted");
}

const status = () => readJson(path.join(jobDir(id), "meta.json"), {}).status;
if (status() === "scripted") await produce(id);
if (status() === "produced") {
  await renderJob(id);
  updateMeta(id, { status: "rendered" });
}
const review = writeReview(id);
log(`Listo para revisar: ${review}`);

if (a.upload) {
  const argv = ["pipeline/upload.mjs", id, ...(a.schedule ? ["--schedule"] : [])];
  spawnSync("node", argv, { cwd: ROOT, stdio: "inherit" });
}
