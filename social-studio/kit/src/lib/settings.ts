import { z } from "zod";
import { db } from "./db";

export const SettingsSchema = z.object({
  sector: z.string().trim().max(300, "El sector es demasiado largo (máx. 300)").default(""),
  audience: z.string().trim().max(300, "El público es demasiado largo (máx. 300)").default(""),
  // Vacío = el mismo idioma que se habla en el vídeo
  language: z.string().trim().max(50, "El idioma es demasiado largo").default(""),
  tone: z.string().trim().max(200, "El tono es demasiado largo (máx. 200)").default(""),
  extraKeywords: z.string().trim().max(500, "Demasiadas palabras clave (máx. 500 caracteres)").default(""),
});

export type Settings = z.infer<typeof SettingsSchema>;

export function getSettings(workspaceId: string): Settings {
  const row = db.prepare("SELECT * FROM settings WHERE workspace_id = ?").get(workspaceId) as
    | { sector: string; audience: string; language: string; tone: string; extra_keywords: string }
    | undefined;
  return {
    sector: row?.sector ?? "",
    audience: row?.audience ?? "",
    language: row?.language ?? "",
    tone: row?.tone || "cercano y profesional",
    extraKeywords: row?.extra_keywords ?? "",
  };
}

export function saveSettings(workspaceId: string, s: Settings) {
  db.prepare(
    `INSERT INTO settings (workspace_id, sector, audience, language, tone, extra_keywords, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id) DO UPDATE SET sector = excluded.sector, audience = excluded.audience,
       language = excluded.language, tone = excluded.tone, extra_keywords = excluded.extra_keywords, updated_at = excluded.updated_at`,
  ).run(workspaceId, s.sector, s.audience, s.language, s.tone, s.extraKeywords, Date.now());
}

export function addUsage(workspaceId: string, metric: string, amount: number) {
  if (!amount) return;
  const period = new Date().toISOString().slice(0, 7);
  db.prepare(
    `INSERT INTO usage (workspace_id, period, metric, value) VALUES (?, ?, ?, ?)
     ON CONFLICT (workspace_id, period, metric) DO UPDATE SET value = usage.value + excluded.value`,
  ).run(workspaceId, period, metric, amount);
}
