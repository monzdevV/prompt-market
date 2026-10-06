# SPEC · Manny (estudio de vídeo + mánager de redes en local)

Especificación para reconstruir el proyecto **sin el kit** (modo C). Si tienes `kit/`, el código manda sobre este documento.

## 1 · Producto

- **Estudio de vídeo** multiusuario: subir un vídeo, transcribirlo en local, generar con IA el texto SEO (título, descripción y 4 hashtags), convertirlo a vertical, elegir portada, programarlo y publicarlo en Instagram, Facebook, TikTok, YouTube y X. Calendario, listado de publicaciones y analítica de cuentas.
- **Manny, el mánager** de un creador de contenido (de fitness en la demo): le dice qué grabar hoy, copia la estructura de vídeos que funcionan, genera ideas, vigila cuentas de referencia y conversa con memoria.
- **Local-first**: un proceso de Node, SQLite en disco, vídeos en disco, Whisper en local y la IA de Manny a través de Claude Code instalado en el mismo ordenador. Pensado para usarse en el propio PC; el estudio también se puede desplegar en un VPS (sin Manny).
- Todo en español de España: `es-ES`, `EUR` y `Europe/Madrid` por defecto.

## 2 · Stack y estructura

Next.js 16.3 (App Router, TypeScript, Turbopack), React 19.2, Tailwind v4 (`@theme inline`), `lucide-react` (iconos de trazo), `sonner` (toasts), `zod` 4, `@anthropic-ai/sdk` (solo si hay `ANTHROPIC_API_KEY`), `vitest`. Sin ORM: `node:sqlite` (Node ≥ 23.8).

```
scripts/
├── transcribe.py          Servidor faster-whisper persistente: carga el modelo una vez y atiende JSON por stdin/stdout (CPU, int8, VAD)
├── to-vertical.py         9:16 1080×1920 con fondo desenfocado (PyAV + Pillow, sin ffmpeg aparte)
├── make-brand.py          Logo, favicon, iconos, tarjeta OG e icono 1024 px de las revisiones (Pillow + numpy, determinista)
└── fonts/                 Instrument Serif y Geist (OFL) que usa make-brand.py
src/
├── proxy.ts               Redirige a /entrar sin cookie, bloquea POST de otro origen. No es la autorización real
├── instrumentation*.ts    Al arrancar: TZ, validación del entorno (lib/env.ts) y arranque del ejecutor de trabajos
├── app/
│   ├── page.tsx, precios/  Landing pública y planes
│   ├── (auth)/             entrar, registro, recuperar, restablecer, verificar (fondo Canvas 2D: flow-canvas)
│   ├── (legal)/            aviso legal, privacidad, términos, cookies, contacto, seguridad, eliminar datos
│   ├── (app)/              panel, nuevo (+ lote), calendario, publicaciones, analitica, cuentas, ajustes, admin, manny/*
│   └── api/                auth, media, upload, posts, targets, accounts, oauth, uploadpost, billing, team, admin, stats, health, manny/*
├── components/             ui.tsx (Logo, PageHeader, botones), nav, post-card, line-chart…, manny/*
└── lib/
    ├── db/                 index.ts (conexión perezosa, WAL, migraciones al abrir), migrations.ts (1-9)
    ├── jobs.ts, worker.ts  Cola persistente con lease + fencing: process_media, convert_media, publish_target, sync
    ├── transcriber.ts      Interfaz Transcriber + LocalWhisper (un proceso Python, cola, timeouts, liberación por inactividad)
    ├── ai.ts               Texto SEO: API de Anthropic si hay clave; si no, Claude Code (manny/llm.ts)
    ├── platforms/          meta, youtube, tiktok, linkedin, uploadpost + insights
    ├── plans.ts, billing.ts  Free / Pro / Business y Stripe
    └── manny/              llm, social (yt-dlp), radar, remix, ideas, analyze, chat, context, scripts, profile, seed-data, plan-content
```

