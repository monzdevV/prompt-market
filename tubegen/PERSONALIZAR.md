# PERSONALIZAR · mapa exacto de cambios

Rutas relativas a `kit/`. Los datos salen de `negocio.json`. Ve en orden. Los números de línea son orientativos: busca siempre el texto literal.

> **Qué no se toca:** la lógica del pipeline (`pipeline/lib/steps.mjs`, `render.mjs`, `tts.mjs`, `media.mjs`, `youtube.mjs`, `schedule.mjs`), el cálculo de duraciones de `src/Episode.tsx`, las animaciones de `src/lib/motion.ts` ni la maquetación de las escenas de `src/scenes.tsx`. Solo cambian el perfil del canal, los textos visibles, los prompts y, si el comprador lo pide, colores y tipografías.

> **Regla de oro:** casi todo lo del canal vive en **un único archivo**, `channels/<slug>.json`. Los demás cambios son textos fijos repartidos por el código.

---

## 1 · Perfil del canal (obligatorio)

Copia `channels/curiosidad.json` a `channels/<slug>.json` (el slug, en minúsculas y sin acentos) y **borra el original** cuando termines. Rellena:

| Campo | Valor de la demo | Qué poner |
|---|---|---|
| `id` | `"curiosidad"` | `<slug>`; tiene que coincidir con el nombre del archivo |
| `name` | `"Curiosidad Máxima"` | nombre del canal. Sale como marca de agua en todos los vídeos y en la pantalla final |
| `handle` | `"@curiosidadmaxima"` | su @ de YouTube (solo informativo) |
| `lang` | `"es"` | código ISO del idioma del canal (`es`, `en`, `pt`…). Se manda a YouTube como idioma del vídeo y de los subtítulos |
| `region` | `"ES"` | país principal (solo informativo) |
| `audience` | «Adultos de 25 a 54 años de España y Latinoamérica…» | su público en una frase, con edad, país e intereses. Indica si NO es contenido infantil |
| `niche` | «Curiosidades explicadas con datos: ciencia, cuerpo humano…» | su nicho en 1-2 frases: de qué va y qué promete cada vídeo |
| `voiceRules` | «Español neutro (entendible en España y Latinoamérica), frases cortas…» | tono y estilo del guion. Mantén «nada de relleno» y «cada frase aporta un dato» |
| `pillars` | 5 pilares: `pregunta`, `escala`, `ranking`, `historia`, `cuerpo` | de 3 a 6 formatos que roten. `id` corto sin espacios + `desc` de una frase. El pipeline los rota y `npm run stats` prioriza los que mejor funcionan |
| `seeds` | 10 búsquedas (5 en `es`, 5 en `en`) | 6-12 búsquedas de YouTube de su nicho, en su idioma y en inglés. Las usa `npm run outliers` |
| `avoid` | «Política, religión, consejos médicos…» | temas prohibidos. Si el nicho es salud o finanzas, añade «nunca consejos personalizados» |
| `long.minutes` / `maxMinutes` | `9` / `14` | duración objetivo del largo (8-12 recomendado: más de 8 min permite anuncios a mitad) |
| `short.seconds` | `45` | 30-60 (máximo 180) |
| `cadence.longPerWeek` | `2` | 1-5. Decide qué días fabrica `daily.mjs` (2 → martes y viernes) |
| `cadence.publishHourLocal` / `timezone` | `18` / `"Europe/Madrid"` | hora y zona IANA de publicación con `--schedule` |
| `voice.provider` | `"edge"` | `"edge"` (gratis) o `"elevenlabs"` |
| `voice.edgeVoice` | `"es-ES-AlvaroNeural"` | voz de edge-tts del idioma elegido (ver §4) |
| `voice.rate` | `"+6%"` | velocidad: de `-10%` a `+15%` |
| `voice.elevenVoiceId` / `elevenModel` | `""` / `"eleven_multilingual_v2"` | ID de voz de ElevenLabs si usa ese proveedor |
| `theme` | `bg #13110f`, `fg #f3ede2`, `muted #b8b0a3`, `accent #ff5b1f`, `accent2 #8fb3a4` | ver §5 |
| `youtube.categoryId` | `"27"` (Educación) | `27` Educación, `28` Ciencia y tecnología, `22` Gente y blogs, `24` Entretenimiento, `26` Consejos y estilo, `17` Deportes |
| `youtube.defaultTags` | `curiosidades`, `datos curiosos`, `ciencia`, `sabías que` | 3-6 etiquetas fijas de su nicho y su idioma |
| `youtube.privacy` | `"private"` | déjalo en `private` |
| `youtube.madeForKids` | `false` | `true` solo si el canal es para niños (y entonces cambia `audience` y `avoid`) |
| `youtube.containsSyntheticMedia` | `false` | `true` si usa imágenes o vídeos de IA realistas o voz clonada de una persona real |
| `youtube.disclosureLine` | «Guion escrito con ayuda de IA y revisado por una persona. Narración con voz sintética.» | la misma idea en su idioma, sin mencionar las fuentes: el pipeline añade «Fuentes arriba.» solo cuando las hay (ver B6 de `SPEC.md`); tradúcelo en `pipeline/lib/steps.mjs` (`disclosure`) |
| `music.volume` | `0.06` | 0.04-0.10 |
| `autoPublish` | `false` | déjalo en `false` (ver avisos de `README.md`) |

