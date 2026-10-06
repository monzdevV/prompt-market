import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "../db";
import { badRequest, notFound } from "../errors";
import { SYSTEM, SCRIPT_JSON_SCHEMA, ScriptDraftSchema } from "./chat";
import { buildContext } from "./context";
import { log } from "../log";
import { MannyError, runClaude } from "./llm";
import { clip, issues, list } from "./schema-utils";
import { upsertVideo } from "./radar";
import { addMannyScript } from "./scripts";
import { fetchVideo, parseVideoUrl, resolveShortLink, transcribeVideo, type ParsedVideoUrl, type VideoMeta } from "./social";
import type { PlanScript } from "./types";

/*
 * «Copiar»: el creador pega un TikTok o un Short. Se leen sus métricas, se transcribe lo que dice (en este
 * ordenador) y Manny devuelve por qué funciona y tres versiones del guion adaptadas al creador, listas para copiar.
 */

const VersionSchema = ScriptDraftSchema.extend({
  enfoque: clip(60),
  queCambia: clip(500).default(""),
});

const AnalysisSchema = z.object({
  resumen: clip(800),
  ganchoOriginal: clip(300).default(""),
  tipoGancho: clip(120).default(""),
  estructura: list(clip(300), 12, 1),
  porQueFunciona: list(clip(500), 10, 1),
  dificultad: z.number().transform((n) => Math.min(3, Math.max(1, Math.round(n)))),
  necesitas: list(clip(200), 10),
});

export const RemixResultSchema = z.object({
  analisis: AnalysisSchema,
  versiones: list(VersionSchema, 3, 1),
});

export type RemixResult = z.infer<typeof RemixResultSchema>;
export type Remix = {
  id: string;
  sourceUrl: string;
  title: string;
  createdAt: number;
  video: (VideoMeta & { transcript: string | null }) | null;
  manualText: string;
  result: RemixResult;
};

const REMIX_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["analisis", "versiones"],
  properties: {
    analisis: {
      type: "object",
      additionalProperties: false,
      required: ["resumen", "ganchoOriginal", "tipoGancho", "estructura", "porQueFunciona", "dificultad", "necesitas"],
      properties: {
        resumen: { type: "string", description: "Qué es este vídeo y qué hace bien, en 1–2 frases" },
        ganchoOriginal: { type: "string", description: "El gancho del original (texto o primera frase)" },
        tipoGancho: { type: "string", description: "Tipo de gancho: pregunta, error común, promesa, polémica, comparación…" },
        estructura: { type: "array", items: { type: "string" }, description: "Pasos del vídeo con tiempos, p. ej. «0–2 s: gancho con texto grande»" },
        porQueFunciona: { type: "array", items: { type: "string" }, description: "3–5 motivos concretos por los que retiene o se comparte" },
        dificultad: { type: "integer", description: "1 fácil, 2 media, 3 difícil de grabar y editar" },
        necesitas: { type: "array", items: { type: "string" }, description: "Lo que hace falta para grabarlo: material, lugar, persona" },
      },
    },
    versiones: {
      type: "array",
      description: "Exactamente 3 versiones distintas del guion",
      items: {
        type: "object",
        additionalProperties: false,
        required: [...SCRIPT_JSON_SCHEMA.required, "enfoque", "queCambia"],
        properties: {
          ...SCRIPT_JSON_SCHEMA.properties,
          enfoque: { type: "string", description: "Nombre del enfoque en 1–3 palabras (p. ej. «Calcada»), sin explicaciones" },
          queCambia: { type: "string", description: "Qué has cambiado respecto al original y por qué" },
        },
      },
    },
  },
};

const fmt = (n: number | null) => (n === null ? "sin dato" : new Intl.NumberFormat("es-ES").format(n));

function videoText(v: VideoMeta, transcript: string | null) {
  const eng = v.views ? `Likes ${fmt(v.likes)} (${(((v.likes ?? 0) / v.views) * 100).toFixed(1)} %), compartidos ${fmt(v.shares)}, guardados ${fmt(v.saves)}, comentarios ${fmt(v.comments)}.` : "";
  return `Cuenta: @${v.handle}
Enlace: ${v.url}
Visitas: ${fmt(v.views)}. ${eng}
Duración: ${v.duration ?? "?"} s${v.music ? `. Sonido: ${v.music}` : ""}
Descripción: ${v.caption || "(vacía)"}
Lo que se dice en el vídeo (transcripción): ${transcript ? `«${transcript.slice(0, 3500)}»` : "no disponible (puede no hablar nadie o no se ha podido transcribir)"}`;
}

export function buildRemixPrompt(context: string, source: string, note: string) {
  return `<contexto>
${context}
</contexto>

<video_de_referencia>
${source}
</video_de_referencia>
${note ? `\nNota del creador: ${note}\n` : ""}
Analiza ese vídeo y escribe 3 versiones del guion para que el creador grabe SU propio vídeo inspirado en él.

Reglas:
- No copies su texto ni sus frases: copia la estructura, el ritmo y el tipo de gancho, y llévalos al gimnasio, el físico, la voz y los ejemplos del creador. El gancho de cada versión tiene que ser distinto del original.
- Versión 1 «Calcada»: la misma estructura y duración, adaptada a él con lo que puede grabar esta semana.
- Versión 2 «A tu manera»: con el tono de su perfil y su propia imagen o estilo como parte del gancho.
- Versión 3 «Giro»: un ángulo distinto (serie numerada, mito vs realidad, reto con un colega, respuesta a comentarios…) para que no parezca una copia.
- Si en el vídeo hay datos o afirmaciones de salud, no los repitas si no son seguros: corrígelos.
- Si no hay transcripción, dilo en el resumen y trabaja solo con la descripción y las métricas.
- Cada versión lleva todos los campos del guion y la descripción lista para pegar, con palabras que la gente busca y 3–5 hashtags de nicho (nunca #fyp).`;
}

