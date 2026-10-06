// Renderiza vídeo largo, Short y miniatura de un job. Uso: npm run render -- <job> [--only long|short|thumb]
import { args } from "./lib/config.mjs";
import { renderJob } from "./lib/render.mjs";
import { updateMeta, writeReview } from "./lib/steps.mjs";

const a = args();
if (!a._[0]) throw new Error("Uso: npm run render -- <job-id>");
await renderJob(a._[0], { only: a.only });
updateMeta(a._[0], { status: "rendered" });
console.log("Revisión:", writeReview(a._[0]));
