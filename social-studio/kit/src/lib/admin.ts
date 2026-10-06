import { db } from "./db";
import { lastBeat } from "./jobs";

/** Vista global para el administrador de la instalación (no filtra por espacio de trabajo). */
export function adminOverview() {
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const period = new Date().toISOString().slice(0, 7);
  return {
    users: count("SELECT COUNT(*) AS n FROM users"),
    accounts: count("SELECT COUNT(*) AS n FROM accounts WHERE status = 'active'"),
    queued: count("SELECT COUNT(*) AS n FROM jobs WHERE status = 'queued'"),
    running: count("SELECT COUNT(*) AS n FROM jobs WHERE status = 'running'"),
    needsReview: count("SELECT COUNT(*) AS n FROM post_targets WHERE status = 'needs_review'"),
    workerBeat: lastBeat(),
    usage: db
      .prepare("SELECT metric, SUM(value) AS value FROM usage WHERE period = ? GROUP BY metric")
      .all(period) as { metric: string; value: number }[],
    failedJobs: db
      .prepare(
        `SELECT j.id, j.kind, j.ref_id, j.attempts, j.last_error, j.updated_at, u.email
         FROM jobs j JOIN workspaces w ON w.id = j.workspace_id JOIN users u ON u.id = w.owner_id
         WHERE j.status = 'failed' OR (j.status = 'queued' AND j.last_error IS NOT NULL)
         ORDER BY j.updated_at DESC LIMIT 50`,
      )
      .all() as { id: number; kind: string; ref_id: string; attempts: number; last_error: string | null; updated_at: number; email: string }[],
    workspaces: db
      .prepare(
        `SELECT w.id, w.name, w.plan, w.plan_source, w.created_at, u.email AS owner,
                (SELECT COUNT(*) FROM accounts a WHERE a.workspace_id = w.id AND a.status != 'disconnected') AS accounts
         FROM workspaces w JOIN users u ON u.id = w.owner_id ORDER BY w.created_at DESC LIMIT 200`,
      )
      .all() as { id: string; name: string; plan: string; plan_source: string; created_at: number; owner: string; accounts: number }[],
    invites: db
      .prepare(
        `SELECT i.note, i.created_at, i.expires_at, i.used_at, u.email AS used_by
         FROM invites i LEFT JOIN users u ON u.id = i.used_by ORDER BY i.created_at DESC LIMIT 20`,
      )
      .all() as { note: string; created_at: number; expires_at: number; used_at: number | null; used_by: string | null }[],
  };
}
