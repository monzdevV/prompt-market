import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { badRequest, notFound } from "../errors";
import { draftScript, SYSTEM } from "./chat";
import { buildContext } from "./context";
import { log } from "../log";
import { MannyError, runClaude } from "./llm";
import { clip, issues, list } from "./schema-utils";
import { listScripts } from "./scripts";

export const IDEA_STATUSES = ["nueva", "guardada", "guion", "descartada"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

const IdeaSchema = z.object({
  titulo: clip(120),
  gancho: clip(160),
  formato: clip(60),
  angulo: clip(600).default(""),
  dificultad: z.number().transform((n) => Math.min(3, Math.max(1, Math.round(n)))),
  grabacion: z.enum(["gym", "casa", "fotos", "cualquier"]).catch("cualquier"),
  basadoEn: clip(300).default(""),
});
export type Idea = z.infer<typeof IdeaSchema>;
export type IdeaRow = { id: string; status: IdeaStatus; idea: Idea; createdAt: number };

const IDEAS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "gancho", "formato", "angulo", "dificultad", "grabacion", "basadoEn"],
        properties: {
          titulo: { type: "string", description: "Nombre corto de la idea" },
          gancho: { type: "string", description: "Texto grande del primer segundo, en MAYÚSCULAS" },
          formato: { type: "string", description: "Tipo y duración, p. ej. «Vídeo 20 s» o «Carrusel 7 fotos»" },
          angulo: { type: "string", description: "Qué cuenta el vídeo y por qué le encaja a este creador y ahora" },
          dificultad: { type: "integer", description: "1 fácil, 2 media, 3 difícil de grabar y editar" },
          grabacion: { type: "string", enum: ["gym", "casa", "fotos", "cualquier"], description: "Dónde se graba" },
          basadoEn: { type: "string", description: "Qué patrón, cuenta o vídeo del radar o del plan la inspira; vacío si es solo del oficio" },
        },
      },
    },
  },
};

type Raw = { id: string; status: IdeaStatus; data: string; created_at: number };
const toRow = (r: Raw): IdeaRow => ({ id: r.id, status: r.status, idea: JSON.parse(r.data) as Idea, createdAt: r.created_at });

export function listIdeas(workspaceId: string): IdeaRow[] {
  return (db.prepare("SELECT id, status, data, created_at FROM manny_ideas WHERE workspace_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200").all(workspaceId) as Raw[]).map(toRow);
}

export function setIdeaStatus(workspaceId: string, id: string, status: IdeaStatus) {
  if (!db.prepare("UPDATE manny_ideas SET status = ? WHERE workspace_id = ? AND id = ?").run(status, workspaceId, id).changes) throw notFound("Esa idea");
}

export function deleteIdea(workspaceId: string, id: string) {
  if (!db.prepare("DELETE FROM manny_ideas WHERE workspace_id = ? AND id = ?").run(workspaceId, id).changes) throw notFound("Esa idea");
}

export type IdeaRequest = { tema: string; cuantas: number; desdeRadar: boolean };

/** Pide ideas nuevas a Manny y las guarda. No repite las que ya hay ni los guiones que ya existen. */
export async function generateIdeas(workspaceId: string, req: IdeaRequest) {
  const cuantas = Math.min(Math.max(req.cuantas, 1), 10);
  const known = [...listIdeas(workspaceId).filter((i) => i.status !== "descartada").map((i) => i.idea.titulo), ...listScripts(workspaceId).map((s) => s.script.titulo)].slice(0, 60);
  const prompt = `<contexto>
${buildContext(workspaceId)}
</contexto>

Dame ${cuantas} ideas nuevas de vídeo o carrusel para el creador, listas para elegir y grabar esta semana.
${req.tema.trim() ? `Tema o petición: ${req.tema.trim().slice(0, 300)}` : "Elige tú lo que más le conviene ahora según sus métricas y lo que funciona."}
${req.desdeRadar ? "Basa las ideas en los vídeos que más han reventado en el radar (cita en «basadoEn» la cuenta y el patrón), adaptados a él: no copies el vídeo, copia por qué funciona." : "Mezcla lo que enseña (técnica, rutinas, mitos) con lo que alcanza (físico, edits, series)."}
Ya existen estas, no las repitas ni hagas variantes casi iguales: ${known.join(" | ") || "ninguna"}.
Cada idea tiene que ser distinta en formato y ganchos, grabable por una sola persona con móvil, y cumplir las normas de TikTok para fitness.`;
  const raw = await runClaude({ system: SYSTEM, prompt, schema: IDEAS_JSON_SCHEMA, timeoutMs: 200_000 });
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    // Se trata abajo
  }
  const out = z.object({ ideas: list(IdeaSchema, 10, 1) }).safeParse(json);
  if (!out.success) log.warn("manny.ideas_invalid", { issues: issues(out.error), sample: raw.slice(0, 300) });
  if (!out.success) throw new MannyError("Manny escribió las ideas con un formato raro. Vuelve a intentarlo.", true);
  const now = Date.now();
  const insert = db.prepare("INSERT INTO manny_ideas (id, workspace_id, data, status, created_at) VALUES (?, ?, ?, 'nueva', ?)");
  const ids = out.data.ideas.slice(0, cuantas).map((idea) => {
    const id = randomUUID().slice(0, 8);
    insert.run(id, workspaceId, JSON.stringify(idea), now);
    return id;
  });
  return ids;
}

/** Guarda una idea escrita por el creador (por ejemplo, desde un vídeo del radar o una búsqueda). */
export function addIdea(workspaceId: string, input: Partial<Idea> & { titulo: string }) {
  const idea = IdeaSchema.safeParse({ gancho: input.titulo.toUpperCase().slice(0, 140), formato: "Vídeo", angulo: "", dificultad: 2, grabacion: "cualquier", basadoEn: "", ...input });
  if (!idea.success) throw badRequest("La idea no es válida");
  const id = randomUUID().slice(0, 8);
  db.prepare("INSERT INTO manny_ideas (id, workspace_id, data, status, created_at) VALUES (?, ?, ?, 'guardada', ?)").run(id, workspaceId, JSON.stringify(idea.data), Date.now());
  return id;
}

/** Convierte la idea en un guion completo y la marca como «guion». */
export async function ideaToScript(workspaceId: string, id: string) {
  const row = (db.prepare("SELECT id, status, data, created_at FROM manny_ideas WHERE workspace_id = ? AND id = ?").get(workspaceId, id) as Raw | undefined) ?? null;
  if (!row) throw notFound("Esa idea");
  const { idea } = toRow(row);
  const scriptId = await draftScript(
    workspaceId,
    `Convierte esta idea en un guion completo. Título: ${idea.titulo}. Gancho propuesto: ${idea.gancho}. Formato: ${idea.formato}. Planteamiento: ${idea.angulo}${idea.basadoEn ? `. Inspirada en: ${idea.basadoEn}` : ""}.`,
  );
  setIdeaStatus(workspaceId, id, "guion");
  return scriptId;
}
