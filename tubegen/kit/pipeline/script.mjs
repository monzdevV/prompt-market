// Escribe el guion de la mejor idea pendiente, o de un tema concreto.
// Uso: npm run script            → siguiente idea de data/ideas.json
//      npm run script -- --topic "Por qué el cielo es azul"
import { args } from "./lib/config.mjs";
import { markIdea, nextIdea, writeScript } from "./lib/steps.mjs";

const a = args();
const idea = a.topic ? { topic: a.topic, workingTitle: a.topic, pillar: a.pillar } : nextIdea();
if (!idea) throw new Error("No hay ideas pendientes. Ejecuta: npm run ideas");
const id = await writeScript(idea);
if (idea.id) markIdea(idea.id, "scripted");
console.log(id);
