# SPEC · TubeGen (fábrica de episodios para YouTube con Remotion)

Especificación para reconstruir el proyecto **sin el kit** (modo C). Si tienes `kit/`, el código manda sobre este documento.

## 1 · Producto

Un sistema de línea de comandos que fabrica episodios para un canal de YouTube «faceless» de divulgación. Cada episodio sale como:

- **Vídeo largo** 16:9 (1920×1080, 30 fps, 8-14 min) con capítulos, subtítulos SRT y 20 s de pantalla final.
- **Short** 9:16 (1080×1920, 30 fps, 30-60 s) independiente, con subtítulos quemados palabra a palabra.
- **Miniatura** 1280×720 PNG.
- **`REVISAR.md`** con títulos alternativos, descripciones, tags, fuentes y una checklist para la revisión humana.

Opcionalmente los sube a YouTube (en privado o programados), lee YouTube Analytics para priorizar los formatos que mejor funcionan y detecta vídeos «outlier» del nicho para elegir temas. Todo se configura en un perfil de canal JSON. El canal de demo es «Curiosidad Máxima» (curiosidades con datos, en español).

No hay interfaz web: es Node + Remotion + un script de Python, pensado para un PC con Windows, macOS o Linux.

## 2 · Stack y requisitos

- **Node.js ≥ 22** (probado con 24.14), ESM (`"type": "module"`).
- **Remotion 4.0.529** (`remotion`, `@remotion/bundler`, `@remotion/renderer`, `@remotion/cli`, `@remotion/media`, `@remotion/media-utils`, `@remotion/google-fonts`, `@remotion/transitions`, `@remotion/zod-types`, todos en la misma versión). React 19.2, TypeScript 5.9, zod 4.
- `@anthropic-ai/sdk` 0.129, `googleapis` 182, `dotenv` 18.
- **Python ≥ 3.10** con `edge-tts` 7.x (`pip install edge-tts`), invocado como `$PYTHON`, o `python3` (macOS/Linux) / `python` (Windows).
- **ffmpeg/ffprobe** en el PATH (el pipeline usa `ffprobe` para medir cada audio).
- Opcional: **Claude Code** (`claude` en el PATH) si no se usa clave de API.
- La primera ejecución de Remotion descarga Chrome Headless Shell (~113 MB).

```
channels/<id>.json    perfil del canal (nicho, público, pilares, voz, colores, cadencia, YouTube)
pipeline/             pasos en Node (.mjs) + tts_edge.py
  lib/config.mjs      rutas, .env, loadChannel, args, slugify, log
  lib/llm.mjs         askJson(): Claude API o `claude -p`
  lib/prompts.mjs     prompts de guion e ideas
  lib/steps.mjs       ideas, guion, producción, capítulos, SRT, textos de YouTube, REVISAR.md, historial
  lib/tts.mjs         edge-tts / ElevenLabs + ffprobe
  lib/media.mjs       Pexels + música local
  lib/render.mjs      bundle + renderMedia + renderStill
  lib/youtube.mjs     OAuth, subida, miniatura, subtítulos, estadísticas, Analytics
  lib/schedule.mjs    próxima franja de publicación en la zona del canal
  run.mjs daily.mjs ideas.mjs outliers.mjs script.mjs voice.mjs render.mjs upload.mjs stats.mjs auth.mjs
src/                  plantillas Remotion (Root, Episode, scenes, components, Thumbnail, types, theme, sample, lib/fonts, lib/motion)
jobs/<id>/            script.json, meta.json, audio/, media/, music/, long.json, short.json  (también es la carpeta pública del render)
out/<id>/             long.mp4, short.mp4, thumb.png, REVISAR.md
data/                 ideas.json, history.json, outliers(.json|-shorts.json), performance.json
secrets/              youtube-token.json (refresh token de OAuth)
scripts/schedule.ps1  tarea diaria del Programador de tareas de Windows (09:00)
docs/                 investigación (monetización, canales de referencia, audiencia, stack) a septiembre de 2026
```