Entorno: ver `.env.example`. Imprescindibles en local: `APP_URL`, `TOKEN_ENC_KEY` (32 bytes en base64; sin ella, en producción el servidor no arranca), `PYTHON_BIN`, `WHISPER_MODEL`. `DATA_DIR` (por defecto `./data`) contiene `studio.db`, `uploads/`, `covers/` y `backups/`.

## 3 · Dependencias de sistema

| Pieza | Para qué | Notas |
|---|---|---|
| Node.js ≥ 23.8 (24 recomendado) | Next.js y `node:sqlite` (con su API de copias de seguridad) | Windows, macOS y Linux |
| Python 3.10-3.12 | Whisper, vertical, yt-dlp | `PYTHON_BIN`; en macOS/Linux, mejor en un `.venv` |
| `faster-whisper` (+ CTranslate2, PyAV) | Transcripción local | El modelo se descarga de Hugging Face la primera vez (`small` ≈ 480 MB). En Windows puede pedir el VC++ Redistributable |
| `pillow` | `to-vertical.py` | No lo trae faster-whisper |
| `yt-dlp` | Leer vídeos, perfiles y búsquedas de TikTok/YouTube | Se ejecuta como `PYTHON_BIN -m yt_dlp` (o `MANNY_YTDLP`) |
| `curl_cffi` | `--impersonate chrome` para que TikTok no bloquee | Solo se usa con TikTok |
| Deno (recomendado) | Runtime JS que yt-dlp usa para YouTube | Sin él algunas descargas de YouTube pueden fallar |
| Claude Code CLI con sesión iniciada | Manny y, sin clave de API, el texto SEO | `MANNY_CLAUDE_BIN`; en Windows tiene que ser `claude.exe` (instalador nativo) |
| ffmpeg | **No hace falta** | PyAV trae sus propias librerías |

## 4 · Dirección visual: «estudio nocturno»

**Mundo:** sala de edición de noche. Grafito y niebla, un solo acento cian usado con mesura (foco, progreso, estado activo) y el amarillo de los subtítulos de TikTok como guiño de marca.

| token (`globals.css`) | valor | uso |
|---|---|---|
| `--bg` / `--bg-2` | #0b0d0e / #0f1213 | fondo |
| `--surface` / `-2` / `-3` | #131618 / #1a1e20 / #22272a | placas, de menos a más elevadas |
| `--border` / `--border-strong` | #22282b / #353d41 | líneas de 1 px |
| `--text` / `--muted` / `--faint` | #e9edee / #8e9a9f / #5d686d | texto |
| `--accent` / `--accent-strong` / `--accent-soft` | #5ee9ff / #0e7490 / cian 9 % | acento; `strong` con texto blanco (AA) |
| `--primary` / `--primary-fg` | #eef2f3 / #0e1112 | botón principal: niebla sobre grafito |
| `--ok` / `--warn` / `--bad` (+ `-strong`, `-soft`) | #6fdc9b / #f0b85a / #ff7d72 | estados |
| `--sub` | #ffe14d | palabra resaltada del gancho de un guion |
| `--brand` / `--brand-v` | degradado cian → menta #8ef0c6 → amarillo | `brand-text`, filos finos |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | todas las transiciones |

- **Tipografía:** titulares en Instrument Serif (`.display`, normal e itálica), texto en Geist y etiquetas, cifras y «eyebrows» en Geist Mono en mayúsculas con tracking.
- **Fondo:** tres `radial-gradient` muy tenues (cian arriba a la izquierda, niebla arriba a la derecha y amarillo abajo a la derecha) fijos sobre `--bg`. El acceso lleva una animación de estelas en Canvas 2D con los colores de la marca.
- **Siempre oscuro** (`color-scheme: dark`). Sombras suaves con filo interior de 1 px. Radios pequeños.
- **Prohibido:** degradados morados, glassmorphism, emojis como iconos, el acento en grandes superficies y cifras inventadas («si una red no da un dato, lo decimos»).

## 5 · Estudio

