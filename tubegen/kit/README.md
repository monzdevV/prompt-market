# TubeGen

Automatiza un canal de YouTube de curiosidades explicadas con datos. Cada episodio sale como vídeo largo (16:9), Short (9:16) y miniatura, montados con **Remotion**.

```
ideas (outliers + Claude) → guion con fuentes (Claude) → voz con tiempos por palabra (edge-tts / ElevenLabs)
   → material libre (Pexels) → render Remotion (largo + Short + miniatura) → REVISAR.md → subida (YouTube Data API)
                                                              ↑                                      │
                                                  data/performance.json  ←── YouTube Analytics ──────┘
```

La investigación completa está en [`docs/`](docs/): monetización, canales de referencia, audiencia y stack técnico.

## Puesta en marcha

1. `npm ci` y `pip install edge-tts` (Python 3.10+). Necesitas también `ffmpeg`/`ffprobe` en el PATH.
2. `copy .env.example .env` y rellena lo que tengas:
   - **Nada obligatorio para probar.** Sin `ANTHROPIC_API_KEY`, los guiones se escriben con `claude -p` (tu Claude Code).
   - `PEXELS_API_KEY`: gratis, añade fotos y vídeos de fondo. Sin ella, el vídeo lleva solo gráficos.
   - `GOOGLE_CLIENT_ID/SECRET`: Google Cloud Console → nuevo proyecto → habilita *YouTube Data API v3* y *YouTube Analytics API* → pantalla de consentimiento (Externa, **pasa a "En producción"**, o el token caduca a los 7 días) → Credenciales → *ID de cliente OAuth* de tipo **App de escritorio**.
   - `YOUTUBE_API_KEY`: en el mismo proyecto, Credenciales → Clave de API (para buscar outliers).
3. `npm run auth` conecta tu canal (una vez).
4. Música opcional: mete mp3 con licencia libre en `assets/music/` (Biblioteca de audio de YouTube).
5. Personaliza el canal en `channels/curiosidad.json`: nombre, público, pilares, voz, colores y cadencia.

## Uso

| Comando | Qué hace |
|---|---|
| `npm run make` | Episodio completo con la mejor idea pendiente |
| `npm run make -- --topic "¿Cuánto pesa una nube?"` | Episodio de un tema concreto |
| `npm run make -- --job <id>` | Retoma un job a medias |
| `npm run studio` | Abre Remotion Studio para previsualizar y retocar plantillas |
| `npm run outliers` / `-- --shorts` | Busca vídeos que rinden 5× su media (señal de demanda) |
| `npm run ideas` | Añade 15 ideas al backlog (`data/ideas.json`) |
| `npm run upload -- <id> [--schedule]` | Sube largo + Short (Short enlazado al largo, subtítulos, miniatura) |
| `npm run stats` | Lee Analytics y prioriza los pilares que mejor funcionan |
| `npm run daily` | Lo que hace la tarea programada |

Automatizarlo cada día a las 9:00: `powershell -ExecutionPolicy Bypass -File scripts\schedule.ps1`.

Cada episodio deja en `out/<id>/` los archivos `long.mp4`, `short.mp4`, `thumb.png` y **`REVISAR.md`**, con los títulos alternativos, la descripción, las fuentes y una lista de comprobación.

## Reglas para no perder la monetización

YouTube expulsa del programa de socios (YPP) el contenido "genérico o repetitivo" hecho en serie. En enero de 2026 cerró 16 canales con IA, y los dos mayores eran en español. Por eso este sistema:

- **No publica sin revisión** (`autoPublish: false`). Revisa los datos y el vídeo antes de subir.
- Pide al guion **datos con fuente**, estructura variada y 5 pilares de formato que rotan.
- Sube a ritmo humano: 2 largos por semana, cada uno con su Short.
- Declara el uso de IA en la descripción. La etiqueta de "contenido alterado o sintético" (`containsSyntheticMedia`) solo es obligatoria con escenas realistas generadas o con la voz clonada de otra persona.
- **No descarga ni resube clips de otros.** En España no existe el *fair use*, y los Content ID y los strikes hunden el canal. Si quieres clips, pide permiso o apúntate a campañas de clipping pagadas (Whop Content Rewards).

## Limitaciones conocidas

- **Vídeos en privado:** los proyectos de Google Cloud sin auditar suben siempre en privado. Publícalos desde YouTube Studio, o pide la auditoría con el formulario *YouTube API Services – Audit and Quota Extension*.
- La miniatura por API necesita el canal **verificado por teléfono**.
- El "vídeo relacionado" del Short no se puede poner por API: se pone a mano en Studio.
- edge-tts es gratis pero no oficial. Si falla, cambia `voice.provider` a `elevenlabs` y pon `elevenVoiceId`.
- Remotion es gratis para personas y empresas de hasta 3 empleados.

## Estructura

```
channels/         perfil del canal (nicho, público, voz, colores, cadencia)
pipeline/         pasos del proceso (Node) + tts_edge.py
  lib/prompts.mjs los prompts: aquí se ajusta la calidad de los guiones
src/              plantillas Remotion (Episode, escenas, subtítulos, miniatura)
jobs/<id>/        guion, audio, material y props de cada episodio
out/<id>/         vídeos finales + REVISAR.md
data/             ideas, historial, outliers y rendimiento
docs/             investigación
```