Scripts npm: `studio`, `make`, `ideas`, `outliers`, `script`, `voice`, `render`, `upload`, `auth`, `daily`, `stats`, `typecheck`.

Variables de entorno (`.env`, todas opcionales): `CHANNEL`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (por defecto `claude-sonnet-5-5`), `ELEVENLABS_API_KEY`, `PEXELS_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_API_KEY`.

## 3 · Pipeline paso a paso

`npm run make` (`pipeline/run.mjs`) encadena todo y se puede reanudar con `--job <id>` según `meta.json.status` (`scripted` → `produced` → `rendered` → `uploaded`).

1. **Idea.** `--topic "…"` o la mejor idea `status: "new"` de `data/ideas.json`: ordena por `score` y penaliza 2 puntos el pilar del último episodio publicado. Si no hay ideas, genera 15.
2. **Ideas** (`generateIdeas`): prompt con nicho, público, pilares, `avoid`, hasta 25 outliers y los 80 últimos títulos hechos. Devuelve `{ideas:[{topic, pillar, angle, workingTitle, demand, score}]}`.
3. **Guion** (`writeScript`): `askJson(scriptPrompt, {maxTokens: 64000, web: true})`. Id del job: `AAAA-MM-DD-<slug del título>` (con sufijo `-2`, `-3`… si ya existe). Valida que haya `title`, `description`, `long`, `short`, `thumbnail`, al menos 10 escenas en el largo y que cada escena tenga `text` y `visual.kind`.
   - `askJson`: si hay `ANTHROPIC_API_KEY`, `client.messages.stream({model, max_tokens, messages})` sin herramientas. Si no, lanza `claude -p --output-format json --allowedTools WebSearch,WebFetch`, le pasa el prompt por stdin y lee `result`. Extrae el bloque ```json``` (o el texto entre la primera `{` y la última `}`).
   - Guion objetivo: `minutes × 155` palabras en el largo y `seconds × 2,6` en el Short; 5-8 secciones con `heading` (serán los capítulos); gancho en 0-5 s; bucle abierto antes de los 30 s; mini-gancho cada 60-90 s; la última escena es `outro`. Short autónomo, de 5 a 9 escenas, con la primera frase ≤ 10 palabras y un final que enlaza con el principio. 10 títulos ≤ 60 caracteres, texto de miniatura de 2-5 palabras, descripción de 2 párrafos, 8-15 tags y `sources[{claim, source, url}]`.
4. **Voz** (`voiceScenes`): un MP3 por escena en `jobs/<id>/audio/<long|short>-NNN.mp3` y su `.words.json` (`[{text, start, end}]` en segundos).
   - edge-tts: `tts_edge.py` recibe un spec JSON, genera en paralelo (semáforo de 4), con `boundary="WordBoundary"` (offsets en unidades de 100 ns) y 4 reintentos con espera creciente.
   - ElevenLabs (si `provider: "elevenlabs"` + clave + voiceId): `POST /v1/text-to-speech/{voice}/with-timestamps` y agrupa los tiempos por carácter en palabras, cortando en espacios.
   - `duration` de cada escena = `ffprobe format=duration`.
