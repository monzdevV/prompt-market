import { randomUUID } from "node:crypto";
import { db, tx } from "../db";
import { ApiError, notFound } from "../errors";
import { PLAN_SCRIPTS } from "./seed-data";
import type { PlanScript, ScriptStatus } from "./types";

export type ScriptRow = {
  id: string;
  source: "plan" | "manny";
  status: ScriptStatus;
  script: PlanScript;
  createdAt: number;
  updatedAt: number;
};

const hasPlan = (workspaceId: string) =>
  !!db.prepare("SELECT 1 FROM manny_scripts WHERE workspace_id = ? AND source = 'plan' LIMIT 1").get(workspaceId);

/**
 * La primera vez que se abren los guiones se copian los del plan de la semana 1 (una sola vez).
 * Idempotente: sin semilla no hace nada (ni abre transacción), la comprobación se repite dentro de la
 * transacción (dos peticiones a la vez no duplican) e INSERT OR IGNORE respeta los que ya existan.
 */
export function ensurePlanSeeded(workspaceId: string) {
  if (!PLAN_SCRIPTS.length || hasPlan(workspaceId)) return;
  tx(() => {
    if (hasPlan(workspaceId)) return;
    const now = Date.now();
    const insert = db.prepare(
      "INSERT OR IGNORE INTO manny_scripts (id, workspace_id, source, data, status, position, created_at, updated_at) VALUES (?, ?, 'plan', ?, 'pendiente', ?, ?, ?)",
    );
    PLAN_SCRIPTS.forEach((s, i) => insert.run(s.id, workspaceId, JSON.stringify(s), i, now, now));
  });
}

type Raw = { id: string; source: "plan" | "manny"; status: ScriptStatus; data: string; created_at: number; updated_at: number };
const toRow = (r: Raw): ScriptRow => ({
  id: r.id,
  source: r.source,
  status: r.status,
  script: JSON.parse(r.data) as PlanScript,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Los del plan en su orden; después los que ha escrito Manny, del más nuevo al más antiguo. */
export function listScripts(workspaceId: string): ScriptRow[] {
  ensurePlanSeeded(workspaceId);
  const rows = db
    .prepare(
      `SELECT id, source, status, data, created_at, updated_at FROM manny_scripts WHERE workspace_id = ?
       ORDER BY CASE source WHEN 'plan' THEN 0 ELSE 1 END, CASE source WHEN 'plan' THEN position ELSE -created_at END`,
    )
    .all(workspaceId) as Raw[];
  return rows.map(toRow);
}

export function setScriptStatus(workspaceId: string, id: string, status: ScriptStatus) {
  const r = db.prepare("UPDATE manny_scripts SET status = ?, updated_at = ? WHERE workspace_id = ? AND id = ?").run(status, Date.now(), workspaceId, id);
  if (!r.changes) throw notFound("Ese guion");
}

export function addMannyScript(workspaceId: string, script: Omit<PlanScript, "id">) {
  const id = `m-${randomUUID().slice(0, 8)}`;
  const now = Date.now();
  db.prepare(
    "INSERT INTO manny_scripts (id, workspace_id, source, data, status, position, created_at, updated_at) VALUES (?, ?, 'manny', ?, 'pendiente', 0, ?, ?)",
  ).run(id, workspaceId, JSON.stringify({ ...script, id }), now, now);
  return id;
}

/** Solo se borran los que escribió Manny; los del plan se descartan con su estado. */
export function deleteMannyScript(workspaceId: string, id: string) {
  const r = db.prepare("DELETE FROM manny_scripts WHERE workspace_id = ? AND id = ? AND source = 'manny'").run(workspaceId, id);
  if (!r.changes) throw new ApiError(404, "not_found", "Ese guion no existe o es del plan: descártalo en vez de borrarlo");
}