Después:

| Archivo | Qué hay | Qué cambiar |
|---|---|---|
| `.env.example` ~4 | `CHANNEL=curiosidad` | `CHANNEL=<slug>` (y en su `.env`) |
| `pipeline/lib/config.mjs` ~14 | `env("CHANNEL", "curiosidad")` | `"<slug>"` |
| `package.json` ~2 | `"name": "tubegen"` | `<slug>` (opcional) |
| `scripts/schedule.ps1` ~9-10 | tarea `"TubeGen diario"` (×3) | `"<Nombre> diario"` |
| `src/theme.ts` ~3-10 | `defaultTheme` con los colores de la demo | los mismos colores que `theme` del canal (solo afecta a la vista previa del Studio) |

## 2 · Textos fijos dentro de los vídeos

Todos salen en pantalla. Si el idioma no es español, tradúcelos todos.

| Archivo | Texto actual | Qué cambiar |
|---|---|---|
| `src/Episode.tsx` ~71 | pantalla final `"Sigue la curiosidad"` con `emphasis="curiosidad"` | claim de 2-4 palabras ligado a su marca. `emphasis` tiene que ser una de esas palabras, tal cual |
| `src/scenes.tsx` ~100 | etiqueta por defecto `` `Dato ${…}` `` | «Dato» en su idioma o una palabra de su nicho («Paso», «Clave», «Fact») |
| `src/scenes.tsx` ~141 | `toLocaleString("es-ES", …)` | locale del canal (`en-US`, `pt-BR`…): cambia el separador de miles y decimales de las cifras |
| `src/scenes.tsx` ~258 | separador `vs` de la comparación | se deja en casi todos los idiomas |
| `src/scenes.tsx` ~282 | titular por defecto del cierre `"¿Lo sabías?"` | equivalente en su idioma |
| `src/sample.ts` ~19-54 | episodio de ejemplo del pulpo y `channelName: "Curiosidad Máxima"` | nombre del canal; opcionalmente 5 escenas de muestra de su nicho (solo se ven en el Studio) |
| `src/Root.tsx` ~35 | miniatura de ejemplo «El pulpo tiene 3 corazones» / «Biología» | un ejemplo de su nicho (solo Studio) |

## 3 · Prompts internos de IA (`pipeline/lib/prompts.mjs`)

Aquí está la calidad del canal. Toman casi todo del perfil del canal, pero tienen frases fijas:

| Línea | Texto | Qué cambiar |
|---|---|---|
| ~5 (`SCENE_SPEC`) | «Escribe los números como se pronuncian… (p. ej. 'tres mil millones')» | ejemplo en su idioma |
| ~16 | `mediaQuery` «búsqueda EN INGLÉS» | se deja: Pexels busca mejor en inglés |
| ~38 | `channel.long.minutes * 155` palabras y `short.seconds * 2.6` | ritmo de locución: español 155/min y 2,6/s; inglés 150 y 2,5; portugués 150 y 2,5; francés 160 y 2,7 |
| ~41-44 | bloque «POLÍTICA DE YOUTUBE» | **no se quita**. Se puede traducir |
| ~47 | «Sin saludos ni "en este vídeo"» | equivalente en su idioma |
| ~59 | «10 opciones de título (máx 60 caracteres, **en español**…)» | su idioma |
| ~88 | «temas que ya funcionan en YouTube (en inglés o español) pero con hueco **en español**» | su idioma. Si el canal ya es en inglés: «con hueco en un ángulo nuevo» |

Si el comprador quiere otro **tono** (humor, misterio, divulgación infantil…), cámbialo en `voiceRules` del canal, no en el prompt.

**Nunca** quites de los prompts: «datos con fuente», «si no estás seguro de un dato, no lo uses», el formato JSON de salida ni los `kind` de escena. El render depende de ellos.

## 4 · Voz e idioma