5. **Material** (`fetchMedia`, solo con `PEXELS_API_KEY`): para las escenas con `mediaQuery`, en `broll` busca vídeo (`/videos/search`, orientación según formato, `size=medium`, duración ≥ 4 s, el archivo MP4 de altura más cercana a 1080/1920); en el resto, una foto (`/v1/search`, `src.landscape` o `src.portrait`). Sin repetir ids. Guarda `media/m-<orientación>-<i>.(mp4|jpg)` y el crédito «Vídeo: autor / Pexels» o «Foto: autor / Pexels». Los fallos se registran y la escena se queda sin fondo.
6. **Música** (`pickMusic`): un archivo al azar de `assets/music/` (mp3/m4a/wav) copiado a `jobs/<id>/music/`.
7. **Props**: `long.json` = `{id: "<id>-long", channelName, theme, music, musicVolume, title, captions: false, endScreen: true, scenes}` (cada escena lleva `section` y `sectionStart`). `short.json` = igual con `captions: true, endScreen: false`.
8. **Render** (`renderJob`): `bundle({entryPoint: src/index.ts, publicDir: jobs/<id>})`, así `staticFile("audio/…")` apunta al job. `renderMedia` con h264, CRF 20 y concurrencia = 75 % de los núcleos para `Long` y `Short`; `renderStill` para `Thumbnail` con `script.thumbnail` + `theme` + la primera foto JPG del largo como fondo. Referencia: el largo de 8,5 min tarda unos 20 min y el Short de 49 s, unos 2 min, en un PC de sobremesa con CPU.
9. **Textos de YouTube** (`youtubeTexts`): descripción del largo = descripción + capítulos (si hay ≥ 3; tiempo acumulado `duration + 0,3 s`, el primero a `0:00`) + «Fuentes:» con viñetas + «Material visual:» con hasta 12 créditos + `disclosureLine`, sin líneas vacías dobles y cortada a 4.900 caracteres. Tags = tags del guion + `defaultTags`, sin duplicados, máximo 20. SRT del largo con un bloque por escena.
10. **`REVISAR.md`** en `out/<id>/`: checklist (datos, largo, Short, miniatura), comando de subida, títulos alternativos, textos y fuentes.
11. **Subida** (`npm run upload -- <id> [--schedule] [--only long|short]`): `videos.insert` (snippet con `categoryId`, `defaultLanguage`, `defaultAudioLanguage` = `lang`; status con `privacyStatus`, `selfDeclaredMadeForKids`, `containsSyntheticMedia`, `embeddable`), luego `thumbnails.set` y `captions.insert` (SRT). El Short lleva «Vídeo completo: https://youtu.be/<id>» en la descripción. Con `--schedule`: `publishAt` a la hora del canal (el largo, en la próxima franja con más de 2 h de margen; el Short, al día siguiente). Guarda `uploads` en `meta.json` y una entrada en `data/history.json`.
12. **Bucle de mejora** (`npm run stats`): YouTube Analytics de los 28 últimos días por vídeo; puntuación = `log10(1+views) + averageViewPercentage/25 + subscribersGained/views·1000`; media por pilar; +2 a las ideas del mejor pilar y -1 a las del peor.
13. **Outliers** (`npm run outliers [-- --days 30 --shorts]`): para cada `seed`, `search.list` por `viewCount` en los N últimos días; `videos.list` y `channels.list`; outlier = vistas / (vistas del canal / vídeos del canal). Filtro: ×5 y ≥ 20.000 vistas (Shorts: ×3 y ≥ 100.000); descarta canales de > 100k suscriptores con más de 180 días. Puntuación = `0,45·log2(outlier) + 0,25·log2(vistas/subs) + 0,15·log2(vistas/hora) + 1 si el canal tiene < 90 días`.
14. **Diario** (`npm run daily`): stats → outliers los lunes (si hay `YOUTUBE_API_KEY`) → rellena el backlog si quedan < 5 ideas → los días que tocan (`longPerWeek` 1 → miércoles; 2 → martes y viernes; 3 → L-X-V; 4 → L-M-J-V; 5 → L-V) ejecuta `run.mjs`, con `--upload --schedule` solo si `autoPublish: true`.

OAuth (`npm run auth`): cliente OAuth «App de escritorio», servidor local en `http://127.0.0.1:5391/oauth2callback`, `access_type: offline`, `prompt: consent`, scopes `youtube.upload`, `youtube.force-ssl` y `yt-analytics.readonly`. Guarda el token en `secrets/youtube-token.json` y lo actualiza al refrescarse.

## 4 · Composiciones Remotion

