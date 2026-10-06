# Manny

> El nombre técnico sigue siendo `easypop` (paquete npm y servicio del servidor: `/opt/easypop`, usuario y unidad `easypop`) para no romper despliegues ni datos ya instalados; lo que ve el usuario es Manny. Las imágenes de marca (logo, favicon, iconos y tarjeta OpenGraph) se regeneran con `python scripts/make-brand.py`.

Subes un vídeo y la app:

1. Lo **transcribe** en tu propio servidor con Whisper (gratis; el vídeo no se envía a ningún servicio externo).
2. Con Claude escribe un **título y una descripción SEO** y **4 hashtags del nicho** a partir de lo que se dice en el vídeo.
3. Lo **publica o programa** en Instagram (Reels), Facebook, TikTok y YouTube (Shorts).
4. Recoge **métricas** y muestra calendario y analítica.

Es multiusuario: cada persona se registra, conecta **sus propias** cuentas y solo ve sus datos. De momento el acceso es con invitación.

> Fase actual: **versión local** (un servidor, SQLite, vídeos en disco). El salto a Supabase/Vercel queda acotado a `src/lib/db/` y los repositorios de `src/lib/*.ts` (ver «Arquitectura»).

## Arrancar

Necesitas Node 23.8+ (recomendado 24) y Python 3.10+.

```bash
npm install
pip install faster-whisper
cp .env.example .env.local
# Genera la clave de cifrado de tokens y ponla en TOKEN_ENC_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npm run build && npm start      # o `npm run dev` para desarrollo
```

Abre http://localhost:3000 y crea tu cuenta. **El primer usuario que se registra es el administrador** y no necesita invitación (si defines `ADMIN_EMAIL`, solo ese email puede serlo). Al resto invítalos desde **Admin → Invitaciones** (enlace de un solo uso, válido 14 días).

El ejecutor de trabajos (transcripción, IA y publicación) vive dentro del proceso de la app. Si el ordenador está apagado a la hora programada, la publicación sale en cuanto vuelvas a arrancarla.

## Manny, el mánager

Dentro de la app, **Manny** (menú lateral) es tu mánager de redes. Funciona en tu ordenador, con Claude Code con la sesión iniciada (usa tu suscripción, no la API de pago).

| Sección | Qué hace |
|---|---|
| **Hoy** | Lo que toca grabar y publicar hoy, la semana de un vistazo y atajo para pegar un TikTok. |
| **Copiar** | Pegas el enlace de un TikTok o un Short: lee sus cifras, oye lo que dice (Whisper local) y escribe **tres versiones** del guion para ti (gancho, qué dices, planos, edición, descripción y hashtags) con botón de copiar. |
| **Ideas** | Banco de ideas: las genera Manny (con tu perfil, tus métricas y el radar), las guardas desde el radar o desde una búsqueda en YouTube, y las conviertes en guion. |
| **Radar** | Sigues cuentas de TikTok y canales de YouTube. Lee sus últimos vídeos con visitas, guardados y compartidos y marca los que **revientan para el tamaño de su cuenta** (≥2× su mediana y ≥5.000 visitas). Calcula qué tienen en común y Manny lo interpreta. |
| **Guiones** | El plan de la semana 1 y los que escribe Manny, con su estado (pendiente → grabado → publicado). |
| **Biblioteca** | 74 vídeos de referencia verificados, recetas de edición en CapCut, reglas de TikTok para fitness y plan de directos. |
| **Hablar con Manny** y **Mi perfil** | Conversación con memoria; el perfil lo lee en cada respuesta. |

Requisitos extra: `pip install yt-dlp curl_cffi` (TikTok bloquea a yt-dlp si no se hace pasar por un navegador). Variables opcionales en `.env.example` (`MANNY_MODEL`, `MANNY_CLAUDE_BIN`, `MANNY_YTDLP`).