function parseResult(raw: string): RemixResult {
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    // Se trata abajo
  }
  const out = RemixResultSchema.safeParse(json);
  if (!out.success) log.warn("manny.remix_invalid", { issues: issues(out.error), sample: raw.slice(0, 300) });
  if (!out.success) throw new MannyError("Manny escribió las versiones con un formato raro. Vuelve a intentarlo.", true);
  return out.data;
}

export type RemixInput = { url?: string; text?: string; note?: string; transcribe?: boolean };

/** Lee el vídeo, lo transcribe y pide las versiones. Si no se puede leer el enlace pero hay texto pegado, trabaja con el texto. */
export async function createRemix(workspaceId: string, input: RemixInput) {
  const url = input.url?.trim() ?? "";
  const text = input.text?.trim() ?? "";
  if (!url && !text) throw badRequest("Pega el enlace de un TikTok o YouTube Short, o escribe lo que dice el vídeo");

  let parsed: ParsedVideoUrl | null = null;
  if (url) {
    parsed = parseVideoUrl(url);
    if (!parsed) throw badRequest("Ese enlace no es de un vídeo de TikTok o YouTube. Pega el enlace completo del vídeo.");
    if (parsed.short) parsed = await resolveShortLink(parsed.url);
  }

  let video: (VideoMeta & { transcript: string | null }) | null = null;
  let readError: string | null = null;
  if (parsed) {
    try {
      const meta = await fetchVideo(parsed);
      const transcript = input.transcribe === false ? null : await transcribeVideo(parsed);
      upsertVideo(workspaceId, meta, "pasted", transcript);
      video = { ...meta, transcript };
    } catch (e) {
      if (!(e instanceof MannyError) || !text) throw e;
      readError = e.message;
    }
  }

  const source = video ? videoText(video, video.transcript) + (text ? `\nTexto que ha añadido el creador: ${text.slice(0, 3000)}` : "") : `El vídeo no se ha podido leer${readError ? ` (${readError})` : ""}. Lo que pega el creador: ${text.slice(0, 4000)}`;
  const raw = await runClaude({ system: SYSTEM, prompt: buildRemixPrompt(buildContext(workspaceId), source, input.note?.trim().slice(0, 500) ?? ""), schema: REMIX_JSON_SCHEMA, timeoutMs: 240_000 });
  const result = parseResult(raw);

  const id = randomUUID().slice(0, 10);
  const title = (video?.caption || text).replace(/\s+/g, " ").slice(0, 90) || "Vídeo sin título";
  db.prepare("INSERT INTO manny_remixes (id, workspace_id, source_url, title, data, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    id,
    workspaceId,
    parsed?.url ?? "",
    title,
    JSON.stringify({ video, manualText: text, result }),
    Date.now(),
  );
  return id;
}

type RemixRow = { id: string; source_url: string; title: string; data: string; created_at: number };
const toRemix = (r: RemixRow): Remix => {
  const d = JSON.parse(r.data) as { video: Remix["video"]; manualText: string; result: RemixResult };
  return { id: r.id, sourceUrl: r.source_url, title: r.title, createdAt: r.created_at, video: d.video, manualText: d.manualText, result: d.result };
};

export function getRemix(workspaceId: string, id: string): Remix {
  const r = db.prepare("SELECT * FROM manny_remixes WHERE workspace_id = ? AND id = ?").get(workspaceId, id) as RemixRow | undefined;
  if (!r) throw notFound("Ese análisis");
  return toRemix(r);
}

export function listRemixes(workspaceId: string, limit = 30): Remix[] {
  const rows = db.prepare("SELECT * FROM manny_remixes WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?").all(workspaceId, limit) as RemixRow[];
  return rows.map(toRemix);
}

export function deleteRemix(workspaceId: string, id: string) {
  if (!db.prepare("DELETE FROM manny_remixes WHERE workspace_id = ? AND id = ?").run(workspaceId, id).changes) throw notFound("Ese análisis");
}

/** Guarda una de las versiones como guion en «Guiones». */
export function saveVersionAsScript(workspaceId: string, remixId: string, index: number) {
  const r = getRemix(workspaceId, remixId);
  const v = r.result.versiones[index];
  if (!v) throw notFound("Esa versión");
  const { enfoque, queCambia: _q, ...draft } = v;
  void _q;
  const script: Omit<PlanScript, "id"> = {
    ...draft,
    etiquetas: [enfoque, ...draft.etiquetas].slice(0, 4),
    dia: null,
    hora: null,
    referencia: r.sourceUrl ? { texto: `${r.video ? `@${r.video.handle} · ${fmt(r.video.views)} visitas` : "Vídeo de referencia"}`, url: r.sourceUrl } : null,
  };
  return addMannyScript(workspaceId, script);
}