| id | Tamaño | fps | Duración |
|---|---|---|---|
| `Long` | 1920×1080 | 30 | `Σ ceil((duration + 0,3) · 30)` + 600 frames de pantalla final |
| `Short` | 1080×1920 | 30 | `Σ ceil((duration + 0,3) · 30)` |
| `Thumbnail` | 1280×720 | Still | — |

La duración se calcula con `calculateMetadata` a partir de las props; `defaultOutName = props.id`. Las props por defecto (`src/sample.ts`, 5 escenas del pulpo con tiempos de palabra simulados) dan 41,5 s en `Long` y 21,5 s en `Short`.

**Unidad de diseño:** `u = min(ancho, alto) / 1080`. Todas las medidas se multiplican por `u`, así que una misma escena sirve en 16:9 y en 9:16.

**Capas de `Episode`** (de abajo arriba): fondo `bg` → `Backdrop` → una `Sequence` por escena (visual + `<Audio>` de la voz + subtítulos si `captions`) → `Sequence` de la pantalla final → música en bucle a `musicVolume` → marca de agua → barra de progreso.

- **Backdrop:** dos degradados radiales (`accent` al 13 % y `accent2` al 11 %) cuyo centro oscila con `sin(frame/240)·12`; retícula de líneas de 1 px de `fg` al 4 % cada `90u` que se desplaza 0,15 px por frame, con máscara radial; grano SVG `feTurbulence` (0,9, 2 octavas) al 7 % en `overlay`.
- **Marca de agua:** nombre del canal en mono 22u, versalitas, tracking 0,18em, `fg` al 50 %. Arriba a la derecha (44u / 56u) en 16:9; centrada a 120u del borde superior en 9:16.
- **Barra de progreso:** 6u de alto, `fg` al 8 % con relleno `accent` que escala en X lineal de 0 a 1. Abajo en 16:9 y arriba en 9:16.
- **Contenedor de escena (`Frame`):** padding `110u 150u 170u` en 16:9 (alineado a la izquierda, ancho máx. 72 %) y `14 % 70u 36 %` del alto en 9:16 (centrado, deja libre el tercio inferior para los subtítulos). Columna con `gap 34u`. Salida: en los últimos 7 frames, opacidad 1→0 y desenfoque 0→6 px.
- **Pantalla final (20 s):** nombre del canal en `Kicker` + titular «Sigue la curiosidad» (96u) y dos huecos discontinuos (`fg` al 15 %) donde YouTube pone sus elementos: vídeo 820×461u en (derecha 150u, arriba 330u) y círculo de suscripción de 260u en (izquierda 150u, arriba 520u).

### Tipos de escena (`visual.kind`)

| kind | Contenido | Tamaños (16:9 / 9:16) |
|---|---|---|
| `hook` | etiqueta opcional + titular centrado + sub | titular 132u / 118u |
| `fact` (y `broll`) | etiqueta (`label` o «Dato NN») + titular + sub | 104u / 92u |
| `stat` | cifra que cuenta de 0 al valor en 1,4 s desde el frame 4 (ease-out), en `accent`, con `prefix`, decimales y `suffix` al 42 % en `fg`; debajo titular y sub | cifra 260u / 210u, titular 70u / 64u |
| `list` | titular + 2-5 filas numeradas `01`, `02`… en mono `accent`. Cada fila aparece cuando la voz dice su primera palabra (si no la encuentra, se reparten en el tiempo); la fila activa al 100 % y las demás al 55 % | titular 78u / 72u, filas 52u / 50u |
| `compare` | titular + dos tarjetas (`fg` al 5 %, borde al 12 %, radio 28u) con etiqueta mono y valor display 100u; la izquierda en `fg` y la derecha en `accent`; «vs» en serif itálica `accent2`. En fila (16:9) o en columna (9:16) | titular 78u / 70u |
| `quote` | titular entre comillas «“ ”» en serif + sub como etiqueta | 90u / 80u |
| `outro` | titular («¿Lo sabías?» por defecto) + sub | 110u / 96u |