- **Acceso:** registro con email y contraseña (≥ 10 caracteres) o con Google; el primer usuario es administrador (o solo `ADMIN_EMAIL`). `SIGNUP_MODE=invite|open`. Verificación de email y recuperación con Resend (en desarrollo, los enlaces van al log). Sesión en cookie `ss_session` (`__Host-` con HTTPS) validada en la base.
- **Espacios de trabajo** con equipo e invitaciones; todo se filtra por `workspace_id`.
- **Planes:** Free (todo menos IA), Pro (200 textos de IA al mes) y Business (1.000). El administrador cambia el plan de cualquier espacio a mano en Admin; con Stripe, el pago lo activa.
- **Nueva publicación:** subida (`MAX_UPLOAD_MB`, cuota por plan) → trabajo `process_media`: Whisper (la transcripción queda como punto de control) → IA (si el plan la incluye). Estados `queued → transcribing → generating → ready | error`. Vertical 9:16 con `convert_media`. Portada por fotograma o imagen propia. Destinos por cuenta y formato (Reel, Short, historia…), con límites por red.
- **Lote:** varios vídeos repartidos en horas fijas, con texto por vídeo.
- **Publicación:** un `publish_target` por cuenta; guarda el progreso antes del paso que publica para no duplicar nunca; si el resultado es incierto queda en **«Comprobar»** y el usuario confirma. Vías: Upload-Post (marca blanca) o conexión directa OAuth (Meta, Google con PKCE, TikTok, LinkedIn). Tokens cifrados con AES-256-GCM.
- **Analítica:** sincronización cada `SYNC_INTERVAL_HOURS`, seguidores, serie diaria y métricas por publicación. Mantenimiento diario: copia de seguridad de SQLite y borrado de vídeos publicados tras `UPLOAD_RETENTION_DAYS`.

## 6 · Manny

Submenú: **Hoy · Copiar · Ideas · Radar · Guiones · Biblioteca · Hablar con Manny · Mi perfil**.

- **Motor (`lib/manny/llm.ts`):** `claude -p --output-format json --model <MANNY_MODEL|sonnet> --tools "" --no-session-persistence --setting-sources "" --strict-mcp-config --system-prompt <SYSTEM> [--json-schema <schema>]`, con el prompt por stdin, `cwd` en la carpeta temporal y un entorno **sin** `ANTHROPIC_API_KEY` ni secretos de la app. Una llamada cada vez, timeout de 180-240 s. Errores traducidos: sin sesión, límite de uso, timeout, no instalado.
- **Lectura (`lib/manny/social.ts`):** solo URLs de TikTok y YouTube (cualquier otra se rechaza antes de llegar a yt-dlp). `--impersonate chrome` para TikTok. Una lectura cada vez con 600 ms de pausa. Enlaces cortos `vm.tiktok.com` resueltos sin salir de TikTok. Seguidores de TikTok leídos del JSON `__UNIVERSAL_DATA_FOR_REHYDRATION__` de su página. Transcripción: descarga la peor calidad (≤ 10 min, ≤ 80 MB) a una carpeta temporal, Whisper y borrado.
- **Hoy:** la semana de los guiones del plan (día/hora), lo pendiente de hoy, lo que revienta en el radar y un campo para pegar un enlace.
- **Copiar:** enlace → métricas + transcripción → tres versiones (fiel, adaptada y «giro») con gancho, voz, planos, edición, descripción y hashtags, cada una con botón de copiar; se pueden guardar como guion.
- **Ideas:** generadas con perfil + métricas + radar (con tema y lugar de grabación), guardadas desde el radar o desde una búsqueda de Shorts en YouTube. Estados `nueva → guardada → guion | descartada`.
- **Radar:** cuentas `tt`/`yt` (grupo, «Tú» o referencia). Sincroniza los últimos 30 vídeos; marca como **revienta** el vídeo con ≥ 2× la mediana de su cuenta y ≥ 5.000 visitas; calcula patrones comunes (duración, hashtags, música) y Manny los interpreta. Botón de cuentas de partida.
- **Guiones:** los 14 del plan (sembrados una vez por espacio) y los que escribe Manny. Estados `pendiente → grabado → publicado | descartado`. Lista de comprobación antes de publicar guardada en `localStorage`.
- **Biblioteca:** referencias con ×N (visitas / seguidores), filtros por estilo, dificultad e idioma; recetas de edición en CapCut (R1-R8); reglas y plan de directos.
- **Chat:** historial en `manny_messages`; cada respuesta recibe el contexto completo (`context.ts`: perfil, cuentas, últimas publicaciones con métricas, lo programado, guiones y radar) y el `PLAYBOOK`.
- **Perfil:** 12 campos (nombre, TikTok, Instagram, otras redes, nicho, público, tono, objetivo, ritmo, directos, situación y límites) en `manny_profile`; mientras no se guarda, se usa `DEFAULT_PROFILE`.

