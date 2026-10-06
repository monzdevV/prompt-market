import { db } from "./db";

/**
 * Registro de auditoría: quién hizo qué cambio sensible (conectar/desconectar redes, borrar datos,
 * cambios de plan, invitaciones). Solo se añaden filas; nunca se guardan tokens ni contraseñas.
 */
export function audit(entry: {
  workspaceId: string | null;
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string | number;
  meta?: Record<string, unknown>;
}) {
  db.prepare(
    "INSERT INTO audit_logs (workspace_id, actor_user_id, action, target_type, target_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    entry.workspaceId,
    entry.actorUserId,
    entry.action,
    entry.targetType ?? null,
    entry.targetId === undefined ? null : String(entry.targetId),
    JSON.stringify(entry.meta ?? {}),
    Date.now(),
  );
}

export function listAudit(workspaceId: string, limit = 100) {
  return db
    .prepare(
      `SELECT a.action, a.target_type, a.target_id, a.meta, a.created_at, u.email AS actor
       FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.workspace_id = ? ORDER BY a.created_at DESC LIMIT ?`,
    )
    .all(workspaceId, Math.min(Math.max(1, limit), 500)) as {
    action: string;
    target_type: string | null;
    target_id: string | null;
    meta: string;
    created_at: number;
    actor: string | null;
  }[];
}
