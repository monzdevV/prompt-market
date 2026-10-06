import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { audit } from "./audit";
import { randomToken } from "./crypto";
import { deleteProviderData } from "./sync";

/**
 * Callback de eliminación de datos de Meta (obligatorio para App Review y modo Activo).
 * developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Meta envía POST con `signed_request` = "<firma>.<payload>" (base64url). La firma es HMAC-SHA256 del
 * payload con el App Secret. El payload trae `user_id` (id del usuario de Facebook con ámbito de la app).
 * Respondemos { url, confirmation_code } para que el usuario pueda consultar el estado.
 */
/** Una petición firmada vale como mucho 1 hora: una copia capturada (logs, proxies) no se puede reutilizar después. */
const MAX_AGE_S = 3600;

export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
  now = Date.now(),
): { user_id?: string; algorithm?: string; issued_at?: number } | null {
  const [sig, payload] = signedRequest.split(".", 2);
  if (!sig || !payload) return null;
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (String(data.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") return null;
    if (typeof data.issued_at !== "number" || Math.abs(now / 1000 - data.issued_at) > MAX_AGE_S) return null;
    return data;
  } catch {
    return null;
  }
}

/** Borra los datos de Facebook/Instagram de ese usuario de Facebook en todos los espacios. Devuelve el código de confirmación. */
export function deleteMetaUserData(fbUserId: string) {
  const accounts = db
    .prepare(
      `SELECT id, workspace_id FROM accounts
       WHERE platform IN ('facebook', 'instagram') AND json_extract(meta, '$.fb_user_id') = ?`,
    )
    .all(fbUserId) as { id: number; workspace_id: string }[];
  const code = randomToken(12);
  for (const a of accounts) {
    db.prepare("DELETE FROM account_tokens WHERE account_id = ?").run(a.id);
    db.prepare("UPDATE accounts SET status = 'disconnected' WHERE id = ?").run(a.id);
    deleteProviderData(a.id);
    audit({ workspaceId: a.workspace_id, actorUserId: null, action: "meta.data_deletion", targetType: "account", targetId: a.id, meta: { code } });
  }
  // Registro global para la página de estado (sin datos personales: solo el código y cuántas cuentas)
  audit({ workspaceId: null, actorUserId: null, action: "meta.data_deletion_request", targetId: code, meta: { accounts: accounts.length } });
  return { code, accounts: accounts.length };
}

export function deletionStatus(code: string) {
  const row = db
    .prepare("SELECT created_at, meta FROM audit_logs WHERE action = 'meta.data_deletion_request' AND target_id = ?")
    .get(code) as { created_at: number; meta: string } | undefined;
  return row ? { completedAt: row.created_at, accounts: (JSON.parse(row.meta) as { accounts: number }).accounts } : null;
}
