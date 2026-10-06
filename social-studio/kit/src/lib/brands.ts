import { randomUUID } from "node:crypto";
import { db } from "./db";

export type Brand = { id: string; workspace_id: string; name: string; is_default: number; created_at: number };

export function createDefaultBrand(workspaceId: string, name: string) {
  const id = randomUUID();
  db.prepare("INSERT INTO brands (id, workspace_id, name, is_default, created_at) VALUES (?, ?, ?, 1, ?)").run(
    id,
    workspaceId,
    name,
    Date.now(),
  );
  return id;
}

/** Marca por defecto del espacio (existe siempre: se crea al registrarse y la migración 2 la rellena). */
export function defaultBrandId(workspaceId: string) {
  const row = db.prepare("SELECT id FROM brands WHERE workspace_id = ? AND is_default = 1").get(workspaceId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function listBrands(workspaceId: string) {
  return db
    .prepare("SELECT * FROM brands WHERE workspace_id = ? AND archived_at IS NULL ORDER BY is_default DESC, name")
    .all(workspaceId) as Brand[];
}
