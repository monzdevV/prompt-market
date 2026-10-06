# Investigación técnica: canal de YouTube automatizado (Windows 11, Node 24, Python 3.11, ffmpeg)

Fecha: 2026-09-29. Pipeline: guion (Claude API) -> TTS con timestamps por palabra -> render Remotion 4.0.x -> subida con YouTube Data API v3.
Leyenda: [VERIFICADO] = leído en documentación oficial hoy; [INFERIDO] = conocimiento previo / fuentes secundarias, verificar antes de producción.

---

## 1. YouTube Data API v3 (subida)

### 1.1 Cuota (cambió en 2025-2026: ojo con tutoriales viejos)
- [VERIFICADO] **4 dic 2025**: el coste de subir un vídeo bajó de ~1600 unidades a ~100.
- [VERIFICADO] **1 jun 2026**: sistema de cuota "granular". `videos.insert` y `search.list` tienen **su propio bucket**.
- [VERIFICADO] Asignación por defecto actual: *"100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units per day combined for all other endpoints"*. La página de `videos.insert` dice: *"100 calls per day. A call to this method has a quota cost of 1 unit in the Video Uploads quota bucket."*
  - => **100 subidas/día** por proyecto, sin gastar del pool de 10.000.
- [VERIFICADO] Costes en el pool de 10.000: `videos.update` 50, `thumbnails.set` ~50, `captions.insert` 400, `playlistItems.insert` 50, `videos.list` 1.
- Presupuesto por vídeo (subida + miniatura + subtítulos + playlist) ≈ 1 (bucket uploads) + 50 + 400 + 50 = 500 u del pool -> ~20 vídeos/día completos. Si no subes captions (YouTube autogenera), ~100/día.
- Docs: https://developers.google.com/youtube/v3/determine_quota_cost · https://developers.google.com/youtube/v3/revision_history

