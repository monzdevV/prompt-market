// Prompts. Aquí está la mayor parte de la "calidad" del canal: si los vídeos flojean, se ajusta esto.

const SCENE_SPEC = `Cada escena es un objeto:
{
  "text": "lo que dice la voz: 1 o 2 frases, 8-28 palabras, fácil de decir en voz alta. Escribe los números como se pronuncian si son ambiguos (p. ej. 'tres mil millones').",
  "visual": {
    "kind": "hook | fact | stat | list | compare | quote | broll | outro",
    "headline": "titular en pantalla, 2-7 palabras; NO repitas la frase entera de la voz, resume la idea",
    "emphasis": "1-2 palabras del headline que van en color de acento",
    "label": "etiqueta corta opcional (categoría, lugar, año)",
    "sub": "línea secundaria opcional, máx 12 palabras",
    "value": 123, "decimals": 0, "prefix": "", "suffix": " km",   // solo en stat
    "items": ["...", "..."],                                           // solo en list (2-5 elementos, que la voz los nombre en orden y empezando por la misma palabra)
    "left": {"label": "...", "value": "..."}, "right": {"label": "...", "value": "..."} // solo en compare
  },
  "mediaQuery": "búsqueda EN INGLÉS para foto/vídeo de stock (2-4 palabras concretas: 'octopus underwater', 'saturn rings') o null"
}
Reglas de visual:
- Varía los tipos: nunca más de 2 escenas seguidas del mismo kind.
- Usa "stat" cuando haya una cifra clave, "compare" para contrastes, "list" para enumeraciones.
- "broll" = vídeo de stock a pantalla completa con titular; úsalo en ~20% de escenas. Pon mediaQuery en ~40% de las escenas.
- Todos los datos numéricos de stat/compare deben aparecer también en la voz.`;

export const scriptPrompt = ({ channel, idea, avoidTitles }) => `Eres guionista jefe del canal de YouTube "${channel.name}".

CANAL
- Nicho: ${channel.niche}
- Público: ${channel.audience}
- Estilo de voz: ${channel.voiceRules}
- Evitar: ${channel.avoid}

TEMA DE HOY
- Tema: ${idea.topic}
- Formato (pilar): ${idea.pillar ?? "libre"}
- Ángulo: ${idea.angle ?? "el que haga el tema más sorprendente sin exagerar"}

OBJETIVO
Escribe un vídeo largo (~${channel.long.minutes} minutos narrados, unas ${Math.round(channel.long.minutes * 155)} palabras en total) y un Short independiente (~${channel.short.seconds} s, unas ${Math.round(channel.short.seconds * 2.6)} palabras) sobre el mismo tema.

POLÍTICA DE YOUTUBE (muy importante)
YouTube desmonetiza el contenido "genérico o repetitivo" hecho en serie. Para que este vídeo sea valioso y original:
- Aporta datos concretos, verificables y con fuente. Si no estás seguro de un dato, no lo uses. Nada inventado.
- Da una explicación o perspectiva propia (por qué pasa, qué significa, comparaciones que ayudan a entenderlo).
- Estructura distinta a una lista plana: gancho → pregunta → desarrollo con giros → conclusión que conecte con la vida del espectador.

VÍDEO LARGO
- 0-5 s: el gancho confirma lo que promete el título, con el dato más fuerte. Sin saludos ni "en este vídeo".
- Antes de los 30 s: abre un bucle ("pero lo más raro no es eso…") que se resuelve más adelante.
- Divide en 5-8 secciones con un "heading" corto (serán los capítulos).
- Cada 60-90 s, un mini-gancho que renueve la curiosidad.
- Cierra con una idea memorable y una pregunta para comentarios. La última escena debe ser kind "outro".

SHORT
- Autónomo: se entiende sin ver el largo. Empieza directamente con el dato más impactante (primera frase ≤ 10 palabras).
- Termina con una frase que enlace de forma natural con el principio para que se vea en bucle.
- 5-9 escenas.

EMPAQUETADO
- 10 opciones de título (máx 60 caracteres, en español, curiosidad + claridad, sin clickbait falso, sin MAYÚSCULAS enteras) y elige la mejor en "title".
- Miniatura: 2-5 palabras que complementen al título (no lo repitan), con una palabra de énfasis.
- Descripción: 2 párrafos con palabras clave naturales, sin capítulos (se añaden solos).
- 8-15 tags.
${avoidTitles?.length ? `\nNO repitas estos temas/títulos ya publicados:\n- ${avoidTitles.slice(-60).join("\n- ")}\n` : ""}
${SCENE_SPEC}

FORMATO DE SALIDA (JSON):
{
  "topic": "...",
  "pillar": "...",
  "titleOptions": ["..."],
  "title": "...",
  "thumbnail": {"text": "...", "emphasis": "...", "kicker": "1-2 palabras"},
  "description": "...",
  "tags": ["..."],
  "sources": [{"claim": "dato", "source": "nombre de la fuente", "url": "https://..."}],
  "long": {"sections": [{"heading": "...", "scenes": [ESCENA, ...]}]},
  "short": {"title": "máx 60 caracteres", "description": "1-2 frases + 3 hashtags", "scenes": [ESCENA, ...]}
}`;

export const ideasPrompt = ({ channel, count, done, outliers }) => `Eres el estratega de contenido del canal de YouTube "${channel.name}".

Nicho: ${channel.niche}
Público: ${channel.audience}
Pilares de formato: ${channel.pillars.map((p) => `${p.id} (${p.desc})`).join("; ")}
Evitar: ${channel.avoid}

Propón ${count} ideas de vídeo nuevas. Criterios, en este orden:
1. Demanda probada: temas que ya funcionan en YouTube (en inglés o español) pero con hueco en español.
2. Un título que genere curiosidad real y una miniatura clara (piensa primero en el empaquetado; si no hay buen título, descarta la idea).
3. Se puede contar con datos verificables y visualizar con cifras, comparaciones y listas.
4. Perenne (sigue interesando en 2 años) salvo que sea muy oportuno.
5. Reparte las ideas entre los pilares; no repitas ángulos.
${outliers?.length ? `\nVídeos "outlier" recientes detectados en el nicho (rinden muy por encima de su canal). Úsalos como señal de demanda, adapta el formato a otro tema ("niche bending"), no copies:\n${outliers
  .slice(0, 25)
  .map((o) => `- "${o.title}" (${o.lang ?? ""}, x${o.outlier} su media, ${o.views} vistas)`)
  .join("\n")}\n` : ""}
${done.length ? `\nYa hechos (no repetir):\n- ${done.slice(-80).join("\n- ")}\n` : ""}
Salida JSON:
{"ideas": [{"topic": "...", "pillar": "id del pilar", "angle": "qué lo hace sorprendente", "workingTitle": "...", "demand": "por qué creemos que hay demanda", "score": 1-10}]}`;
