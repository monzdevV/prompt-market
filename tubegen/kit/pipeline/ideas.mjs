// Genera ideas nuevas para el canal (usa data/outliers.json si existe). Uso: npm run ideas [-- --count 15]
import { args } from "./lib/config.mjs";
import { generateIdeas } from "./lib/steps.mjs";

const ideas = await generateIdeas(Number(args().count ?? 15));
console.table(ideas.map((i) => ({ score: i.score, pilar: i.pillar, título: i.workingTitle })));