- **edge-tts (gratis):** `voice.edgeVoice`. Lista completa con `edge-tts --list-voices`. Ejemplos: `es-ES-AlvaroNeural` / `es-ES-ElviraNeural` (España), `es-MX-JorgeNeural` / `es-MX-DaliaNeural` (México), `es-AR-TomasNeural` (Argentina), `en-US-AndrewNeural` / `en-US-AvaNeural`, `pt-BR-AntonioNeural`, `fr-FR-HenriNeural`. Pruébala antes con el comando de la fase 6 de `PROMPT.md`.
- **ElevenLabs:** `voice.provider: "elevenlabs"`, `voice.elevenVoiceId` y `ELEVENLABS_API_KEY` en `.env`. Si falta la clave o el ID, el pipeline vuelve en silencio a edge-tts: avísale.
- **Textos en la descripción de YouTube** (si el idioma no es español):
  - `pipeline/lib/steps.mjs` ~156 `"Fuentes:"` y ~159 `"Material visual: "`.
  - `pipeline/lib/media.mjs` ~50 `` `Vídeo: … / Pexels` `` y ~59 `` `Foto: … / Pexels` `` (también salen en pantalla, abajo a la izquierda).
  - `pipeline/upload.mjs` ~34 `"Vídeo completo: "`.
- `REVISAR.md` (`steps.mjs` ~183-214) y los logs son internos: se pueden dejar en español.
- `pipeline/lib/schedule.mjs` ~10: `timeZone = "Europe/Madrid"` es solo el valor por defecto; manda el del canal.

## 5 · Estilo visual (solo si el comprador lo cambia)

**Colores:** `theme` del canal (y `src/theme.ts`).
- `bg`: fondo, siempre muy oscuro (luminancia < 8 %). Todo el diseño está pensado sobre oscuro; un fondo claro rompe los velos de las fotos y la sombra de los subtítulos.
- `fg`: texto principal, casi blanco y algo cálido o frío según la marca. Contraste ≥ 12:1 con `bg`.
- `muted`: texto secundario, contraste ≥ 6:1 con `bg`.
- `accent`: color de marca. Se usa para palabras destacadas, cifras, subrayados, la barra de progreso, la palabra activa del subtítulo y, en la miniatura, como placa con texto `bg` encima. Contraste ≥ 4,5:1 con `bg` **y** de `bg` sobre `accent`. Calcúlalo, no a ojo.
- `accent2`: secundario frío o complementario, solo en resplandores de fondo y en el «vs». Tiene que distinguirse bien del acento.
- Los colores se escriben **siempre en `#rrggbb` de 6 cifras**: el código les añade transparencia pegando 2 cifras hex (`${theme.accent}22`). Con `#rgb`, `rgb()` u `oklch()` se rompe.

**Tipografías** (`src/lib/fonts.ts`): `display` Bricolage Grotesque 600/800 (titulares, cifras, subtítulos del Short), `text` Instrument Sans 500/700 (subtítulos del largo, listas, textos), `serif` Fraunces itálica 500/800 (citas y «vs»), `mono` JetBrains Mono 500 (etiquetas, marca de agua). Para cambiarlas, usa otra fuente de `@remotion/google-fonts` con los mismos pesos y `latin-ext` si el idioma lleva acentos o ñ. Comprueba que el titular de 150 px de la miniatura no se sale.

**Prohibido** cambiar tamaños, paddings o tiempos de animación: están ajustados para que el texto quepa en 16:9 y 9:16.

## 6 · Música

Copia los MP3 con licencia (Biblioteca de audio de YouTube, Pixabay Music…) a `assets/music/`. El pipeline elige una al azar por episodio y la pone en bucle a `music.volume`. Si la licencia pide crédito, añádelo a `disclosureLine` o a la descripción a mano.

## 7 · Ejemplo incluido

`jobs/ejemplo-nube/` es un Short ya producido (guion, 7 audios y tiempos por palabra) del canal de demo. Sirve para la prueba de render sin claves. **No se publica.** Al final de la instalación puedes borrarlo; para que la prueba salga con la marca nueva, cambia `channelName` y `theme` en `jobs/ejemplo-nube/short.json` (líneas 3-10) por los del canal.

## 8 · Comprobación final

```
grep -rniE "curiosidad|tubegen|pulpo|Sigue la|Lo sabías|es-ES|Español|en español" src pipeline channels scripts .env.example package.json
```

Solo pueden quedar: el canal si se llama así, `es-ES` si el canal es en español de España y las frases en español si el canal es en español. Después:

```
npx tsc --noEmit --incremental false
npx remotion compositions src/index.ts
```
