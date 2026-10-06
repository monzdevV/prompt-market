import { z } from "zod";
import { parseJson, withSession } from "@/lib/api";
import { addIdea } from "@/lib/manny/ideas";

const Body = z.object({
  titulo: z.string().trim().min(1, "La idea necesita un título").max(120, "El título admite hasta 120 caracteres"),
  angulo: z.string().trim().max(400).optional(),
  basadoEn: z.string().trim().max(200).optional(),
});

/** Guarda en el banco una idea que sale de un vídeo del radar o de una búsqueda. */
export const POST = withSession(async (req, s) => {
  return Response.json({ id: addIdea(s.workspaceId, await parseJson(req, Body)) });
});
