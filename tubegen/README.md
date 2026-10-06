# TubeGen · Fábrica de vídeos para tu canal de YouTube

**Un sistema que convierte un tema en un episodio listo para revisar: guion con fuentes, voz, vídeo largo, Short y miniatura, montados con Remotion. Tu IA lo instala con tu nicho, tu idioma, tu voz y tus colores.**

Pegas un prompt, contestas unas 25 preguntas (nombre del canal, temática, público, formatos, idioma, voz, estilo y qué servicios quieres usar) y la IA instala, personaliza y hace un render de prueba. El resultado es idéntico a la demo («Curiosidad Máxima», curiosidades con datos), pero con tu canal.

## Qué incluye

**Por cada episodio** (`npm run make -- --topic "…"`)
- Guion escrito por Claude con gancho, bucle abierto, capítulos, cierre con pregunta y una lista de **fuentes con URL**
- 10 títulos alternativos, descripción con capítulos automáticos, tags, texto de miniatura y subtítulos SRT
- Voz por frase con tiempos por palabra: edge-tts (gratis) o ElevenLabs
- Fotos y vídeos de stock de Pexels elegidos por escena (opcional) y música de tu carpeta
- **Vídeo largo** 1920×1080 con 8 tipos de escena animados (gancho, dato, cifra que cuenta, lista, comparación, cita, b-roll y cierre), barra de progreso y 20 s de pantalla final
- **Short** 1080×1920 independiente, con subtítulos grandes que resaltan la palabra que suena
- **Miniatura** 1280×720
- `REVISAR.md` con todo lo anterior y una checklist para revisar antes de publicar

**Para el canal**
- Subida a YouTube por API: largo + Short enlazado, miniatura, subtítulos y publicación programada a tu hora
- Detector de vídeos «outlier» de tu nicho (los que rinden 5 veces la media de su canal) para elegir temas
- Generador de ideas que rota tus formatos y evita repetir
- Bucle de estadísticas: lee YouTube Analytics y da prioridad a los formatos que mejor te funcionan
- Tarea diaria opcional (Windows o cron)
- 4 informes de investigación (monetización, canales de referencia, audiencia y stack técnico, a septiembre de 2026)

**Técnico:** Node.js 22+, Remotion 4, React 19, TypeScript, Python con edge-tts, ffmpeg, SDK de Anthropic y API de YouTube. Funciona en local, en Windows, macOS o Linux.

## Qué necesitas

- Una IA. Lo ideal es un agente que toque archivos (Claude Code, Cursor, Windsurf, Codex); también vale un chat como claude.ai o ChatGPT, siguiendo los pasos a mano.
- Un ordenador con Node.js 22+, Python 3.10+, ffmpeg y unos 2 GB libres. El render es en CPU: el vídeo largo tarda de 15 a 40 minutos.
- **Para los guiones**, una de dos: Claude Code con tu suscripción, o una clave de API de Anthropic.
- Opcional: claves gratis de Pexels y de YouTube (Google Cloud), y ElevenLabs si quieres mejor voz.

## Cuánto cuesta usarlo

Precios de septiembre de 2026; compruébalos antes de empezar.

| Configuración | Coste aproximado |
|---|---|
| Claude Code (tu suscripción) + edge-tts + Pexels | **0 € extra al mes** |
| API de Claude (`claude-sonnet-5-5`) + edge-tts, 2 episodios por semana | **~2-3 $/mes** (0,15-0,35 $ por guion) |
| Lo anterior + ElevenLabs (plan Creator) | **~25 $/mes** |

La API de YouTube, Pexels y Remotion son gratis (Remotion, para particulares y empresas de hasta 3 personas).

## Cómo se usa

1. Descomprime el paquete.
2. Abre tu IA en esa carpeta.
3. Pega el contenido de `PROMPT.md`.
4. Responde a las preguntas.

Tiempo estimado: de 30 a 60 minutos con un agente (más el primer render) y de 2 a 3 horas en modo chat. Sin ninguna clave puedes comprobar que todo funciona: el kit trae un Short de ejemplo ya producido que se renderiza en un par de minutos.

## Contenido del paquete

| Archivo | Para qué |
|---|---|
| `PROMPT.md` | El prompt maestro que pegas en tu IA |
| `PERSONALIZAR.md` | El mapa de cambios que sigue la IA |
| `SPEC.md` | La especificación completa, por si quieres reconstruirlo sin el kit |
| `kit/` | El código fuente original, verificado: `tsc` pasa, Remotion lista las 3 composiciones y el Short de ejemplo se renderiza |

## Avisos importantes

- **No es un botón de «dinero automático».** YouTube retira la monetización a los canales de contenido «no auténtico» o «producido en masa» (plantillas repetidas con poca variación) y en enero de 2026 cerró canales enormes de IA, varios en español. Este sistema está pensado para ayudarte a producir, no para sustituir tu criterio: **no publica nada sin tu revisión**, exige datos con fuente, rota formatos y sube a ritmo humano. Revisar los datos de cada guion es tu trabajo.
- **Declara la IA.** Cada descripción incluye una línea que dice que el guion se ha escrito con ayuda de IA y que la voz es sintética. Si usas imágenes realistas generadas o voces clonadas de personas reales, marca «contenido alterado o sintético».
- **Subida en privado.** Los proyectos de Google Cloud sin auditar suben siempre en privado. Hasta que pidas la auditoría de la API de YouTube, publica desde YouTube Studio. Poner miniaturas por API exige tener el canal verificado por teléfono.
- **Las voces y servicios no oficiales pueden cambiar.** edge-tts es gratis pero no oficial: si deja de funcionar, cambia a ElevenLabs en una línea.
- **No reutiliza contenido ajeno.** Solo usa stock con licencia (Pexels) y la música que tú pongas. No descarga ni resube vídeos de otros.
- El guion de ejemplo y su vídeo son **de demo**: no los publiques.
- Los 10 bugs detectados en el original están corregidos y documentados en `SPEC.md` §8.
