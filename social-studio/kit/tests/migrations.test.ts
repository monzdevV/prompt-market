import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { MIGRATIONS } from "@/lib/db/migrations";

/**
 * Una base creada con la versión anterior (solo migración 1) y con datos debe poder pasar
 * a la versión nueva sin perder nada: la migración 2 es aditiva y rellena marcas por defecto.
 */
describe("migraciones sobre datos existentes", () => {
  it("la migración 2 conserva los datos y asigna una marca por defecto", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(MIGRATIONS[0].sql);
    const now = Date.now();
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u1', 'a@a.dev', 'A', 'x', ?)").run(now);
    db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES ('w1', 'Marca A', 'u1', ?)").run(now);
    db.prepare("INSERT INTO accounts (workspace_id, platform, external_id, name, created_at) VALUES ('w1', 'youtube', 'ch1', 'Canal', ?)").run(now);
    db.prepare(
      "INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at) VALUES ('m1', 'w1', 'm1.mp4', 'v.mp4', 'video/mp4', 1, 'ready', ?)",
    ).run(now);
    db.prepare(
      "INSERT INTO posts (workspace_id, media_id, description, scheduled_at, status, created_at) VALUES ('w1', 'm1', 'd', ?, 'done', ?)",
    ).run(now, now);
    db.prepare(
      "INSERT INTO jobs (workspace_id, kind, ref_id, run_after, created_at, updated_at) VALUES ('w1', 'process_media', 'm1', ?, ?, ?)",
    ).run(now, now, now);

    db.exec("BEGIN");
    db.exec(MIGRATIONS[1].sql);
    db.exec("COMMIT");

    const brand = db.prepare("SELECT id, name, is_default FROM brands WHERE workspace_id = 'w1'").get() as { id: string; name: string };
    expect(brand).toMatchObject({ name: "Marca A", is_default: 1 });
    expect(db.prepare("SELECT brand_id, sync_status FROM accounts").get()).toMatchObject({ brand_id: brand.id, sync_status: "connected" });
    expect(db.prepare("SELECT brand_id, deleted_at FROM posts").get()).toMatchObject({ brand_id: brand.id, deleted_at: null });
    // La cola conserva sus trabajos y ya admite tipos nuevos
    expect(db.prepare("SELECT COUNT(*) AS n FROM jobs").get()).toMatchObject({ n: 1 });
    db.prepare(
      "INSERT INTO jobs (workspace_id, kind, ref_id, run_after, created_at, updated_at) VALUES ('w1', 'sync_account', '1', ?, ?, ?)",
    ).run(now, now, now);
  });

  it("la base impide mezclar espacios de trabajo aunque la app fallara", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    for (const m of MIGRATIONS) db.exec(m.sql);
    const now = Date.now();
    for (const [u, w] of [
      ["u1", "w1"],
      ["u2", "w2"],
    ]) {
      db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, 'x', 'x', ?)").run(u, `${u}@a.dev`, now);
      db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, 'x', ?, ?)").run(w, u, now);
    }
    db.prepare(
      "INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at) VALUES ('m1', 'w1', 'm1.mp4', 'v', 'video/mp4', 1, 'ready', ?)",
    ).run(now);
    db.prepare("INSERT INTO accounts (id, workspace_id, platform, external_id, name, created_at) VALUES (9, 'w2', 'youtube', 'c', 'c', ?)").run(now);

    expect(() =>
      db.prepare("INSERT INTO posts (workspace_id, media_id, description, scheduled_at, status, created_at) VALUES ('w2', 'm1', 'd', ?, 'scheduled', ?)").run(now, now),
    ).toThrow(/otro espacio/);
    const { id } = db
      .prepare("INSERT INTO posts (workspace_id, media_id, description, scheduled_at, status, created_at) VALUES ('w1', 'm1', 'd', ?, 'scheduled', ?) RETURNING id")
      .get(now, now) as { id: number };
    expect(() => db.prepare("INSERT INTO post_targets (post_id, account_id) VALUES (?, 9)").run(id)).toThrow(/distintos/);
  });

  it("la migración 7 (red X) reconstruye cuentas sin perder datos, referencias, triggers ni el contador de ids", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
    const until7 = MIGRATIONS.filter((m) => m.id < 7);
    for (const m of until7) db.exec(m.sql);
    const now = Date.now();
    db.prepare("INSERT INTO users (id, email, name, password_hash, created_at) VALUES ('u1', 'a@a.dev', 'A', 'x', ?)").run(now);
    db.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES ('w1', 'A', 'u1', ?)").run(now);
    db.prepare(
      "INSERT INTO accounts (id, workspace_id, platform, external_id, name, created_at, granted_scopes, sync_status) VALUES (5, 'w1', 'tiktok', 't', 'T', ?, 'a b', 'synced')",
    ).run(now);
    // La cuenta 8 existió y se borró: el contador no debe volver a dar ese id
    db.prepare("INSERT INTO accounts (id, workspace_id, platform, external_id, name, created_at) VALUES (8, 'w1', 'youtube', 'y', 'Y', ?)").run(now);
    db.prepare("DELETE FROM accounts WHERE id = 8").run();
    db.prepare("INSERT INTO account_tokens (account_id, access_token, updated_at) VALUES (5, 'enc', ?)").run(now);
    db.prepare(
      "INSERT INTO media (id, workspace_id, filename, original_name, mime, size, status, created_at) VALUES ('m1', 'w1', 'm1.mp4', 'v', 'video/mp4', 1, 'ready', ?)",
    ).run(now);
    const post = db
      .prepare("INSERT INTO posts (workspace_id, media_id, description, scheduled_at, status, created_at) VALUES ('w1', 'm1', 'd', ?, 'done', ?) RETURNING id")
      .get(now, now) as { id: number };
    db.prepare("INSERT INTO post_targets (post_id, account_id, status) VALUES (?, 5, 'published')").run(post.id);

    // Como el ejecutor de migraciones: claves ajenas fuera, transacción, comprobación, dentro
    const m7 = MIGRATIONS.find((m) => m.id === 7)!;
    expect(m7.foreignKeysOff).toBe(true);
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec("BEGIN");
    db.exec(m7.sql);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    db.exec("COMMIT");
    db.exec("PRAGMA foreign_keys = ON");

    expect(db.prepare("SELECT id, platform, granted_scopes, sync_status FROM accounts").all()).toEqual([
      { id: 5, platform: "tiktok", granted_scopes: "a b", sync_status: "synced" },
    ]);
    // X ya se admite y el id sigue después del 8
    const x = db
      .prepare("INSERT INTO accounts (workspace_id, platform, external_id, name, created_at) VALUES ('w1', 'x', 'up:1', 'X', ?) RETURNING id")
      .get(now) as { id: number };
    expect(x.id).toBe(9);
    expect(() =>
      db.prepare("INSERT INTO accounts (workspace_id, platform, external_id, name, created_at) VALUES ('w1', 'myspace', 'a', 'a', ?)").run(now),
    ).toThrow();
    // Las tablas que la referencian siguen enlazadas (borrado en cascada)
    db.prepare("DELETE FROM accounts WHERE id = 5").run();
    expect(db.prepare("SELECT COUNT(*) AS n FROM account_tokens").get()).toMatchObject({ n: 0 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM post_targets").get()).toMatchObject({ n: 0 });
    // Los triggers de aislamiento siguen ahí
    const triggers = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'accounts'").all() as { name: string }[]).map(
      (t) => t.name,
    );
    expect(triggers.sort()).toEqual(["accounts_brand_same_workspace", "accounts_brand_same_workspace_insert"]);
  });
});