Si la escena tiene `media`: capa de foto o vídeo (silenciado y en bucle) a pantalla completa con zoom de 1,04 a 1,14 y desplazamiento lateral de 2,5 % (alterna el sentido según el índice), entrada en 10 frames y velo de `bg` en degradado vertical (alfa 0,43 → 0,62 → 1). El crédito va abajo a la izquierda en mono 16u al 40 %.

### Componentes

- **Headline:** display 800, interlineado 0,98, tracking -0,03em, flex con huecos de 0,26 em. Cada palabra entra a los `delay + i·2` frames en 14 frames: opacidad 0→1, sube desde `0,35·size` y desenfoque 8→0 px. Las palabras de `emphasis` van en `accent` con un subrayado redondeado (alto 0,08 em) que se dibuja con `clip-path` 8 frames después.
- **Kicker:** mono, versalitas, tracking 0,14em, en `accent`, precedido de una raya de `2,2·size` que crece en X; entra deslizándose desde la izquierda en 12 frames.
- **Sub:** text 500, 40u, interlineado 1,3, `muted`, ancho máx. 1100u; entra subiendo 18u en 16 frames.
- **Captions (Short):** agrupa las palabras en páginas de 3 (Short) o 7 (largo), o corta en signo de puntuación final. Short: display 800, 78u, MAYÚSCULAS, sin caja, con sombra de `bg`, a un 20 % del borde inferior. Largo (si se activa): text 700, 46u, caja `bg` al 80 % con radio 14u. La palabra que suena va en `accent`. Cada página entra en 6 frames (opacidad y escala 0,94→1).
- **Thumbnail:** fondo `bg`; con foto, la foto a sangre + degradado horizontal `bg` (100 % → 80 % → 13 %); sin foto, dos resplandores radiales de `accent` y `accent2`. Padding 70/80 px. Placa `kicker` en mono 30 px, versalitas, texto `bg` sobre `accent`, radio 10. Texto en display 800 de 150 px, interlineado 0,92, tracking -0,045em, ancho máx. 900 px, `text-wrap: balance`, con sombra de `bg`, y las palabras de `emphasis` en `accent`.

## 5 · Dirección visual y tokens

**Mundo:** «papel y tinta de noche con una señal naranja». Editorial, sobrio, de divulgación con datos; nada de estética de vídeo viral chillón.

| token | demo | uso |
|---|---|---|
| `bg` | `#13110f` | fondo (tinta cálida) |
| `fg` | `#f3ede2` | texto (papel) |
| `muted` | `#b8b0a3` | texto secundario |
| `accent` | `#ff5b1f` | naranja señal: énfasis, cifras, progreso, palabra activa, placa de miniatura |
| `accent2` | `#8fb3a4` | verde salvia: resplandor secundario y «vs» |

- **Tipografías** (Google Fonts vía `@remotion/google-fonts`, subsets `latin` + `latin-ext`): Bricolage Grotesque 600/800 (display), Instrument Sans 500/700 (texto), Fraunces itálica 500/800 (serif), JetBrains Mono 500 (mono, solo `latin`).
- **Movimiento:** ease-out `cubic-bezier(0.23, 1, 0.32, 1)` para entradas y ease-in-out `cubic-bezier(0.77, 0, 0.175, 1)` para salidas. Entradas de 12-16 frames, escalonado de 2 frames por palabra y salida de 7 frames.
- **Prohibido:** fondos claros, colores en formato que no sea `#rrggbb`, más de 2 escenas seguidas del mismo `kind`, titulares que repitan la frase de la voz y cifras en pantalla que no diga la voz.

## 6 · Formato de datos

`script.json`:
```
{topic, pillar, titleOptions[10], title, thumbnail:{text, emphasis, kicker}, description, tags[], sources[{claim, source, url}],
 long:{sections:[{heading, scenes:[ESCENA]}]}, short:{title, description, scenes:[ESCENA]}}
ESCENA = {text, visual:{kind, headline, emphasis, label, sub, value, decimals, prefix, suffix, items[], left{label,value}, right{label,value}}, mediaQuery|null}
```
Después de producir, cada escena gana `audio`, `duration`, `words[{text,start,end}]` y, si hay Pexels, `visual.media` y `visual.credit`. Tipos TypeScript en `src/types.ts` (`EpisodeProps`, `Scene`, `Visual`, `Word`, `Theme`, `ThumbnailProps`).

