import { db, tx, type Account, type AccountWithTokens, type Platform } from "./db";
import { defaultBrandId } from "./brands";
import { assertWithinLimit } from "./plans";
import { decryptSecret, encryptSecret } from "./crypto";

export type NewAccount = {
  platform: Platform;
  external_id: string;
  name: string;
  avatar?: string | null;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  meta?: Record<string, unknown>;
  /** Permisos que el usuario concedió de verdad (puede aceptar solo algunos) */
  granted_scopes?: string[];
};

/** Cuentas visibles en la app (sin tokens). */
export function listAccounts(workspaceId: string) {
  return db
    .prepare(
      `SELECT id, workspace_id, brand_id, platform, external_id, name, avatar, status, meta, created_at,
              sync_status, last_synced_at, last_sync_error, rate_limited_until, granted_scopes
       FROM accounts WHERE workspace_id = ? AND status != 'disconnected' ORDER BY platform, name`,
    )
    .all(workspaceId) as Account[];
}

/** Conecta o reconecta (misma cuenta en el mismo espacio = misma fila, conserva el historial). */
export function upsertAccount(workspaceId: string, a: NewAccount) {
  return tx(() => {
    // Una cuenta nueva cuenta para el límite del plan; reconectar una existente, no
    const exists = db
      .prepare("SELECT status FROM accounts WHERE workspace_id = ? AND platform = ? AND external_id = ?")
      .get(workspaceId, a.platform, a.external_id) as { status: string } | undefined;
    if (!exists || exists.status === "disconnected") assertWithinLimit(workspaceId, "socialAccounts");
    const row = db
      .prepare(
        `INSERT INTO accounts (workspace_id, brand_id, platform, external_id, name, avatar, status, meta, granted_scopes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
         ON CONFLICT (workspace_id, platform, external_id) DO UPDATE SET
           name = excluded.name, avatar = excluded.avatar, status = 'active', meta = excluded.meta,
           granted_scopes = excluded.granted_scopes, sync_status = 'connected', last_sync_error = NULL,
           rate_limited_until = NULL,
           -- Tras desconectar (y en YouTube, borrar sus datos) la próxima sincronización vuelve a traer 90 días
           last_synced_at = CASE WHEN accounts.status = 'disconnected' THEN NULL ELSE accounts.last_synced_at END
         RETURNING id`,
      )
      .get(
        workspaceId,
        defaultBrandId(workspaceId),
        a.platform,
        a.external_id,
        a.name,
        a.avatar ?? null,
        JSON.stringify(a.meta ?? {}),
        a.granted_scopes ? a.granted_scopes.join(" ") : null,
        Date.now(),
      ) as {
      id: number;
    };
    db.prepare(
      `INSERT INTO account_tokens (account_id, access_token, refresh_token, expires_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (account_id) DO UPDATE SET
         access_token = excluded.access_token,
         refresh_token = COALESCE(excluded.refresh_token, account_tokens.refresh_token),
         expires_at = excluded.expires_at, updated_at = excluded.updated_at`,
    ).run(
      row.id,
      encryptSecret(a.access_token),
      a.refresh_token ? encryptSecret(a.refresh_token) : null,
      a.expires_at ?? null,
      Date.now(),
    );
    return row.id;
  });
}

/** Solo para el servidor (publicar, estadísticas). Nunca devolver esto a una respuesta HTTP. */
export function getAccountWithTokens(accountId: number): AccountWithTokens | null {
  const row = db
    .prepare(
      `SELECT a.*, t.access_token AS enc_access, t.refresh_token AS enc_refresh, t.expires_at AS token_expires_at
       FROM accounts a JOIN account_tokens t ON t.account_id = a.id WHERE a.id = ? AND a.status != 'disconnected'`,
    )
    .get(accountId) as (Account & { enc_access: string; enc_refresh: string | null; token_expires_at: number | null }) | undefined;
  if (!row) return null;
  const { enc_access, enc_refresh, token_expires_at, ...account } = row;
  return {
    ...account,
    access_token: decryptSecret(enc_access),
    refresh_token: enc_refresh ? decryptSecret(enc_refresh) : null,
    expires_at: token_expires_at,
  };
}

export function updateTokens(account: AccountWithTokens, access: string, refresh: string | null, expiresInS?: number) {
  const expires_at = expiresInS ? Date.now() + expiresInS * 1000 : null;
  db.prepare(
    "UPDATE account_tokens SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?, updated_at = ? WHERE account_id = ?",
  ).run(encryptSecret(access), refresh ? encryptSecret(refresh) : null, expires_at, Date.now(), account.id);
  return { ...account, access_token: access, refresh_token: refresh ?? account.refresh_token, expires_at };
}

export function markNeedsReauth(accountId: number) {
  db.prepare("UPDATE accounts SET status = 'needs_reauth' WHERE id = ? AND status = 'active'").run(accountId);
}

/**
 * Desconectar borra los tokens pero conserva la fila: el historial de publicaciones de la app no se pierde.
 * Las publicaciones pendientes en esa cuenta se cancelan (pasan a error con el motivo).
 * Devuelve la lista de publicaciones afectadas, o null si la cuenta no es de este espacio.
 */
export function disconnectAccount(workspaceId: string, accountId: number) {
  return tx(() => {
    const r = db
      .prepare("UPDATE accounts SET status = 'disconnected', sync_status = 'connected' WHERE id = ? AND workspace_id = ? AND status != 'disconnected'")
      .run(accountId, workspaceId);
    if (r.changes !== 1) return null;
    db.prepare("DELETE FROM account_tokens WHERE account_id = ?").run(accountId);
    const pending = db
      .prepare("SELECT id, post_id FROM post_targets WHERE account_id = ? AND status = 'pending'")
      .all(accountId) as { id: number; post_id: number }[];
    for (const t of pending) {
      db.prepare("UPDATE post_targets SET status = 'failed', error = 'Cancelada: la cuenta se desconectó' WHERE id = ?").run(t.id);
      db.prepare("DELETE FROM jobs WHERE kind = 'publish_target' AND ref_id = ? AND status = 'queued'").run(String(t.id));
    }
    return [...new Set(pending.map((t) => t.post_id))];
  });
}

/** Publicaciones pendientes por cuenta (para avisar antes de desconectar). */
export function pendingCountByAccount(workspaceId: string) {
  const rows = db
    .prepare(
      `SELECT t.account_id, COUNT(*) AS n FROM post_targets t JOIN posts p ON p.id = t.post_id
       WHERE p.workspace_id = ? AND p.deleted_at IS NULL AND t.status = 'pending' GROUP BY t.account_id`,
    )
    .all(workspaceId) as { account_id: number; n: number }[];
  return new Map(rows.map((r) => [r.account_id, r.n]));
}

// Renovación de tokens serializada por cuenta: dos renovaciones a la vez invalidarían el
// refresh token rotativo de TikTok. Un único proceso, así que basta con un mapa de promesas.
const refreshing = new Map<number, Promise<AccountWithTokens>>();

export function withRefreshLock(accountId: number, fn: () => Promise<AccountWithTokens>) {
  const pending = refreshing.get(accountId);
  if (pending) return pending;
  const p = fn().finally(() => refreshing.delete(accountId));
  refreshing.set(accountId, p);
  return p;
}

export function needsRefresh(account: Pick<AccountWithTokens, "expires_at">) {
  return !!account.expires_at && account.expires_at - Date.now() < 10 * 60 * 1000;
}
