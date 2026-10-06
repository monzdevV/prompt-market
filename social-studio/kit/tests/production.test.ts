import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { checkEnv } from "@/lib/env";
import { db, UPLOAD_DIR } from "@/lib/db";
import { backupDatabase, BACKUP_DIR, purgeOldUploads } from "@/lib/maintenance";
import { DatabaseSync } from "node:sqlite";
import { makeAccount, makeUser } from "./helpers";

const key = randomBytes(32).toString("base64");

describe("configuración al arrancar", () => {
  it("en producción exige https y ADMIN_EMAIL, y una clave de cifrado válida", () => {
    expect(checkEnv({ NODE_ENV: "production", APP_URL: "http://mi-app.com", TOKEN_ENC_KEY: key }).errors.join()).toMatch(/https/);
    expect(checkEnv({ NODE_ENV: "production", APP_URL: "https://mi-app.com", TOKEN_ENC_KEY: key }).errors.join()).toMatch(/ADMIN_EMAIL/);
    expect(checkEnv({ NODE_ENV: "production", APP_URL: "https://mi-app.com", TOKEN_ENC_KEY: "corta", ADMIN_EMAIL: "a@b.es" }).errors.join()).toMatch(/32 bytes/);
    expect(checkEnv({ NODE_ENV: "production", APP_URL: "https://mi-app.com", TOKEN_ENC_KEY: key, ADMIN_EMAIL: "a@b.es" }).errors).toEqual([]);
    expect(checkEnv({ NODE_ENV: "development", TOKEN_ENC_KEY: key }).errors).toEqual([]);
  });

  it("avisa si solo está la mitad de las credenciales de una red", () => {
    expect(checkEnv({ TOKEN_ENC_KEY: key, META_APP_ID: "123" }).warnings.join()).toMatch(/META_APP_SECRET/);
  });
});

describe("mantenimiento", () => {
  it("la copia de seguridad es una base válida con los datos y rota las antiguas", async () => {
    await makeUser();
    const dest = await backupDatabase(new Date("2026-01-01"));
    const copy = new DatabaseSync(dest);
    expect((copy.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n).toBeGreaterThan(0);
    copy.close();
    process.env.BACKUP_KEEP = "2";
    for (const d of ["2026-01-02", "2026-01-03"]) await backupDatabase(new Date(d));
    expect(fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db"))).toEqual(["studio-2026-01-02.db", "studio-2026-01-03.db"]);
    delete process.env.BACKUP_KEEP;
  });

  it("borra el fichero de vídeos antiguos ya resueltos (conserva la fila) y los huérfanos", async () => {
    const u = await makeUser();
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const id = crypto.randomUUID();
    fs.writeFileSync(path.join(UPLOAD_DIR, `${id}.mp4`), "x");
    db.prepare(
      "INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at) VALUES (?, ?, ?, 'v', 'video/mp4', 1, 'ready', 0)",
    ).run(id, u.workspaceId, `${id}.mp4`);
    // Otro vídeo antiguo sin publicaciones (borrador): se conserva
    const draft = crypto.randomUUID();
    fs.writeFileSync(path.join(UPLOAD_DIR, `${draft}.mp4`), "x");
    db.prepare(
      "INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at) VALUES (?, ?, ?, 'v', 'video/mp4', 1, 'ready', 0)",
    ).run(draft, u.workspaceId, `${draft}.mp4`);
    const acc = makeAccount(u.workspaceId);
    const { id: postId } = db
      .prepare("INSERT INTO posts (workspace_id, media_id, description, scheduled_at, status, created_at) VALUES (?, ?, 'd', 0, 'done', 0) RETURNING id")
      .get(u.workspaceId, id) as { id: number };
    db.prepare("INSERT INTO post_targets (post_id, account_id, status) VALUES (?, ?, 'published')").run(postId, acc);
    const orphan = path.join(UPLOAD_DIR, "huerfano.mp4");
    fs.writeFileSync(orphan, "x");
    fs.utimesSync(orphan, new Date(0), new Date(0));

    const r = purgeOldUploads(30);
    expect(r.files).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(UPLOAD_DIR, `${id}.mp4`))).toBe(false);
    expect(fs.existsSync(orphan)).toBe(false);
    expect(db.prepare("SELECT size FROM media WHERE id = ?").get(id)).toMatchObject({ size: 0 });
    expect(fs.existsSync(path.join(UPLOAD_DIR, `${draft}.mp4`))).toBe(true);
  });
});
