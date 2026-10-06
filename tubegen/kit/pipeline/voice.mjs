// Genera voz, material visual y los JSON de Remotion de un job. Uso: npm run voice -- <job> [--only long|short]
import { args } from "./lib/config.mjs";
import { produce } from "./lib/steps.mjs";

const a = args();
if (!a._[0]) throw new Error("Uso: npm run voice -- <job-id>");
await produce(a._[0], { only: a.only });
