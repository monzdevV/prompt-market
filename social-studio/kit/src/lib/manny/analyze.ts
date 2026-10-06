import { z } from "zod";
import { workspaceTz } from "../analytics";
import { badRequest } from "../errors";
import { SYSTEM } from "./chat";
import { buildContext } from "./context";
import { log } from "../log";
import { MannyError, runClaude } from "./llm";
import { clip, issues, list } from "./schema-utils";
import { computeInsights, isOutlier, radarFeed, saveRadarAnalysis, type RadarAnalysis, type RadarInsights, type RadarVideo } from "./radar";

const AnalysisSchema = z.object({
  resumen: clip(900),
  patrones: list(z.object({ patron: clip(160), evidencia: clip(600), comoAplicarlo: clip(600) }), 6, 1),
  evitar: list(clip(400), 6),
  probar: list(z.object({ titulo: clip(160), porque: clip(400) }), 6),
  horarios: clip(500).default(""),
});

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumen", "patrones", "evitar", "probar", "horarios"],
  properties: {
    resumen: { type: "string", description: "Conclusión en 2–3 frases: qué funciona ahora mismo en estas cuentas" },
    patrones: {
      type: "array",
      description: "3–5 patrones que se repiten en los vídeos que revientan",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["patron", "evidencia", "comoAplicarlo"],
        properties: {
          patron: { type: "string", description: "El patrón en pocas palabras" },
          evidencia: { type: "string", description: "Con qué vídeos y cifras se ve (cuenta, visitas, veces su mediana)" },
          comoAplicarlo: { type: "string", description: "Cómo lo haría este creador, concreto" },
        },
      },
    },
    evitar: { type: "array", items: { type: "string" }, description: "Lo que no está funcionando o que se ve en los vídeos que flojean" },
    probar: {
      type: "array",
      description: "2–4 formatos o ideas para probar esta semana",
      items: { type: "object", additionalProperties: false, required: ["titulo", "porque"], properties: { titulo: { type: "string" }, porque: { type: "string" } } },
    },
    horarios: { type: "string", description: "Qué dicen los datos sobre días y horas, con prudencia si son pocos" },
  },
};

const pct = (n: number | null) => (n === null ? "?" : `${(n * 100).toFixed(2)} %`);
const fmt = (n: number | null) => (n === null ? "?" : new Intl.NumberFormat("es-ES").format(n));

function insightsText(i: RadarInsights) {
  return [
    `Vídeos analizados: ${i.videos} de ${i.accounts} cuentas. Han reventado (≥2× la mediana de su cuenta y ≥5.000 visitas): ${i.winners}.`,
    `Duración (reventones / resto): ${i.durations.map((d) => `${d.label} ${d.winners}/${d.others}`).join(", ")}. Mediana de duración: ${i.medianDuration.winners ?? "?"} s frente a ${i.medianDuration.others ?? "?"} s.`,
    `Guardados sobre visitas (mediana): ${pct(i.saveRate.winners)} frente a ${pct(i.saveRate.others)}. Compartidos: ${pct(i.shareRate.winners)} frente a ${pct(i.shareRate.others)}.`,
    `Longitud de la descripción: ${i.captionLength.winners ?? "?"} frente a ${i.captionLength.others ?? "?"} caracteres.`,
    i.topTags.length ? `Hashtags más repetidos en los reventones: ${i.topTags.map((t) => `${t.tag} (${t.count})`).join(", ")}.` : "",
    i.bestDays.length ? `Días de publicación de los reventones: ${i.bestDays.map((d) => `${d.day} (${d.count})`).join(", ")}. Horas: ${i.bestHours.map((h) => `${h.hour}:00 (${h.count})`).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function videoLine(v: RadarVideo) {
  const said = v.transcript ? ` Dice: «${v.transcript.replace(/\s+/g, " ").slice(0, 200)}»` : "";
  return `- @${v.handle} (${fmt(v.followers)} seguidores): ${fmt(v.views)} visitas, ×${v.vsMedian?.toFixed(1) ?? "?"} su mediana, ${v.duration ?? "?"} s, guardados ${pct(v.saveRate)}, compartidos ${pct(v.shareRate)}. Descripción: «${v.caption.replace(/\s+/g, " ").slice(0, 160)}»${said}`;
}

/** Manny lee los datos del radar y escribe qué funciona y qué probar. Queda guardado hasta la siguiente vez. */
export async function analyzeRadar(workspaceId: string): Promise<RadarAnalysis> {
  const feed = radarFeed(workspaceId, { days: 90, limit: 5000 });
  const accounts = new Set(feed.map((v) => `${v.platform}:${v.handle}`)).size;
  if (feed.length < 12 || accounts < 2) throw badRequest("Sincroniza al menos dos cuentas del radar antes de pedirle el análisis a Manny.");
  const insights = computeInsights(feed, workspaceTz(workspaceId));
  const winners = feed.filter(isOutlier).slice(0, 14);
  const flops = feed
    .filter((v) => v.vsMedian !== null && v.vsMedian < 0.6 && v.views !== null)
    .sort((a, b) => (a.vsMedian ?? 0) - (b.vsMedian ?? 0))
    .slice(0, 6);
  const prompt = `<contexto>
${buildContext(workspaceId)}
</contexto>

<datos_del_radar>
${insightsText(insights)}

Vídeos que más han reventado para el tamaño de su cuenta:
${winners.map(videoLine).join("\n") || "(ninguno todavía)"}

Vídeos que más han flojeado en sus cuentas:
${flops.map(videoLine).join("\n") || "(ninguno)"}
</datos_del_radar>

Lee estos datos reales y dime qué funciona y qué no en estas cuentas de fitness, y cómo lo aplica ESTE creador. Cita cifras y cuentas reales; si hay pocos datos para una conclusión, dilo en vez de inventarla. No digas nada que los datos no sostengan.`;
  const raw = await runClaude({ system: SYSTEM, prompt, schema: ANALYSIS_JSON_SCHEMA, timeoutMs: 240_000 });
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    // Se trata abajo
  }
  const out = AnalysisSchema.safeParse(json);
  if (!out.success) log.warn("manny.analysis_invalid", { issues: issues(out.error), sample: raw.slice(0, 300) });
  if (!out.success) throw new MannyError("Manny escribió el análisis con un formato raro. Vuelve a intentarlo.", true);
  saveRadarAnalysis(workspaceId, out.data);
  return out.data;
}