## 7 · Políticas y calidad

- `autoPublish: false` por defecto: nada se publica sin revisión humana.
- Los prompts exigen datos con fuente, prohíben inventar y piden una estructura variada que rote entre pilares, por la política de «contenido no auténtico / producido en masa» del YPP.
- `disclosureLine` declara el uso de IA en todas las descripciones. `containsSyntheticMedia` solo se marca con contenido realista generado o voz clonada.
- No descarga ni reutiliza vídeos de terceros: solo stock con licencia (Pexels) y música propia.

## 8 · Limitaciones y bugs conocidos del original

Los diez bugs detectados están **corregidos** en el original y en el kit (mismos cambios en ambos):

- **B1 · Corregido.** `npm run media` apuntaba a `pipeline/media.mjs`, que no existe. Se ha quitado el script de `package.json`; la descarga de material la hace `npm run voice`.
- **B2 · Corregido.** Con `ANTHROPIC_API_KEY` el guion se escribía sin búsqueda web. Ahora `llm.mjs` añade la herramienta de búsqueda web del servidor de Anthropic (`web_search_20260209`, `max_uses: 10`) cuando se pide `web: true`, siempre en streaming, reanuda los `pause_turn` y lee el JSON del texto final. El guion usa `max_tokens: 64000` (ideas: 16000) para dejar margen al razonamiento adaptativo; si aun así la respuesta para por `max_tokens` (o `refusal`), falla con un error claro en vez de un JSON cortado. Sigue siendo buena idea revisar las fuentes en `REVISAR.md`.
- **B3 · Corregido.** `tts.mjs` resuelve el intérprete: variable `PYTHON` del `.env`/entorno; si no, `python3` en macOS/Linux y `python` en Windows, y comprueba que existe. Si falta Python o `ffprobe`, para antes de generar la voz con un mensaje de cómo instalarlos.
- **B4 · Corregido.** edge-tts devuelve las palabras sin puntuación; `tts.mjs` (`punctuate`) las alinea con el texto del guion para recuperar signos, y los subtítulos del Short cortan página al final de frase o pausa. El SRT del largo va además frase a frase con los tiempos por palabra.
- **B5 · Corregido.** La pista de subtítulos ya no es «Español» fijo: se nombra con el idioma del canal (`lang` de `channels/<slug>.json`, vía `Intl.DisplayNames`).
- **B6 · Corregido.** `disclosureLine` ya no lleva «Fuentes abajo.»; `youtubeTexts` añade «Fuentes arriba.» solo en el largo cuando hay fuentes (la línea va debajo de ellas) y nada en el Short. Si un canal antiguo aún dice «Fuentes abajo/arriba.», se quita al generar la descripción.
- **B7 · Corregido.** `upload.mjs` solo guarda una subida si la API devuelve `videoId`, y solo marca el job como `uploaded` y lo apunta en el historial si hay al menos un vídeo confirmado; si no se sube nada, avisa y sale con código 1. El historial guarda una entrada por job.
- **B8 · Corregido.** Fraunces itálica se carga en 500 y 800 (las citas se pintan a 800).
- **B9 · Corregido.** «Dato NN» cuenta solo las escenas de dato (plantilla `fact`/`broll` sin `label`), empezando en 01.
- **B10 · Corregido.** Si ya existe un job con el mismo id ese día, el nuevo recibe sufijo `-2`, `-3`… y no sobrescribe al anterior.
- Los proyectos de Google Cloud sin auditar suben **siempre en privado**; la miniatura por API exige el canal verificado por teléfono; el «vídeo relacionado» del Short se pone a mano.
