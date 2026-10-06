# Manny · Mánager de redes con IA que funciona en tu ordenador

**Un estudio tipo Metricool más un mánager de contenido: subes un vídeo y te lo transcribe y te escribe el texto; pegas un TikTok que funciona y te da tres guiones para tu cuenta. Todo en tu PC, con tu suscripción de Claude.**

Pegas un prompt, contestas unas 15 preguntas (nombre de la app, nicho, redes, idioma) y tu IA instala las dependencias, personaliza la app y comprueba que transcribe. El resultado es idéntico a la demo, con tu marca y tu nicho.

## Qué incluye

**Manny, el mánager (`/manny`)**
- **Hoy:** qué grabar y publicar hoy, la semana de un vistazo y un atajo para pegar un enlace
- **Copiar:** pegas un TikTok o un Short. Lee sus cifras, oye lo que dice (Whisper local) y escribe **tres versiones** del guion para ti: gancho, qué dices, planos, edición, descripción y hashtags
- **Ideas:** banco de ideas generadas con tu perfil, tus métricas y el radar, o guardadas desde una búsqueda en YouTube. Se convierten en guion con un clic
- **Radar:** sigues cuentas de TikTok y canales de YouTube y marca los vídeos que **revientan para el tamaño de su cuenta** (≥2× su mediana y ≥5.000 visitas)
- **Guiones** con estado (pendiente → grabado → publicado), **Biblioteca** (74 vídeos de referencia de fitness, recetas de edición en CapCut, normas y plan de directos), **chat con memoria** y **Mi perfil**

**Estudio de publicación**
- Subida de vídeo → **transcripción local con faster-whisper** → título, descripción y 4 hashtags SEO escritos con IA
- Conversión a vertical 9:16, elección de portada, calendario, programación en lote y analítica
- Publicación en Instagram, Facebook, TikTok, YouTube y X a través de Upload-Post (opcional, de pago) o con tus propias apps de desarrollador
- Multiusuario con equipos, invitaciones, planes y Stripe (preparado, apagado por defecto)

**Técnico:** Next.js 16, React 19, Tailwind v4, SQLite integrado en Node (`node:sqlite`), cola de trabajos persistente, Python (faster-whisper, yt-dlp, PyAV) y Claude Code CLI. 208 tests.

## Qué necesitas

- Un ordenador con **Windows 10/11, macOS 12+ o Linux**, 8 GB de RAM y unos 3 GB libres (dependencias y modelo de Whisper)
- **Node.js 24** (como mínimo 23.8, por `node:sqlite`) y **Python 3.10-3.12**
- **Claude Code instalado y con la sesión iniciada** con una suscripción de Claude (Pro o Max). Manny piensa con `claude -p` y gasta del límite de tu plan, no de la API de pago
- Una IA para la instalación: lo ideal es un agente (Claude Code, Cursor, Windsurf, Codex). Un chat también sirve, pero ejecutarás tú los comandos

## Cómo se usa

1. Descomprime el paquete.
2. Abre tu IA en esa carpeta.
3. Pega el contenido de `PROMPT.md`.
4. Responde a las preguntas.

Tiempo estimado: de 30 a 60 minutos con un agente (la mitad es descargar dependencias) y de 1,5 a 3 horas en modo chat.

## Contenido del paquete

| Archivo | Para qué |
|---|---|
| `PROMPT.md` | El prompt maestro que pegas en tu IA |
| `PERSONALIZAR.md` | El mapa de cambios que sigue la IA |
| `SPEC.md` | La especificación completa, por si quieres reconstruirlo sin el kit |
| `kit/` | El código fuente, verificado: `npm ci`, `tsc`, `next build` y los 208 tests pasan; arranca con una base de datos vacía |

## Avisos (léelos antes de comprar)

- **Funciona en local.** Manny y la redacción con IA dependen de Claude Code con tu sesión iniciada en **ese** ordenador. En un servidor (VPS) el estudio funciona, pero Manny no, salvo que pongas `ANTHROPIC_API_KEY` y adaptes `src/lib/manny/llm.ts` a la API, que se paga por uso.
- **Gasta de tu suscripción de Claude.** Cada guion, idea o respuesta consume parte del límite de uso de tu plan. Con Pro puedes encontrarte el aviso «has llegado al límite» en sesiones intensas.
- **Límites de lectura de TikTok e Instagram.** Solo se lee lo público. TikTok no deja buscar por hashtag desde fuera e Instagram exige sesión, así que la búsqueda de ideas va por YouTube y el radar sigue perfiles de TikTok y canales de YouTube. Los carruseles de fotos no salen en el listado de un perfil. TikTok bloquea a ratos aunque se use `curl_cffi`: hay que esperar y reintentar. Manny lee texto y cifras; no ve las imágenes del vídeo.
- **Términos de uso de las plataformas.** El radar y «Copiar» leen páginas públicas con yt-dlp, sin API oficial. Eso puede ir contra los términos de servicio de TikTok y YouTube, y la responsabilidad del uso es tuya. Úsalo con moderación (la app ya hace las lecturas de una en una y con pausas), para analizar y no para republicar contenido ajeno, y respeta los derechos de autor.
- **Publicar en redes** no viene listo de serie: necesitas una clave de Upload-Post (de pago) o tus propias apps aprobadas por Meta, Google y TikTok, con HTTPS público y sus revisiones.
- **Contenido de partida de fitness.** Los guiones de ejemplo, las 74 referencias, las cuentas del radar y las reglas son de fitness y gimnasio. Si tu nicho es otro, la IA vacía o reescribe ese contenido, pero **no puede inventar referencias con cifras**: la Biblioteca empezará vacía hasta que añadas las tuyas.
- La interfaz está en español de España. Traducirla es posible, pero no forma parte de la instalación estándar.
- El cambio de nombre de la demo está a medias (parte de la interfaz dice «Manny» y parte «easypop»). La personalización lo deja todo con tu nombre.
