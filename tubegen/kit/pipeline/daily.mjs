// Tarea diaria (Programador de tareas de Windows la lanza cada mañana):
// 1. Actualiza estadísticas y aprende qué pilares funcionan mejor.
// 2. Mantiene el backlog de ideas lleno.
// 3. Los días de vídeo largo, fabrica un episodio (largo + Short).
// 4. Si el canal tiene autoPublish=true, lo deja programado; si no, espera tu revisión.
import { spawnSync } from "node:child_process";
import { ROOT, env, loadChannel, log } from "./lib/config.mjs";
import { generateIdeas, ideas } from "./lib/steps.mjs";

const channel = loadChannel();
const run = (script, ...rest) => spawnSync("node", [script, ...rest], { cwd: ROOT, stdio: "inherit" }).status === 0;

// 1. Analíticas (si ya está conectado YouTube)
run("pipeline/stats.mjs");

// 2. Outliers una vez por semana (lunes) y backlog de ideas
const today = new Date().getDay();
if (today === 1 && env("YOUTUBE_API_KEY")) run("pipeline/outliers.mjs");
if (ideas().filter((i) => i.status === "new").length < 5) await generateIdeas(15);

// 3. ¿Toca vídeo hoy? Reparte los largos de la semana en días fijos (2/semana → martes y viernes).
const perWeek = channel.cadence.longPerWeek ?? 2;
const days = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }[perWeek] ?? [2, 5];
if (!days.includes(today)) {
  log("Hoy no toca vídeo nuevo.");
  process.exit(0);
}
run("pipeline/run.mjs", ...(channel.autoPublish ? ["--upload", "--schedule"] : []));
