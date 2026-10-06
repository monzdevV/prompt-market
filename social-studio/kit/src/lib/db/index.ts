import { DatabaseSync, type SQLInputValue, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
// Base nueva: la antigua (app.db, un solo usuario) se deja intacta como copia
const DB_FILE = path.join(DATA_DIR, "studio.db");

const g = globalThis as unknown as { __db?: DatabaseSync };

function migrate(db: DatabaseSync) {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)");
  const applied = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    // Reconstruir una tabla (sqlite.org/lang_altertable.html, «otros cambios de esquema»): las claves ajenas
    // se desactivan fuera de la transacción (dentro no tiene efecto) y se comprueban antes de confirmar
    if (m.foreignKeysOff) db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN IMMEDIATE");
      // Otro proceso (dev y build a la vez) pudo aplicarla mientras esperábamos el bloqueo
      if (db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(m.id)) {
        db.exec("COMMIT");
        continue;
      }
      try {
        db.exec(m.sql);
        if (m.foreignKeysOff) {
          const broken = db.prepare("PRAGMA foreign_key_check").all();
          if (broken.length) throw new Error(`La migración ${m.id} dejaría ${broken.length} referencias rotas`);
        }
        db.prepare("INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)").run(m.id, m.name, Date.now());
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    } finally {
      if (m.foreignKeysOff) db.exec("PRAGMA foreign_keys = ON");
    }
  }
}

function open() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  // timeout: varios procesos (build, dev) pueden abrir la base a la vez
  const db = new DatabaseSync(DB_FILE, { timeout: 5000 });
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;");
  migrate(db);
  return db;
}

/**
 * node:sqlite devuelve las filas como objetos sin prototipo (Object.create(null)). React no deja pasar
 * esos objetos de un componente de servidor a uno de cliente, y la página falla. Se convierten aquí,
 * en un único sitio, a objetos normales: ninguna consulta de la app puede volver a provocar ese fallo.
 */
const plain = (row: unknown) => (row && typeof row === "object" ? { ...(row as object) } : row);

function wrapStatement(stmt: StatementSync): StatementSync {
  return new Proxy(stmt, {
    get(target, key) {
      if (key === "get") return (...args: SQLInputValue[]) => plain(target.get(...args));
      if (key === "all") return (...args: SQLInputValue[]) => target.all(...args).map(plain);
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as StatementSync;
}

// Se abre al primer uso, no al importar: `next build` importa los módulos en varios procesos a la vez
export const db = new Proxy({} as DatabaseSync, {
  get(_, key) {
    const real = (g.__db ??= open());
    if (key === "prepare") return (sql: string) => wrapStatement(real.prepare(sql));
    const value = Reflect.get(real, key);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** La conexión real (no el Proxy): la necesita la API de copias de seguridad de SQLite. */
export function rawDb() {
  return (g.__db ??= open());
}

/**
 * Ejecuta fn en una transacción. node:sqlite es síncrono y hay un único proceso,
 * así que dentro de fn nadie más escribe: sirve también como "lock".
 * fn no puede ser async (un await rompería la atomicidad).
 */
export function tx<T>(fn: () => T): T {
  if (db.isTransaction) return fn();
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Solo para tests: cierra la conexión para poder abrir otra base. */
export function closeDbForTests() {
  g.__db?.close();
  g.__db = undefined;
}

export type Platform = "youtube" | "facebook" | "instagram" | "tiktok" | "linkedin" | "x";

export type User = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_admin: number;
  created_at: number;
};

export type Account = {
  id: number;
  workspace_id: string;
  platform: Platform;
  external_id: string;
  name: string;
  avatar: string | null;
  status: "active" | "needs_reauth" | "disconnected";
  meta: string;
  created_at: number;
  brand_id: string | null;
  sync_status: SyncStatus;
  last_synced_at: number | null;
  last_sync_error: string | null;
  rate_limited_until: number | null;
  granted_scopes: string | null;
};

export type SyncStatus = "connected" | "syncing" | "synced" | "rate_limited" | "error";

/** Cuenta con los tokens ya descifrados. Nunca se envía al navegador. */
export type AccountWithTokens = Account & {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
};

export type MediaStatus = "queued" | "transcribing" | "generating" | "ready" | "error";

export type Media = {
  id: string;
  workspace_id: string;
  filename: string;
  original_name: string;
  mime: string;
  size: number;
  duration_s: number | null;
  language: string | null;
  status: MediaStatus;
  transcript: string | null;
  ai: string | null;
  error: string | null;
  created_at: number;
  /** Si es una versión vertical generada: el vídeo original */
  source_media_id: string | null;
  width: number | null;
  height: number | null;
};

export type PostStatus = "scheduled" | "publishing" | "done" | "partial" | "failed";

export type Post = {
  id: number;
  workspace_id: string;
  media_id: string;
  title: string;
  description: string;
  hashtags: string;
  scheduled_at: number;
  status: PostStatus;
  created_by: string | null;
  created_at: number;
  brand_id: string | null;
  deleted_at: number | null;
  /** Imagen de portada propia: "<espacio>/<uuid>.jpg" dentro de data/covers */
  cover_file: string | null;
  /** Fotograma elegido como portada (ms desde el inicio) */
  cover_offset_ms: number | null;
};

export type TargetStatus = "pending" | "publishing" | "published" | "failed" | "needs_review";

export type Target = {
  id: number;
  post_id: number;
  account_id: number;
  options: string;
  status: TargetStatus;
  remote_ref: string | null;
  remote_id: string | null;
  remote_url: string | null;
  error: string | null;
  published_at: number | null;
  stats: string | null;
  stats_updated_at: number | null;
};

export type Stats = { views?: number; likes?: number; comments?: number; shares?: number };