### 1.2 Bloqueo "private" en proyectos no auditados (GOTCHA crítico)
- [VERIFICADO] *"All videos uploaded via the videos.insert endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode."* No importa qué `privacyStatus` pidas.
- Solución oficial: **auditoría de cumplimiento** vía *YouTube API Services – Audit and Quota Extension Form* (https://support.google.com/youtube/contact/yt_api_form). Guía: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits. Sin plazo publicado (en la práctica, de días a semanas). Suelen pedir: web/descripción del uso, política de privacidad, demo (vídeo) del flujo OAuth y de la app, cumplimiento de Developer Policies. Un uso "interno, mi propio canal" es aceptable pero hay que explicarlo bien. [INFERIDO]
- El modo "Testing" de la pantalla de consentimiento OAuth **NO** quita el bloqueo (el bloqueo depende de la auditoría de la API de YouTube, no de la verificación OAuth de Google). [INFERIDO, consenso comunitario]
- Workarounds mientras no hay auditoría:
  1. Subir por API (queda "private/locked") solo como test; la publicación real se hace **subiendo el MP4 a mano en YouTube Studio**. Un vídeo bloqueado por la API normalmente no se puede pasar a público desde Studio (aparece como bloqueado). [INFERIDO; ver https://github.com/gyuv/youtube-ai-agent/pull/2 que detecta el lock leyendo `status.privacyStatus` tras subir con `videos.list`].
  2. No usar `publishAt` hasta estar auditado (YouTube publica en público lo programado; con lock no tiene efecto).
  3. Alternativa: automatizar la subida en el navegador (Playwright) — frágil y contra ToS; **no recomendado**.
- Detectar lock: tras insert, `videos.list?part=status&id=...` y comprobar `status.privacyStatus` (y `status.uploadStatus`, `status.rejectionReason`).

### 1.3 OAuth2 desktop (Node, paquete `googleapis`, v182 a fecha de hoy)
- Crear en Google Cloud Console: API "YouTube Data API v3" + credencial **OAuth client ID tipo "Desktop app"**. Descargar `client_secret.json`.
- Scopes: `https://www.googleapis.com/auth/youtube.upload` (subir) + `https://www.googleapis.com/auth/youtube` (thumbnails, playlists, update) o `https://www.googleapis.com/auth/youtube.force-ssl` (necesario para **captions**). Recomendado: `youtube.upload` + `youtube.force-ssl`.
- [VERIFICADO] **Refresh token caduca a los 7 días** si la pantalla de consentimiento está en tipo *External* y estado *Testing*: *"is issued a refresh token expiring in 7 days"*. Solución: pasar la app a **"In production"** (para uso propio no hace falta verificación de marca si aceptas la pantalla "app no verificada"; los scopes de YouTube son "sensibles", y con <100 usuarios puedes usarla sin verificar). Otros motivos de caducidad: 6 meses sin uso, revocación, >100 refresh tokens por cliente/cuenta. Doc: https://developers.google.com/identity/protocols/oauth2
- Flujo loopback (el "OOB" copy-paste está deprecado desde 2022):

```js
// auth.mjs  — npm i googleapis @google-cloud/local-auth
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import fs from 'node:fs/promises';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];
const TOKEN = './secrets/token.json';

export async function getAuth() {
  const { client_id, client_secret } = JSON.parse(await fs.readFile('./secrets/client_secret.json')).installed;
  const oauth2 = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
  try {
    oauth2.setCredentials(JSON.parse(await fs.readFile(TOKEN)));
  } catch {
    const c = await authenticate({ keyfilePath: './secrets/client_secret.json', scopes: SCOPES }); // abre navegador, 1 vez
    oauth2.setCredentials(c.credentials);            // incluye refresh_token (access_type offline por defecto)
  }
  oauth2.on('tokens', async (t) => {                 // persistir renovaciones
    const cur = JSON.parse(await fs.readFile(TOKEN).catch(() => '{}'));
    await fs.writeFile(TOKEN, JSON.stringify({ ...cur, ...t }));
  });
  return oauth2;
}
```

### 1.4 Subida (`videos.insert`, subida reanudable automática en googleapis)

```js
import { google } from 'googleapis';
import fs from 'node:fs';
const youtube = google.youtube({ version: 'v3', auth: await getAuth() });

const res = await youtube.videos.insert({
  part: ['snippet', 'status'],
  notifySubscribers: true,
  requestBody: {
    snippet: {
      title: 'Título (máx 100 caracteres)',
      description: 'Descripción (máx 5000 bytes, sin < >)\n#Shorts',
      tags: ['tag1', 'tag2'],          // total ~500 caracteres
      categoryId: '27',                // 27 Education, 28 Sci&Tech, 22 People&Blogs
      defaultLanguage: 'es',
      defaultAudioLanguage: 'es-ES',
    },
    status: {
      privacyStatus: 'private',        // obligatorio 'private' si usas publishAt
      publishAt: '2026-10-01T16:00:00Z', // ISO 8601; solo si nunca se publicó
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,    // divulgación IA (ver 1.5)
      embeddable: true,
      license: 'youtube',              // o 'creativeCommon'
    },
  },
  media: { body: fs.createReadStream('out/video.mp4') },
}, {
  onUploadProgress: (e) => process.stdout.write(`\r${(e.bytesRead / 1e6).toFixed(1)} MB`),
});
const videoId = res.data.id;
```
- [VERIFICADO] Campos `status` escribibles en insert: `embeddable`, `license`, `privacyStatus`, `publicStatsViewable`, `publishAt`, `selfDeclaredMadeForKids`, `containsSyntheticMedia`. Doc: https://developers.google.com/youtube/v3/docs/videos/insert
- [VERIFICADO] `status.publishAt`: solo con `privacyStatus: 'private'`, vídeo nunca publicado; en `videos.update` hay que reenviar `privacyStatus: 'private'`; fecha pasada = publica ya.

### 1.5 `status.containsSyntheticMedia` (nombre exacto verificado, añadido 30 oct 2024)
- Boolean. *"allows the channel owner to disclose that a video contains realistic Altered or Synthetic (A/S) content"*.
- Política (https://support.google.com/youtube/answer/14328491): obligatorio si es **realista** (personas reales diciendo cosas que no dijeron, eventos reales alterados, escenas realistas inventadas; música IA se cita como ejemplo). **No** hace falta por guion IA, miniaturas, títulos, subtítulos, contenido animado/no realista. Una voz TTS narrando sobre stock footage en principio no es "realista engañoso", pero si usas imágenes IA fotorrealistas, marca `true`. Divulgar **no** afecta a la monetización.
- Aviso aparte (YPP): la política de "contenido no auténtico / producido en masa" (antes "repetitious content") puede dejar sin monetización canales de plantillas repetitivas con TTS. Añadir valor/variación real. [INFERIDO]

### 1.6 Miniatura, subtítulos, playlists
- `thumbnails.set` [VERIFICADO]: ~50 u; **hasta 50 MB** (subido de 2 MB el 14 sep 2026); `image/jpeg`/`image/png`; 403 `forbidden` si la cuenta no puede poner miniaturas personalizadas => **verificar el canal por teléfono** (youtube.com/verify / "funciones intermedias"). Recomendado 1280x720 JPG.
  ```js
  await youtube.thumbnails.set({ videoId, media: { mimeType: 'image/jpeg', body: fs.createReadStream('out/thumb.jpg') } });
  ```
- `captions.insert`: 400 u; scope `youtube.force-ssl`; el parámetro `sync` está deprecado (abr 2024): sube SRT/VTT con tiempos.
  ```js
  await youtube.captions.insert({ part: ['snippet'],
    requestBody: { snippet: { videoId, language: 'es', name: 'Español', isDraft: false } },
    media: { mimeType: 'application/octet-stream', body: fs.createReadStream('out/subs.srt') } });
  ```
- Playlist: `youtube.playlistItems.insert({ part:['snippet'], requestBody:{ snippet:{ playlistId, resourceId:{ kind:'youtube#video', videoId } } } })` (50 u).

### 1.7 Shorts
- [VERIFICADO] (https://support.google.com/youtube/answer/15424877): Short = **hasta 3 minutos** + relación de aspecto **cuadrada o vertical**. No hay flag en la API: se detecta automáticamente. `#Shorts` en título/descripción no es requisito (ayuda a descubrimiento, opcional). Renderizar 1080x1920, 30 fps. Evita 16:9 si quieres Short.

---

## 2. TTS con timestamps por palabra (español)

| Opción | Timestamps | Calidad ES | Precio | Notas |
|---|---|---|---|---|
| **edge-tts** (Python) | WordBoundary (palabra) | Buena (Neural) | Gratis | No oficial; puede romperse |
| **ElevenLabs** `/with-timestamps` | Carácter | Excelente | $0.08/1k chars (v2/v3), v4 promo | Agrupar caracteres -> palabras |
| OpenAI `gpt-4o-mini-tts` | **No** | Buena | ~$0.015/min | Alinear con Whisper |
| Kokoro-82M local | No fiable en ES | Correcta (3 voces) | Gratis | ef_dora, em_alex, em_santa |
| Google Cloud TTS | SSML `<mark>` (timepoints) | Buena | según voz | Más fricción |

### 2.1 edge-tts (recomendado para empezar, gratis)
- [VERIFICADO] `edge-tts` **7.2.8** (22 mar 2026), sigue mantenido. Issues abiertos 2026: `WSServerHandshakeError: 503`, "No audio was received" intermitente -> **implementar reintentos**.
- [VERIFICADO] **GOTCHA v7**: `Communicate(..., boundary="SentenceBoundary")` es el **default**. Para palabras hay que pasar `boundary="WordBoundary"`.
- Chunks: `{"type": "WordBoundary", "offset", "duration", "text"}`; `offset`/`duration` en **unidades de 100 ns** (dividir entre 10.000 para ms).
- SSML personalizado eliminado; solo `rate`, `volume`, `pitch`.
- Voces es-ES: `es-ES-AlvaroNeural` (H), `es-ES-ElviraNeural` (M), `es-ES-XimenaNeural`; es-MX: `es-MX-JorgeNeural`, `es-MX-DaliaNeural`. Listar: `edge-tts --list-voices | findstr es-`. Hay voces "Multilingual" (p.ej. `en-US-AndrewMultilingualNeural`) que también leen español. [INFERIDO nombres; confirmar con --list-voices]

```python
# tts_edge.py  — pip install edge-tts
import asyncio, json, sys, edge_tts

async def main(text, voice="es-ES-AlvaroNeural", out="voz.mp3"):
    for intento in range(4):
        try:
            words = []
            com = edge_tts.Communicate(text, voice, rate="+5%", boundary="WordBoundary")
            with open(out, "wb") as f:
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
                    elif ch["type"] == "WordBoundary":
                        s = ch["offset"] / 10_000; d = ch["duration"] / 10_000
                        words.append({"text": " " + ch["text"], "startMs": s, "endMs": s + d,
                                      "timestampMs": s, "confidence": None})
            json.dump(words, open(out + ".words.json", "w", encoding="utf-8"), ensure_ascii=False)
            return
        except Exception as e:
            await asyncio.sleep(2 ** intento)
    raise RuntimeError("edge-tts falló")

asyncio.run(main(open(sys.argv[1], encoding="utf-8").read()))
```
(El formato de salida ya coincide con el tipo `Caption` de `@remotion/captions`.)

### 2.2 ElevenLabs
- [VERIFICADO] `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps`; body `text`, `model_id` (default `eleven_multilingual_v2`), `voice_settings`, `output_format` (default `mp3_44100_128`). Respuesta: `audio_base64`, `alignment.{characters, character_start_times_seconds, character_end_times_seconds}`, `normalized_alignment`.
- Modelos: **Eleven v4 lanzado el 28 sep 2026** — `eleven_v4` y `eleven_v4_turbo` (90+ idiomas). Precio API por 1k chars: v4 $0.022 (con descuento hasta 12 oct), v3 y multilingual v2 $0.08, flash/turbo $0.04. Planes: Starter $6/mes, Creator $22, Pro $99. Uso comercial: plan de pago (el Free exige atribución). https://elevenlabs.io/pricing/api
- Convertir caracteres a palabras: recorrer `characters`, cortar en espacios, `startMs = start[primer char]*1000`, `endMs = end[último char]*1000`.
- Guion de 8 min ≈ 7.000 caracteres ≈ $0.56 (v2) / ~$0.15 (v4 promo).

### 2.3 OpenAI TTS / Kokoro / fallback universal
- OpenAI `gpt-4o-mini-tts` ≈ $0.015/min (tokens: $0.60/1M texto, $12/1M audio); no devuelve timestamps. [fuente secundaria]
- Kokoro (`pip install kokoro`, requiere espeak-ng en Windows): voces ES `ef_dora`, `em_alex`, `em_santa`; los timestamps de Kokoro dependen del G2P inglés (misaki) → en español no fiables.
- **Fallback universal**: cualquier TTS -> `faster-whisper` con `word_timestamps=True` sobre el audio generado (tú ya conoces el texto, así que solo necesitas los tiempos). Ver sección 7.

---

## 3. Remotion 4 (última: **4.0.529**, 25 sep 2026)

### 3.1 Licencia [VERIFICADO LICENSE.md]
Gratis para: individuos, empresas con ánimo de lucro de **hasta 3 empleados**, ONGs, evaluación. Resto: *Company License* (remotion.pro). Uso comercial (monetizar canal) permitido en la licencia gratuita si cumples lo anterior.

### 3.2 Render desde Node

```js
// render.mjs — npm i remotion @remotion/renderer @remotion/bundler @remotion/captions @remotion/media @remotion/google-fonts @remotion/transitions (todas en la MISMA versión exacta, sin ^)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const serveUrl = await bundle({
  entryPoint: path.resolve('remotion/index.ts'),
  publicDir: path.resolve('public'),    // audio/imagenes del episodio se copian aqui ANTES de bundle
});
const inputProps = { audio: 'ep42/voz.mp3', words: [...], scenes: [...] };
const composition = await selectComposition({ serveUrl, id: 'Short', inputProps }); // ejecuta calculateMetadata
await renderMedia({
  composition, serveUrl, inputProps,
  codec: 'h264', crf: 20, x264Preset: 'fast',
  outputLocation: 'out/video.mp4',
  concurrency: null,                    // o número hallado con `npx remotion benchmark`
  hardwareAcceleration: 'if-possible',  // 'disable' | 'if-possible' | 'required'
  onProgress: ({ progress }) => process.stdout.write(`\r${(progress * 100).toFixed(0)}%`),
});
```
- Reutiliza `serveUrl` entre renders (bundle es caro). Si cambian assets en `public/` hay que volver a hacer bundle, **o** sirve los assets por HTTP (`http://localhost:PORT/...`) y pasa URLs en props (alternativa recomendada para assets dinámicos). `staticFile('ep42/voz.mp3')` solo resuelve ficheros de `public/`; **no se pueden pasar rutas absolutas de Windows (`C:\...`)** a componentes. [INFERIDO parcialmente; docs: https://www.remotion.dev/docs/staticfile, https://www.remotion.dev/docs/renderer/render-media]

### 3.3 Duración dinámica: `calculateMetadata`
- [VERIFICADO] `getAudioDurationInSeconds()` de `@remotion/media-utils` está **deprecado** -> usar `getMediaMetadata()` basado en **mediabunny** (`npm i mediabunny`), snippet en https://www.remotion.dev/docs/mediabunny/metadata
- Más simple: como ya tienes los timestamps, pasa la duración en props.

```tsx
<Composition id="Short" component={Short} width={1080} height={1920} fps={30} durationInFrames={1}
  defaultProps={{ audio: '', words: [], durationSec: 1, scenes: [] }}
  calculateMetadata={async ({ props }) => ({
    durationInFrames: Math.ceil((props.durationSec + 0.5) * 30),
  })} />
```

### 3.4 Subtítulos estilo TikTok: `@remotion/captions`
- [VERIFICADO] `createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds, breakOnSilenceAfterMilliseconds? })` -> `{ pages }`; cada página: `text`, `startMs`, `durationMs`, `tokens[{ text, fromMs, toMs, pageBreakAfter }]`.
- Tipo `Caption`: `text`, `startMs`, `endMs`, `timestampMs`, `confidence`. **GOTCHA**: cada palabra debe llevar **espacio delante** (`" hola"`), si no se fusiona todo en una línea.

```tsx
import { createTikTokStyleCaptions } from '@remotion/captions';
import { Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
import { Audio } from '@remotion/media';

const { pages } = createTikTokStyleCaptions({ captions: words, combineTokensWithinMilliseconds: 1200 });
// por página: <Sequence from={Math.round(p.startMs/1000*fps)} durationInFrames={...}> resaltar token activo comparando frame con fromMs/toMs
```
- Docs: https://www.remotion.dev/docs/captions/create-tiktok-style-captions

### 3.5 Otros paquetes
- `@remotion/media`: `<Video>` y `<Audio>` nuevos — [VERIFICADO] la guía de rendimiento recomienda `<Video>` de `@remotion/media`; `<OffthreadVideo>`/`<Html5Video>` quedan como antiguos.
- `@remotion/google-fonts`: `import { loadFont } from '@remotion/google-fonts/Montserrat'; const { fontFamily } = loadFont('normal', { weights: ['800'], subsets: ['latin'] });` (limitar pesos/subsets acelera).
- `@remotion/transitions`: `<TransitionSeries>` + `<TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />` (`fade`, `slide`, `wipe` desde `@remotion/transitions/fade` etc.). Las transiciones **solapan** escenas: la duración total se reduce en la duración de cada transición — tenerlo en cuenta en `calculateMetadata`.

### 3.6 Velocidad de render [VERIFICADO https://www.remotion.dev/docs/performance]
- `npx remotion benchmark` para hallar `concurrency` óptima.
- Evitar `filter: blur()`, `box-shadow` grandes, WebGL sin GPU -> pre-renderizar como imagen.
- `imageFormat: 'jpeg'` (default) más rápido que png; h264 mejor que vp8/vp9.
- `--log=verbose` lista los frames más lentos; `useMemo` para cálculos pesados.
- Descargar assets a local antes del render (no hacer fetch remoto en cada frame).
- Orientativo: Short de 60 s 1080x1920 en CPU de 8 núcleos ≈ 1-3 min. [INFERIDO]

---

## 4. Fuentes visuales y música

### Stock
- **Pexels** [fuentes oficiales vía búsqueda]: gratis, header `Authorization: <API_KEY>`, **200 req/hora y 20.000/mes**. Vídeos: `GET https://api.pexels.com/videos/search?query=...&orientation=portrait&size=medium&per_page=15` (fotos: `/v1/search`). Licencia Pexels: uso comercial gratis sin atribución obligatoria en el vídeo, pero la API pide acreditar a Pexels/autores en tu plataforma (pon créditos en la descripción). Elegir de `video_files[]` el de `width=1080` y `file_type=video/mp4`. https://www.pexels.com/api/documentation/
- **Pixabay** [VERIFICADO]: `https://pixabay.com/api/` y `https://pixabay.com/api/videos/`; 100 req/60 s; **cachear 24 h**; descargar (no hotlink de imágenes); **música no disponible por API**. Licencia: uso libre sin atribución, prohibido redistribuir "standalone". https://pixabay.com/api/docs/
- **Wikimedia Commons**: API MediaWiki (`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata`). Licencias varían (CC BY / CC BY-SA exigen atribución; leer `extmetadata.LicenseShortName` y `Artist`). Útil para personajes/hechos históricos. [INFERIDO]
- **Unsplash**: API (`Authorization: Client-ID ...`), 50 req/h en demo; obliga a atribución y a disparar el endpoint `download_location` al usar una foto; no permite "replicar Unsplash". Solo fotos. [INFERIDO]

### IA
- **fal.ai FLUX.1 [schnell]** [VERIFICADO]: `fal-ai/flux/schnell`, **$0.003 por megapíxel** (redondeo hacia arriba) -> 1080x1920 ≈ 2 MP ≈ $0.006/imagen. Uso comercial permitido. `npm i @fal-ai/client`; `fal.subscribe('fal-ai/flux/schnell', { input: { prompt, image_size: 'portrait_16_9', num_inference_steps: 4 } })`; env `FAL_KEY`.
- **OpenAI gpt-image-2** [fuentes secundarias]: 1024x1536 ≈ $0.005 (low) / $0.041 (medium) / $0.165 (high); facturado por tokens.
- Si son fotorrealistas de sucesos/personas reales -> `containsSyntheticMedia: true`.

### Música
- **YouTube Audio Library**: sin API (descarga manual en Studio, youtube.com/audiolibrary). Pistas "YouTube Audio Library license" sin atribución; las **Creative Commons requieren crédito en la descripción**. Solución práctica: descargar ~50 pistas una vez a `assets/music/` con un `music.json` (mood, bpm, requiere_credito) y que el pipeline elija. [VERIFICADO parcialmente]
- **Pixabay Music**: licencia Pixabay (libre, sin atribución), pero **no hay API de música**; descarga manual. Algunas pistas pueden recibir reclamaciones Content ID (disputables). [INFERIDO]
- Mezcla: música a -18/-22 dB bajo la voz; en Remotion `<Audio volume={0.12} />` o ducking con ffmpeg `sidechaincompress`.

---

## 5. Claude API (`@anthropic-ai/sdk`, v0.129.0 hoy)

- Modelos (ids exactos, sin sufijo de fecha): `claude-opus-5-5` ($4 / $20 por MTok in/out) y `claude-sonnet-5-5` ($2 / $10). Contexto 1M, hasta 128K de salida (con streaming).
- **GOTCHAS Opus 5.5 / Sonnet 5.5**:
  - `thinking: {type:"enabled", budget_tokens}` -> **400**. Usar `thinking: {type: "adaptive"}` (o omitir) y controlar con `output_config: { effort: "low"|"medium"|"high"|"xhigh"|"max" }`. En Opus 5.5 el default de effort es `medium`; en Sonnet 5.5 `high`.
  - `tool_choice: {type:"any"|"tool"}` (forzar herramienta) -> **400**. Para JSON usar **structured outputs** (`output_config.format`), no el truco de "forzar tool".
  - Sin prefill del asistente (400). No `temperature` en valores no-default.
  - `output_format` (antiguo) deprecado -> `output_config.format`.
- Structured output con Zod (`npm i @anthropic-ai/sdk zod`):

```ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const Guion = z.object({
  titulo: z.string(), descripcion: z.string(), tags: z.array(z.string()),
  hook: z.string(),
  escenas: z.array(z.object({ narracion: z.string(), busqueda_broll: z.string(), prompt_imagen: z.string() })),
  cta: z.string(), contiene_media_sintetica_realista: z.boolean(),
});

const client = new Anthropic(); // ANTHROPIC_API_KEY
const res = await client.messages.parse({
  model: 'claude-sonnet-5-5',
  max_tokens: 16000,
  thinking: { type: 'adaptive' },
  output_config: { effort: 'medium', format: zodOutputFormat(Guion) },
  system: 'Eres guionista de YouTube en español de España...',
  messages: [{ role: 'user', content: `Tema: ${tema}. Duración objetivo: 55 s.` }],
});
if (res.stop_reason === 'refusal') throw new Error('refusal');
const guion = res.parsed_output!; // null si falló el parseo
```
- **Fact-checking**: server tool `{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }` (versión con filtrado dinámico, válida en Opus 5.5/Sonnet 5.5). Recomendado en **una llamada previa** de investigación (devuelve citas) y luego la llamada de guion con structured output (las citas/`citations` y `output_config.format` no son compatibles en la misma petición de documentos). Coste web search ≈ $10 / 1.000 búsquedas + tokens de resultados. [precio INFERIDO; verificar en https://docs.claude.com/en/docs/about-claude/pricing]
- Recomendación de fallback ante `stop_reason: "refusal"`: beta `server-side-fallback-2026-07-01` con `fallbacks: "default"` (vía `client.beta.messages`).
- Coste aproximado por guion (Sonnet 5.5): ~3k tokens entrada + ~4k salida (incl. thinking) ≈ $0.006 + $0.04 ≈ **$0.05**; con 5 búsquedas web y ~20k tokens de resultados ≈ **$0.10–0.15**. Opus 5.5 ≈ el doble. Para lotes no urgentes: Batches API (−50%).

---

## 6. Programación (scheduling)

- **Windows Task Scheduler** (recomendado, sobrevive a reinicios; node-cron exige proceso vivo):
  ```powershell
  $a = New-ScheduledTaskAction -Execute "C:\Program Files\nodejs\node.exe" -Argument "C:\canal\pipeline.mjs" -WorkingDirectory "C:\canal"
  $t = New-ScheduledTaskTrigger -Daily -At 9:00
  $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 3) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 15)
  Register-ScheduledTask -TaskName "CanalYT" -Action $a -Trigger $t -Settings $s
  ```
  - Ejecuta como tu usuario ("solo cuando el usuario ha iniciado sesión" evita problemas con Chrome headless de Remotion y rutas de perfil). Logs a fichero; usar lockfile para no solapar.
  - Mejor práctica: generar y **subir con `publishAt`** para varios días (tras auditoría); el PC no necesita estar encendido a la hora de publicación.
- **node-cron** (`npm i node-cron`): útil si ya tienes un proceso residente (p.ej. con pm2).
- **GitHub Actions**: Remotion tiene plantilla de workflow (`npx remotion render ... --props=props.json`) — https://www.remotion.dev/docs/ssr. Runner `ubuntu-latest` 4 vCPU: repos públicos gratis, privados 2.000 min/mes gratis. Guardar `token.json`/`client_secret` como secrets. edge-tts puede sufrir bloqueos desde IPs de datacenter. Alternativas de nube: `@remotion/lambda`, Vercel Sandbox.

---

## 7. Pipeline de clips (yt-dlp + faster-whisper + Claude + ffmpeg)

```bash
pip install -U yt-dlp faster-whisper   # faster-whisper usa CTranslate2; GPU NVIDIA: CUDA 12 + cuDNN 9
yt-dlp -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "src/%(id)s.%(ext)s" URL
```
```python
from faster_whisper import WhisperModel
m = WhisperModel("large-v3", device="cuda", compute_type="float16")  # CPU: "small"/"medium", compute_type="int8"
segs, info = m.transcribe("src/x.mp4", language="es", word_timestamps=True, vad_filter=True)
words = [{"text": " " + w.word.strip(), "startMs": w.start*1000, "endMs": w.end*1000} for s in segs for w in s.words]
```
- Claude: pasar transcripción con marcas `[mm:ss]` y pedir con structured output `[{inicio, fin, titulo, gancho, puntuacion_viral, motivo}]` de 20–60 s que sean autocontenidos.
- ffmpeg recorte + 9:16 (centro; para seguir caras, detectar con mediapipe/opencv y mover `x`):
  ```bash
  ffmpeg -ss 00:12:03.5 -to 00:12:48.0 -i src/x.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:v libx264 -crf 20 -preset fast -c:a aac -b:a 160k clip.mp4
  ```
  (poner `-ss` antes de `-i` = seek rápido; re-encode para precisión). Luego quemar subtítulos con Remotion (`<Video>` + captions) o `-vf subtitles=clip.ass`.
- **Notas legales**:
  - Descargar de YouTube con yt-dlp **viola los Términos de YouTube** salvo contenido propio o con permiso; resubir clips de terceros = infracción de copyright salvo licencia o excepción (fair use en EE. UU. / cita en España art. 32 LPI, muy restrictiva: fines docentes/de investigación, análisis, fragmento, citando fuente). Riesgo: reclamaciones Content ID, strikes (3 = cierre de canal), desmonetización por "contenido reutilizado".
  - Uso seguro: tu propio contenido (podcast/directos), creadores que te dan **permiso por escrito** (programas de clipping con reparto de ingresos), contenido CC BY (filtrar `license: Creative Commons` en YouTube) citando al autor, o dominio público. Añadir comentario/transformación real.
  - Los clips de personas reales editados con IA (voz clonada, etc.) requieren `containsSyntheticMedia: true`.

---

## Checklist de gotchas
1. Proyecto API no auditado (creado tras 28-07-2020) => todo sube **privado bloqueado**. Pedir auditoría desde el día 1.
2. OAuth en "Testing" => refresh token caduca en **7 días**. Pasar a "In production".
3. Cuota nueva (jun 2026): 100 `videos.insert`/día en bucket propio; `captions.insert` cuesta 400 del pool de 10.000.
4. `thumbnails.set` 403 si el canal no está verificado por teléfono.
5. `publishAt` exige `privacyStatus: 'private'`.
6. edge-tts v7: `boundary="WordBoundary"` explícito; offsets en 100 ns; reintentos ante 503.
7. `@remotion/captions`: espacio delante de cada palabra.
8. Todas las `@remotion/*` en la misma versión exacta (4.0.529); `getAudioDurationInSeconds` deprecado -> mediabunny.
9. Opus/Sonnet 5.5: nada de `budget_tokens`, nada de forced tool_choice, usar `output_config.format`.
10. Shorts: ≤3 min y vertical/cuadrado; no hay flag en la API.
11. Música: Audio Library/Pixabay Music sin API -> biblioteca local curada.
