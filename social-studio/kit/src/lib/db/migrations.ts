/**
 * Migraciones de esquema, en orden. Nunca edites una migración ya publicada: añade una nueva.
 * Fechas en milisegundos (INTEGER). JSON en columnas TEXT.
 */
export const MIGRATIONS: { id: number; name: string; sql: string; foreignKeysOff?: boolean }[] = [
  {
    id: 1,
    name: "multiusuario",
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free',
        timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE workspace_members (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
        PRIMARY KEY (workspace_id, user_id)
      );
      CREATE INDEX workspace_members_user ON workspace_members(user_id);

      -- Solo se guarda el hash del token: si alguien lee la base, no puede suplantar sesiones
      CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX sessions_user ON sessions(user_id);

      CREATE TABLE invites (
        code_hash TEXT PRIMARY KEY,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        note TEXT NOT NULL DEFAULT '',
        used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        used_at INTEGER,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE settings (
        workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
        sector TEXT NOT NULL DEFAULT '',
        audience TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT 'cercano y profesional',
        extra_keywords TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('youtube', 'facebook', 'instagram', 'tiktok', 'linkedin')),
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reauth', 'disconnected')),
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        UNIQUE (workspace_id, platform, external_id)
      );

      -- Tokens separados de la cuenta y cifrados (AES-256-GCM). Solo el servidor los descifra.
      CREATE TABLE account_tokens (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at INTEGER,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE oauth_states (
        state_hash TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        connector TEXT NOT NULL,
        code_verifier TEXT,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE media (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime TEXT NOT NULL,
        size INTEGER NOT NULL,
        duration_s REAL,
        language TEXT,
        status TEXT NOT NULL CHECK (status IN ('queued', 'transcribing', 'generating', 'ready', 'error')),
        transcript TEXT,
        ai TEXT,
        error TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX media_workspace ON media(workspace_id, created_at);

      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        hashtags TEXT NOT NULL DEFAULT '[]',
        scheduled_at INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('scheduled', 'publishing', 'done', 'partial', 'failed')),
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX posts_workspace ON posts(workspace_id, scheduled_at);

      -- remote_ref guarda el progreso en la red (sesión de subida, contenedor, publish_id…)
      -- ANTES del paso que publica: así un reintento continúa o verifica en vez de duplicar.
      CREATE TABLE post_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        options TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'needs_review')),
        remote_ref TEXT,
        remote_id TEXT,
        remote_url TEXT,
        error TEXT,
        published_at INTEGER,
        stats TEXT,
        stats_updated_at INTEGER,
        UNIQUE (post_id, account_id)
      );
      CREATE INDEX post_targets_account ON post_targets(account_id);
      CREATE INDEX post_targets_published ON post_targets(status, published_at);

      CREATE TABLE jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('process_media', 'publish_target')),
        ref_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
        run_after INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        locked_by TEXT,
        locked_until INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX jobs_due ON jobs(kind, status, run_after);
      -- Nunca dos trabajos vivos para el mismo vídeo o destino
      CREATE UNIQUE INDEX jobs_live ON jobs(kind, ref_id) WHERE status IN ('queued', 'running');

      CREATE TABLE usage (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        metric TEXT NOT NULL,
        value INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (workspace_id, period, metric)
      );

      CREATE TABLE worker_heartbeat (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        worker_id TEXT NOT NULL,
        seen_at INTEGER NOT NULL
      );
    `,
  },
  {
    id: 2,
    name: "saas_analitica",
    // Solo aditiva: no borra ni reescribe datos existentes (salvo reconstruir `jobs` sin el CHECK de tipos).
    sql: `
      -- ── Marcas: Usuario → Espacio → Marca → Cuentas ─────────────────────────
      CREATE TABLE brands (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        archived_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX brands_workspace ON brands(workspace_id);
      CREATE UNIQUE INDEX brands_one_default ON brands(workspace_id) WHERE is_default = 1;
      INSERT INTO brands (id, workspace_id, name, is_default, created_at)
        SELECT lower(hex(randomblob(16))), id, name, 1, created_at FROM workspaces;

      ALTER TABLE accounts ADD COLUMN brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL;
      ALTER TABLE posts ADD COLUMN brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL;
      UPDATE accounts SET brand_id = (SELECT id FROM brands b WHERE b.workspace_id = accounts.workspace_id AND b.is_default = 1);
      UPDATE posts SET brand_id = (SELECT id FROM brands b WHERE b.workspace_id = posts.workspace_id AND b.is_default = 1);

      -- ── Estado de sincronización de cada cuenta ──────────────────────────────
      ALTER TABLE accounts ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'connected'
        CHECK (sync_status IN ('connected', 'syncing', 'synced', 'rate_limited', 'error'));
      ALTER TABLE accounts ADD COLUMN last_synced_at INTEGER;
      ALTER TABLE accounts ADD COLUMN last_sync_error TEXT;
      ALTER TABLE accounts ADD COLUMN rate_limited_until INTEGER;
      -- Permisos que el usuario concedió de verdad (puede aceptar solo algunos)
      ALTER TABLE accounts ADD COLUMN granted_scopes TEXT;

      -- Borrado lógico: borrar una publicación de la app no destruye su historial
      ALTER TABLE posts ADD COLUMN deleted_at INTEGER;

      -- ── Publicaciones de cada cuenta (también las hechas fuera de la app) ────
      CREATE TABLE social_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        remote_id TEXT NOT NULL,
        target_id INTEGER REFERENCES post_targets(id) ON DELETE SET NULL,
        media_type TEXT,
        caption TEXT,
        permalink TEXT,
        thumbnail_url TEXT,
        published_at INTEGER,
        fetched_at INTEGER NOT NULL,
        UNIQUE (account_id, remote_id)
      );
      CREATE INDEX social_posts_ws ON social_posts(workspace_id, published_at);

      -- Métricas por publicación y día (histórico). NULL = la red no da ese dato; 0 = cero real.
      CREATE TABLE post_metrics (
        social_post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        views INTEGER,
        reach INTEGER,
        likes INTEGER,
        comments INTEGER,
        shares INTEGER,
        saves INTEGER,
        watch_time_s INTEGER,
        captured_at INTEGER NOT NULL,
        PRIMARY KEY (social_post_id, day)
      );
      CREATE INDEX post_metrics_ws ON post_metrics(workspace_id, day);

      -- Foto diaria de cada cuenta (seguidores, etc.). Un registro por cuenta y día.
      CREATE TABLE account_snapshots (
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        followers INTEGER,
        following INTEGER,
        media_count INTEGER,
        views INTEGER,
        reach INTEGER,
        likes INTEGER,
        comments INTEGER,
        shares INTEGER,
        watch_time_s INTEGER,
        captured_at INTEGER NOT NULL,
        PRIMARY KEY (account_id, day)
      );
      CREATE INDEX account_snapshots_ws ON account_snapshots(workspace_id, day);

      CREATE TABLE sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
        trigger TEXT NOT NULL CHECK (trigger IN ('schedule', 'manual', 'connect')),
        status TEXT NOT NULL CHECK (status IN ('running', 'ok', 'partial', 'failed')),
        items_ok INTEGER NOT NULL DEFAULT 0,
        items_failed INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        started_at INTEGER NOT NULL,
        finished_at INTEGER
      );
      CREATE INDEX sync_runs_account ON sync_runs(account_id, started_at);

      -- ── Cola: nuevos tipos de trabajo (SQLite no permite cambiar un CHECK: se reconstruye) ──
      CREATE TABLE jobs_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
        run_after INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        locked_by TEXT,
        locked_until INTEGER,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO jobs_v2 SELECT * FROM jobs;
      DROP TABLE jobs;
      ALTER TABLE jobs_v2 RENAME TO jobs;
      CREATE INDEX jobs_due ON jobs(kind, status, run_after);
      CREATE UNIQUE INDEX jobs_live ON jobs(kind, ref_id) WHERE status IN ('queued', 'running');
      CREATE INDEX jobs_workspace ON jobs(workspace_id);

      -- ── Cuentas de usuario: email verificado, términos aceptados, recuperación ─
      ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
      ALTER TABLE users ADD COLUMN terms_accepted_at INTEGER;
      ALTER TABLE users ADD COLUMN terms_version TEXT;
      CREATE TABLE email_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX email_tokens_user ON email_tokens(user_id, purpose);

      -- ── Equipos: invitar a alguien a TU espacio de trabajo ───────────────────
      CREATE TABLE workspace_invites (
        code_hash TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL COLLATE NOCASE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member')),
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX workspace_invites_ws ON workspace_invites(workspace_id);

      -- ── Planes y cobro (preparado; Stripe se activa cuando haya claves) ─────
      ALTER TABLE workspaces ADD COLUMN plan_source TEXT NOT NULL DEFAULT 'manual' CHECK (plan_source IN ('manual', 'stripe'));
      ALTER TABLE workspaces ADD COLUMN trial_used_at INTEGER;
      CREATE TABLE subscriptions (
        workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN ('stripe')),
        customer_id TEXT NOT NULL UNIQUE,
        subscription_id TEXT UNIQUE,
        price_id TEXT,
        plan TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_end INTEGER,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        trial_end INTEGER,
        updated_at INTEGER NOT NULL
      );
      -- Idempotencia de webhooks: cada evento se procesa una sola vez
      CREATE TABLE billing_events (
        event_id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        received_at INTEGER NOT NULL
      );

      -- ── Registro de auditoría (solo se añade, nunca se modifica) ─────────────
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
        actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX audit_logs_ws ON audit_logs(workspace_id, created_at);

      -- ── La base de datos impide mezclar espacios de trabajo ──────────────────
      CREATE TRIGGER post_targets_same_workspace BEFORE INSERT ON post_targets
      WHEN (SELECT workspace_id FROM posts WHERE id = NEW.post_id) IS NOT (SELECT workspace_id FROM accounts WHERE id = NEW.account_id)
      BEGIN SELECT RAISE(ABORT, 'La cuenta y la publicación son de espacios de trabajo distintos'); END;

      CREATE TRIGGER posts_media_same_workspace BEFORE INSERT ON posts
      WHEN (SELECT workspace_id FROM media WHERE id = NEW.media_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'El vídeo es de otro espacio de trabajo'); END;

      CREATE TRIGGER accounts_brand_same_workspace BEFORE UPDATE OF brand_id ON accounts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;

      -- Índices que faltaban para borrados en cascada y limpiezas
      CREATE INDEX posts_media ON posts(media_id);
      CREATE INDEX sessions_expires ON sessions(expires_at);
      CREATE INDEX oauth_states_expires ON oauth_states(expires_at);
    `,
  },
  {
    id: 3,
    name: "auditoria_2",
    // Solo índices y triggers: no toca datos.
    sql: `
      -- Reparto justo al reclamar trabajos: MAX(updated_at) por espacio y tipo sin recorrer el histórico
      CREATE INDEX jobs_fair ON jobs(workspace_id, kind, status, updated_at);

      -- Aislamiento entre espacios también en los caminos que faltaban
      CREATE TRIGGER accounts_brand_same_workspace_insert BEFORE INSERT ON accounts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;

      CREATE TRIGGER posts_brand_same_workspace BEFORE INSERT ON posts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;

      CREATE TRIGGER posts_brand_same_workspace_update BEFORE UPDATE OF brand_id ON posts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;

      CREATE TRIGGER post_targets_same_workspace_update BEFORE UPDATE OF account_id ON post_targets
      WHEN (SELECT workspace_id FROM accounts WHERE id = NEW.account_id) IS NOT (SELECT workspace_id FROM posts WHERE id = NEW.post_id)
      BEGIN SELECT RAISE(ABORT, 'La cuenta es de otro espacio de trabajo'); END;
    `,
  },
  {
    id: 4,
    name: "formatos_y_portada",
    // Portada elegida para la publicación: imagen propia (fichero en data/covers/<espacio>/) y/o
    // fotograma del vídeo en milisegundos. El formato (Short, Reel, Historia…) va en post_targets.options.
    sql: `
      ALTER TABLE posts ADD COLUMN cover_file TEXT;
      ALTER TABLE posts ADD COLUMN cover_offset_ms INTEGER CHECK (cover_offset_ms IS NULL OR cover_offset_ms >= 0);
    `,
  },
  {
    id: 5,
    name: "entrar_con_redes",
    // «Entrar con Google/TikTok»: cada persona puede tener varias identidades externas enlazadas.
    // login_states: el `state` de OAuth de un inicio de sesión (aún no hay usuario ni espacio).
    sql: `
      CREATE TABLE user_identities (
        provider TEXT NOT NULL CHECK (provider IN ('google', 'tiktok')),
        subject TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (provider, subject)
      );
      CREATE INDEX user_identities_user ON user_identities(user_id);

      CREATE TABLE login_states (
        state_hash TEXT PRIMARY KEY,
        connector TEXT NOT NULL,
        code_verifier TEXT,
        next TEXT,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX login_states_expires ON login_states(expires_at);
    `,
  },
  {
    id: 6,
    name: "convertir_a_vertical",
    // Versión vertical (9:16) generada a partir de otro vídeo del mismo espacio
    sql: `
      ALTER TABLE media ADD COLUMN source_media_id TEXT REFERENCES media(id) ON DELETE SET NULL;
      ALTER TABLE media ADD COLUMN width INTEGER;
      ALTER TABLE media ADD COLUMN height INTEGER;
      CREATE INDEX media_source ON media(source_media_id);
    `,
  },
  {
    id: 7,
    name: "red_x",
    // Añade X (Twitter) a las redes admitidas. SQLite no deja cambiar un CHECK: se reconstruye `accounts`
    // conservando ids, datos, contador AUTOINCREMENT y triggers. Las tablas que la referencian (tokens,
    // destinos, métricas…) siguen apuntando a «accounts» por nombre, así que no se tocan.
    foreignKeysOff: true,
    sql: `
      CREATE TABLE accounts_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('youtube', 'facebook', 'instagram', 'tiktok', 'linkedin', 'x')),
        external_id TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reauth', 'disconnected')),
        meta TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
        sync_status TEXT NOT NULL DEFAULT 'connected'
          CHECK (sync_status IN ('connected', 'syncing', 'synced', 'rate_limited', 'error')),
        last_synced_at INTEGER,
        last_sync_error TEXT,
        rate_limited_until INTEGER,
        granted_scopes TEXT,
        UNIQUE (workspace_id, platform, external_id)
      );
      INSERT INTO accounts_new (id, workspace_id, platform, external_id, name, avatar, status, meta, created_at, brand_id,
                                sync_status, last_synced_at, last_sync_error, rate_limited_until, granted_scopes)
        SELECT id, workspace_id, platform, external_id, name, avatar, status, meta, created_at, brand_id,
               sync_status, last_synced_at, last_sync_error, rate_limited_until, granted_scopes FROM accounts;
      -- El contador de ids no baja aunque las últimas cuentas se hubieran borrado
      CREATE TEMP TABLE _accounts_seq AS SELECT seq FROM sqlite_sequence WHERE name = 'accounts';
      DROP TABLE accounts;
      -- legacy: el cambio de nombre no reescribe los triggers de otras tablas que ya mencionan «accounts»
      PRAGMA legacy_alter_table = ON;
      ALTER TABLE accounts_new RENAME TO accounts;
      PRAGMA legacy_alter_table = OFF;
      UPDATE sqlite_sequence SET seq = MAX(seq, COALESCE((SELECT seq FROM _accounts_seq), 0)) WHERE name = 'accounts';
      DROP TABLE _accounts_seq;

      CREATE TRIGGER accounts_brand_same_workspace BEFORE UPDATE OF brand_id ON accounts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;
      CREATE TRIGGER accounts_brand_same_workspace_insert BEFORE INSERT ON accounts
      WHEN NEW.brand_id IS NOT NULL AND (SELECT workspace_id FROM brands WHERE id = NEW.brand_id) IS NOT NEW.workspace_id
      BEGIN SELECT RAISE(ABORT, 'La marca es de otro espacio de trabajo'); END;
    `,
  },
  {
    id: 8,
    name: "manny",
    // Manny, el mánager: perfil del creador, guiones con su estado y la conversación con él
    sql: `
      CREATE TABLE manny_profile (
        workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE manny_scripts (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        source TEXT NOT NULL CHECK (source IN ('plan', 'manny')),
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'grabado', 'publicado', 'descartado')),
        position INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE manny_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'manny')),
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX manny_messages_ws ON manny_messages(workspace_id, id);
    `,
  },
  {
    id: 9,
    name: "manny_radar",
    // Radar de cuentas que se siguen, sus vídeos con métricas, análisis de vídeos pegados y banco de ideas
    sql: `
      CREATE TABLE manny_tracked (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('tt', 'yt')),
        handle TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'ref' CHECK (kind IN ('ref', 'own')),
        nickname TEXT NOT NULL DEFAULT '',
        followers INTEGER,
        bio TEXT NOT NULL DEFAULT '',
        grupo TEXT NOT NULL DEFAULT '',
        added_at INTEGER NOT NULL,
        synced_at INTEGER,
        sync_error TEXT,
        PRIMARY KEY (workspace_id, id),
        UNIQUE (workspace_id, platform, handle)
      );

      CREATE TABLE manny_videos (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK (platform IN ('tt', 'yt')),
        id TEXT NOT NULL,
        handle TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        views INTEGER,
        likes INTEGER,
        comments INTEGER,
        shares INTEGER,
        saves INTEGER,
        duration INTEGER,
        posted_at INTEGER,
        thumb TEXT,
        music TEXT,
        hashtags TEXT NOT NULL DEFAULT '[]',
        transcript TEXT,
        source TEXT NOT NULL CHECK (source IN ('tracked', 'pasted')),
        fetched_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, platform, id)
      );
      CREATE INDEX manny_videos_handle ON manny_videos(workspace_id, platform, handle);

      CREATE TABLE manny_remixes (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        source_url TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE manny_ideas (
        id TEXT NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'nueva' CHECK (status IN ('nueva', 'guardada', 'guion', 'descartada')),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, id)
      );

      CREATE TABLE manny_kv (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, key)
      );
    `,
  },
];
