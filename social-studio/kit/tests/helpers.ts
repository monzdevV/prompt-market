import { randomUUID } from "node:crypto";
import { createInvite, createUser, userCount } from "@/lib/auth";
import { upsertAccount } from "@/lib/accounts";
import { db, type Platform } from "@/lib/db";
import { createMedia } from "@/lib/media";

let adminId: string | null = null;

/** Crea un usuario de prueba (el primero es admin; el resto entra con invitación). */
export async function makeUser(email = `u-${randomUUID()}@test.dev`, plan: "free" | "pro" | "business" = "business") {
  // El admin puede haberse creado fuera del helper (p. ej. un test que registra al primer usuario)
  adminId ??= (db.prepare("SELECT id FROM users WHERE is_admin = 1 LIMIT 1").get() as { id: string } | undefined)?.id ?? null;
  const inviteCode = userCount() > 0 && adminId ? createInvite(adminId) : undefined;
  const u = await createUser({ email, password: "contraseña-segura-123", name: "Test", inviteCode });
  adminId ??= u.userId;
  // Los tests de funcionalidad no deben chocar con los límites del plan gratuito (hay tests propios para eso)
  db.prepare("UPDATE workspaces SET plan = ? WHERE id = ?").run(plan, u.workspaceId);
  return u;
}

export function makeAccount(workspaceId: string, platform: Platform = "youtube") {
  return upsertAccount(workspaceId, {
    platform,
    external_id: randomUUID(),
    name: `${platform} test`,
    access_token: "access-secreto",
    refresh_token: "refresh-secreto",
  });
}

export function makeMedia(workspaceId: string) {
  const id = randomUUID();
  createMedia({ id, workspaceId, filename: `${id}.mp4`, originalName: "video.mp4", mime: "video/mp4", size: 10 });
  // La transcripción/IA no importa en estos tests: el trabajo de procesado se quita de la cola
  db.prepare("DELETE FROM jobs WHERE kind = 'process_media' AND ref_id = ?").run(id);
  db.prepare("UPDATE media SET status = 'ready' WHERE id = ?").run(id);
  return id;
}
