import { db, tx } from "./db";
import { pkcePair, randomToken, sha256 } from "./crypto";

const STATE_TTL_MS = 10 * 60_000;

/**
 * Estado OAuth guardado en el servidor y ligado al usuario y espacio que iniciaron la conexión.
 * Así una cuenta no puede acabar en el espacio de otra persona (CSRF de login) y el estado es de un solo uso.
 */
export function createOAuthState(input: { workspaceId: string; userId: string; connector: string; pkce: boolean }) {
  const state = randomToken(24);
  const pair = input.pkce ? pkcePair() : null;
  db.prepare(
    "INSERT INTO oauth_states (state_hash, workspace_id, user_id, connector, code_verifier, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(sha256(state), input.workspaceId, input.userId, input.connector, pair?.verifier ?? null, Date.now() + STATE_TTL_MS);
  return { state, codeChallenge: pair?.challenge };
}

/** Consume el estado (una sola vez). null si no existe, caducó, es de otra red o de otro usuario. */
export function consumeOAuthState(state: string, connector: string, userId: string) {
  return tx(() => {
    const row = db
      .prepare("SELECT * FROM oauth_states WHERE state_hash = ?")
      .get(sha256(state)) as
      | { workspace_id: string; user_id: string; connector: string; code_verifier: string | null; expires_at: number }
      | undefined;
    if (!row) return null;
    db.prepare("DELETE FROM oauth_states WHERE state_hash = ?").run(sha256(state));
    if (row.expires_at < Date.now() || row.connector !== connector || row.user_id !== userId) return null;
    const member = db
      .prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
      .get(row.workspace_id, userId);
    if (!member) return null;
    return { workspaceId: row.workspace_id, codeVerifier: row.code_verifier ?? undefined };
  });
}