Límites reales: solo se lee lo público; **TikTok no deja buscar por hashtag desde fuera** y Instagram exige sesión, así que la búsqueda de ideas usa YouTube y el seguimiento de cuentas usa perfiles de TikTok y canales de YouTube. Los carruseles de fotos no salen en el listado de un perfil. Manny lee texto y cifras, no ve las imágenes del vídeo.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `APP_URL` | URL pública. Con `https://` las cookies se marcan como `Secure`. |
| `TOKEN_ENC_KEY` | **Obligatoria** para conectar redes. 32 bytes en base64. Si la pierdes o la cambias, todos tendrán que reconectar sus redes. |
| `ADMIN_EMAIL` | Solo ese email puede crear la primera cuenta (la de administrador). Ponlo si la app es accesible desde internet antes de registrarte. |
| `SIGNUP_MODE` | `invite` (por defecto) u `open`. |
| `MAX_UPLOAD_MB` / `STORAGE_QUOTA_MB` | Tamaño máximo por vídeo (500). El espacio por cuenta lo marca su plan; `STORAGE_QUOTA_MB` es un tope global opcional. |
| `APP_TIMEZONE` | Zona horaria de fechas y calendario (`Europe/Madrid`). |
| `TRUST_PROXY` | De qué proxy fiarse para la IP real: `cloudflare` (por defecto), `forwarded` o `none`. |
| `ANTHROPIC_API_KEY` / `AI_MODEL` | IA. Modelo por defecto: `claude-sonnet-5`. |
| `TRANSCRIBER`, `PYTHON_BIN`, `WHISPER_MODEL`, `WHISPER_TIMEOUT_S` | Transcripción local. `small` es un buen equilibrio entre velocidad y precisión. |
| `LEGAL_NAME`, `CONTACT_EMAIL` | Aparecen en Privacidad / Términos / Eliminar mis datos. **Defínelas antes de `npm run build`**: esas páginas se generan al compilar. |
| `META_*`, `GOOGLE_*`, `TIKTOK_*` | Credenciales de la app de desarrollador de cada red. |
| `FEATURE_LINKEDIN` | `true` activa LinkedIn (desactivado por defecto). |
| `DATA_DIR` | Dónde van la base de datos (`studio.db`) y los vídeos. Por defecto `./data`. |

La base de datos antigua de un solo usuario (`data/app.db`) se deja intacta como copia; la app nueva usa `data/studio.db`.

## HTTPS público (lo exigen TikTok y las revisiones de Meta/Google)

- **Túnel de Cloudflare** con dominio fijo: `cloudflared tunnel create manny` → apunta tu subdominio → `cloudflared tunnel run`. Pon esa URL en `APP_URL` y regístrala en cada red. Arranca la app escuchando solo en local (`npm start -- -H 127.0.0.1`) para que todo el tráfico entre por el túnel. (Los túneles rápidos con URL aleatoria no sirven para las revisiones: la URL cambia en cada arranque.)
- **Servidor propio** (un VPS de unos 5 €/mes): `npm run build && npm start` detrás de Caddy o Nginx con HTTPS y `TRUST_PROXY=forwarded`.

URL de redirección que hay que registrar en cada red: `APP_URL/api/oauth/<meta|youtube|tiktok>/callback`.

Cómo conseguir que cada red apruebe la app para uso público: **[docs/revision-plataformas.md](docs/revision-plataformas.md)**.

## Tests y comprobaciones

```bash
npm test            # vitest: aislamiento entre clientes, cola, publicación, IA, auth, seguridad…
npm run typecheck
npm run lint
npm run build
```

## Arquitectura (en breve)

- **Next.js 16** (App Router). `src/proxy.ts` solo hace comprobaciones rápidas: redirige si no hay cookie y bloquea peticiones de otros orígenes. **La autorización real** se hace en cada página y ruta con la sesión de la base de datos, filtrando todo por `workspace_id`.
- **SQLite** (`node:sqlite`) con migraciones en `src/lib/db/migrations.ts`. El acceso a datos solo ocurre en `src/lib/*.ts` (nunca en las páginas).
- **Cola de trabajos persistente** (`src/lib/jobs.ts`), ejecutada dentro del proceso por `src/lib/worker.ts`:
  - `process_media`: Whisper y después IA. La transcripción se guarda como punto de control, así que un reintento no vuelve a transcribir.
  - `publish_target`: uno por cuenta y publicación. Se reanuda tras un reinicio y nunca publica dos veces: el progreso con cada red (sesión de subida, contenedor, `publish_id`) se guarda *antes* del paso que publica. Si el resultado es incierto, la publicación queda como **«Comprobar»** y el usuario lo confirma.
- **Tokens** cifrados con AES-256-GCM en su propia tabla. El estado OAuth se guarda en el servidor ligado al usuario; Google usa PKCE.
- **Transcripción** detrás de la interfaz `Transcriber` (`src/lib/transcriber.ts`). Pasar a una API en la nube es implementar esa interfaz y elegirla con `TRANSCRIBER`.

Límites conocidos de esta fase: un solo proceso (el límite de intentos en memoria y el ejecutor lo suponen) y vídeos en disco local. Escalar implica pasar a Postgres + almacenamiento de objetos y sacar el ejecutor a su propio proceso; la cola ya está pensada para eso (lease + fencing).

## Operación

Guía completa (servicio de Windows, copias de seguridad, restaurar, monitorización): **[docs/operacion.md](docs/operacion.md)**.

- `GET /api/health` → 200 si la base de datos responde y el ejecutor está vivo (para UptimeRobot o similar).
- Los logs son líneas JSON en stdout/stderr (`msg`, `jobId`, `targetId`…); tokens y contraseñas se ocultan.
- **Publicaciones «Comprobar»**: puede que la red publicara el vídeo o no (por ejemplo, se cortó la conexión justo al publicar). El usuario lo mira en la red y pulsa «Sí se publicó» (puede pegar el enlace) o «No se publicó», que le permite reintentar sin duplicar. La página Admin cuenta cuántas hay pendientes.