## 7 · Datos

SQLite en `DATA_DIR/studio.db` (WAL, claves ajenas activas). Migraciones en `src/lib/db/migrations.ts`, aplicadas al abrir la base y registradas en `schema_migrations`:
1 multiusuario · 2 saas_analitica · 3 auditoria_2 · 4 formatos_y_portada · 5 entrar_con_redes · 6 convertir_a_vertical · 7 red_x · 8 manny (`manny_profile`, `manny_scripts`, `manny_messages`) · 9 manny_radar (`manny_tracked`, `manny_videos`, `manny_remixes`, `manny_ideas`, `manny_kv`). 37 tablas en total. Una instalación nueva arranca vacía.

## 8 · Calidad

- 218 tests de vitest (aislamiento entre espacios, cola, publicación sin duplicados, IA, auth, seguridad, migraciones, Whisper simulado, radar). Usan una base temporal.
- WCAG AA en el tema oscuro, foco visible con `--ring` y estado nunca comunicado solo por color. Funciona a 375 px.
- Seguridad: CSP propia, cabeceras estrictas, comprobación de origen, límites de intentos, tokens cifrados y procesos hijos (Python, yt-dlp, Claude) sin secretos en su entorno.
- Honesto con los datos: si una red no da una métrica se dice; Manny no inventa cifras.

## 9 · Bugs conocidos

- [x] **1 · `npm run typecheck` fallaba en un clon limpio** (faltaban los tipos `PageProps`/`LayoutProps`/`RouteContext`): el script es `next typegen && tsc --noEmit`.
- [x] **2 · Aviso falso de IA al arrancar:** sin `ANTHROPIC_API_KEY`, `checkEnv` avisa de que se usará Claude Code (`claude -p`). Solo da error (`softErrors`, registrado como `config.degraded`, sin bloquear el arranque) si tampoco se encuentra `claude`. La comprobación solo mira el PATH, sin lanzar procesos.
- [x] **3 · Marca a medias:** el logo, las páginas legales y el texto alternativo de la imagen OG decían «easypop». Ahora la marca visible es «Manny» (`src/lib/app-name.ts`). El paquete npm, las cookies, las claves internas y los archivos de `/brand` no cambian.
- [x] **5 · `spawn("claude")` en Windows con Claude Code instalado por npm (`claude.cmd`):** `src/lib/manny/claude-bin.ts` busca primero `claude.exe`. Si solo hay `claude.cmd`, lanza el `cli.js` del paquete con node, sin shell, y deja `claude.cmd` con shell como último recurso. También acepta `MANNY_CLAUDE_BIN` o `CLAUDE_BIN`.
- [x] **6 · La semana de «Hoy» fijaba los horarios:** las horas de publicación y el día y la hora del directo salen de los campos `ritmo` y `directos` del perfil (`profileSchedule`). Lo que el perfil no diga sale de 13:30/21:30 y viernes a las 22:00. Si el perfil dice que no hay directos, no se marca ninguno.
- [x] **8 · `ensurePlanSeeded`:** usa `tx()` en lugar de `BEGIN IMMEDIATE` a pelo y repite la comprobación dentro de la transacción. Si la semilla está vacía no hace nada, así que es idempotente.
