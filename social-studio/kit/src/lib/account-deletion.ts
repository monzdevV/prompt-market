import fs from "node:fs";
import path from "node:path";
import { getAccountWithTokens } from "./accounts";
import { COVER_DIR } from "./covers";
import { db, tx } from "./db";
import { conflict } from "./errors";
import { log } from "./log";
import { deleteMediaFiles } from "./media";
import { revokeAtProvider } from "./platforms/revoke";
import { deleteRelayProfile } from "./platforms/uploadpost";

/**
 * Borra al usuario y los espacios de trabajo de los que es dueño (en cascada: cuentas, tokens,
 * vídeos, publicaciones, trabajos). Los ficheros de vídeo se borran después del commit.
 */
export async function deleteUserAccount(userId: string) {
  let workspaces: string[] = [];
  // Un dueño con equipo no puede borrar de golpe el espacio de los demás (se quedarían sin acceso)
  const assertNoTeam = () => {
    const others = db
      .prepare(
        `SELECT COUNT(*) AS n FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id
         WHERE w.owner_id = ? AND m.user_id != ?`,
      )
      .get(userId, userId) as { n: number };
    if (others.n > 0) throw conflict("Tu equipo tiene más miembros. Quítalos en Ajustes → Equipo antes de borrar tu cuenta.");
  };
  assertNoTeam();

  // Retirar en la red el acceso de YouTube y TikTok (política de datos de YouTube), no solo borrar nuestra copia
  const accounts = db
    .prepare(
      `SELECT a.id FROM accounts a JOIN workspaces w ON w.id = a.workspace_id
       WHERE w.owner_id = ? AND a.status != 'disconnected' AND a.platform IN ('youtube', 'tiktok')`,
    )
    .all(userId) as { id: number }[];
  for (const { id } of accounts) {
    // Un token ilegible (clave cambiada, dato corrupto) no puede impedir borrar la cuenta (RGPD)
    try {
      const account = getAccountWithTokens(id);
      if (account) await revokeAtProvider(account);
    } catch (e) {
      log.warn("account.revoke_failed", { accountId: id, err: e });
    }
  }

  // Upload-Post: borrar el perfil de cada espacio retira también sus conexiones a las redes
  const owned = (db.prepare("SELECT id FROM workspaces WHERE owner_id = ?").all(userId) as { id: string }[]).map((w) => w.id);
  for (const ws of owned) {
    try {
      await deleteRelayProfile(ws);
    } catch (e) {
      log.warn("account.relay_delete_failed", { workspaceId: ws, err: e });
    }
  }

  const files = tx(() => {
    // Otra vez dentro de la transacción: alguien pudo aceptar una invitación mientras revocábamos
    assertNoTeam();
    workspaces = (db.prepare("SELECT id FROM workspaces WHERE owner_id = ?").all(userId) as { id: string }[]).map((w) => w.id);
    const rows = db
      .prepare("SELECT m.filename FROM media m JOIN workspaces w ON w.id = m.workspace_id WHERE w.owner_id = ?")
      .all(userId) as { filename: string }[];
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return rows.map((r) => r.filename);
  });
  deleteMediaFiles(files);
  // Portadas (imágenes propias y fotogramas) de los espacios borrados
  for (const ws of workspaces) fs.rmSync(path.join(COVER_DIR, path.basename(ws)), { recursive: true, force: true });
  log.info("account.deleted", { userId, files: files.length });
}
