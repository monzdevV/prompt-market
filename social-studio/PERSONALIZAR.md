# PERSONALIZAR · mapa exacto de cambios

Rutas relativas a `kit/`. Los datos salen de `negocio.json`. Ve en orden. Los números de línea son orientativos: busca siempre el texto literal.

> **Qué no se toca:** layout, animaciones, `src/components/ui.tsx` (salvo `Logo`), la lógica de `src/lib` (cola, publicación, cifrado, sesión, planes), `src/proxy.ts`, `src/lib/db/migrations.ts`, los scripts de Python ni la forma de llamar a `claude -p` y a yt-dlp. Los identificadores internos (`MannyError`, `MannyNav`, rutas `/manny`, tablas `manny_*`, cookie `ss_session`) **no se renombran**: no se ven y cambiarlos rompe la base de datos de quien actualice.

---

## 1 · Identidad (obligatorio)

La demo está a medio renombrar: **«Manny»** es el nombre nuevo de la app y del mánager; **«easypop»** es el anterior y sigue en el logo, las páginas legales y los scripts de despliegue. Todo pasa al nombre del usuario.

| Archivo | Qué hay | Qué cambiar |
|---|---|---|
| `package.json` | `"name": "easypop"` | slug |
| `src/app/layout.tsx` ~13-21 | `applicationName`, `title` («Manny» / «%s · Manny»), `description` y `openGraph` | nombre y una descripción de una frase con su nicho, sin inventar datos |
| `src/app/opengraph-image.alt.txt` | «easypop: publica tus vídeos…» | nombre |
| `src/components/ui.tsx` ~98-108 (`Logo`) | `aria-label` y texto con `APP_NAME` (`src/lib/app-name.ts`) en `brand-text`, e icono `/brand/manny-mark.png` | nombre en `src/lib/app-name.ts`; ruta del icono |
| `src/components/site-footer.tsx` ~30 | «© {año} Manny» | nombre |
| `src/app/(auth)/layout.tsx` ~19 | rótulo «Manny» de las pantallas de acceso | nombre |
| `src/components/nav.tsx` ~9 | entrada de menú `label: "Manny"` | nombre del mánager |
| `src/lib/email-tokens.ts` ~42, ~63 | asuntos «Confirma tu email en Manny» y «Restablece tu contraseña de Manny» | nombre |
| `src/lib/team.ts` ~44, ~56-57 | mensajes de invitación «…en Manny» | nombre |
| `src/lib/legal.ts` ~13 | «el titular de Manny» | nombre |
| `src/app/(legal)/*/page.tsx` | «easypop» en `aviso-legal` (×4), `privacidad` (×4), `terminos` (×4), `cookies` y `contacto` | nombre |
| `src/lib/platforms/uploadpost.ts` ~141-144 | «Volver a Manny», `connect_title` y `connect_description` | nombre |
| `src/app/(app)/cuentas/page.tsx` ~41, ~229 | «…desde Manny» y «Volver a Manny» | nombre |
| `src/lib/social-auth.ts`, `src/components/flow-canvas.tsx`, `src/app/globals.css` | comentarios con «Manny» | nombre (opcional, no se ven) |
| `deploy/setup.sh`, `deploy/deploy.sh` | servicio, usuario y carpeta `easypop` | slug, solo si va a desplegar en un servidor |
| `.env.example` | bloque «Manny, el mánager» | nombre del mánager |

### Nombre del mánager (si es distinto del de la app)

El mánager aparece unas 70 veces en textos visibles y en las instrucciones de la IA: «Hablar con Manny», «Manny se quedó en blanco», «Eres Manny, el mánager…». Están en:
`src/app/(app)/manny/**` (chat, guiones, ideas, page, perfil, radar), `src/components/manny/*` (chat-panel ×7, profile-form ×4, idea-actions ×3, subnav ×3, new-script, reference-library, version-tabs, ideas-board), `src/app/api/manny/**` (mensajes de error) y `src/lib/manny/*` (chat ×6, scripts ×4, radar ×3, analyze, context, errors, ideas, llm, profile, remix).
→ Sustituye solo la palabra «Manny» dentro de cadenas de texto y comentarios, nunca en identificadores (`MannyError`, `MannyNav`…) ni en rutas `/manny`.

### Logos e iconos

| Archivo | Uso |
|---|---|
| `public/brand/manny-mark.png` | icono cuadrado del `Logo` y de la página de conexión de Upload-Post |
| `public/brand/manny-full.png` | marca completa (símbolo + nombre) |
| `src/app/icon.png`, `src/app/apple-icon.png` | favicon e icono de iOS |
| `src/app/opengraph-image.png` | imagen al compartir el enlace (1200×630) |
| `docs/assets/app-icon-1024.png` | icono para las revisiones de las redes  |

Todas salen de `python scripts/make-brand.py` (símbolo «M.» en Instrument Serif con el degradado de la marca; fuentes OFL en `scripts/fonts/`): cambia allí la letra, los textos de la tarjeta OG y las rutas de salida. Renombra los dos de `public/brand/` a `<slug>-mark.png` y `<slug>-full.png` y actualiza las rutas (`ui.tsx` y `uploadpost.ts`). La ruta tiene que seguir cumpliendo `^/brand/[a-z0-9-]+\.(png|svg|jpg)$` (`src/proxy.ts`), o el proxy la bloqueará.

## 2 · Color (solo si el usuario lo cambia)

Tema «estudio nocturno» en `src/app/globals.css` (`:root`, ~8-44). Es siempre oscuro.
- `--accent` → nuevo acento (texto y bordes sobre grafito). Contraste ≥ 4,5:1 sobre `--bg #0b0d0e` y `--surface #131618`.
- `--accent-strong` → versión oscura del acento, que lleva **texto blanco** encima: contraste ≥ 4,5:1 con `#ffffff`.
- `--accent-soft` y `--ring` → el acento con alfa 0.09 y 0.45.
- `--brand` y `--brand-v` → degradado acento → color intermedio → `#ffe14d`. Mantén el amarillo final: es el color de subtítulo de la marca.
- `body` (~80-85) → el primer `radial-gradient` usa el acento en RGB con alfa 0.05.
- `src/components/flow-canvas.tsx` → colores de las estelas de la animación de acceso (cian → menta → amarillo): ponlos en la misma gama.
- No toques `--ok`, `--warn`, `--bad` (estados) ni `--sub` (amarillo de los ganchos).

## 3 · Idioma de la IA y zona horaria

- **Zona:** `APP_TIMEZONE` en `.env.local`. La columna `workspaces.timezone` tiene por defecto `Europe/Madrid` (migración 1); **no edites la migración**: la zona de cada espacio se cambia en Ajustes. `src/lib/sync.ts` ~38 y `src/instrumentation-node.ts` ~6 usan `Europe/Madrid` como último recurso; cámbialo si el usuario está en otra zona.
- **Idioma de los textos del estudio:** se elige en **Ajustes** de la app (idioma y tono por espacio). No hay que tocar código.
- **Idioma de Manny:** `src/lib/manny/chat.ts` ~19 («Hablas en español de España, de tú…»). Cámbialo si pidió otro idioma u otra variante. Revisa también los prompts de `ideas.ts`, `remix.ts` y `analyze.ts`, que piden textos en español.
- **Formato de números y fechas:** `es-ES` en 16 archivos. Se queda salvo que traduzcas la interfaz.
- La **interfaz** es en español. Traducirla no forma parte de esta personalización (ver la regla 5 de `PROMPT.md`).

## 4 · Nicho (si no es fitness)

Todo el contenido de partida es de fitness y gimnasio. Con otro nicho:

| Archivo | Qué hay | Qué hacer |
|---|---|---|
| `src/lib/manny/chat.ts` ~16-29 (`SYSTEM`) | «…creador de contenido de fitness», normas de TikTok para fitness y «no eres médico ni nutricionista» | su nicho; sus límites (`negocio.json.limites`); quita la línea médica si no aplica |
| `src/lib/manny/context.ts` ~11-33 (`PLAYBOOK`) | formatos virales de fitness con cifras verificadas, consejos de crecimiento y de directos | deja solo lo genérico (crecimiento en TikTok, gancho, palabras clave, 4 h entre publicaciones, directos, CapCut) y **quita las cuentas y cifras de fitness**. No pongas cifras nuevas |
| `src/lib/manny/seed-data.ts` `PLAN_SCRIPTS` | 14 guiones de la «semana 1» con día y hora | reescríbelos para su nicho con el mismo formato (`gancho` con `*palabra*`, `voz`, `planos`, `edicion`, `descripcion`, `hashtags`) y **`referencia: null`**; o déjalo en `[]` |
| `src/lib/manny/seed-data.ts` `REFERENCES` | 74 vídeos de fitness verificados el 29/09/2026 | **`[]`**. Solo se añaden vídeos que el usuario dé y que compruebes (cuenta, seguidores, visitas) |
| `src/lib/manny/radar.ts` ~389-401 `STARTER_ACCOUNTS` | 10 cuentas de TikTok de fitness | las que dé el usuario (`negocio.json.radar`) con su `grupo`, o `[]` |
| `src/lib/manny/types.ts` ~19-31 `STYLE_LABEL` | estilos de referencia («Músculo marcado», «Línea de la barra»…) | se queda si `REFERENCES` está vacío; si añades referencias, adapta los estilos |
| `src/lib/manny/plan-content.ts` | recetas de CapCut R1-R8 (R2, R3, R4, R7 son de gimnasio), `CHECKLIST`, `RULES_NO/YES`, `LIVES_*` | recetas genéricas (R1, R5, R6, R8) se quedan; las de gimnasio se adaptan o se quitan **y se quitan sus referencias en los guiones**. Reglas y directos: quita lo de fitness |
| `src/lib/manny/ideas.ts` ~21, ~44, ~81 | lugar de grabación `gym | casa | fotos | cualquier` y «normas de TikTok para fitness» | cambia `gym` por el lugar típico de su nicho **en los tres sitios** y en `WHERE` de `ideas-board.tsx` |
| `src/lib/manny/remix.ts` ~111-114 | «llévalos al gimnasio, el físico…» y «reto con un colega» | su nicho |
| `src/lib/manny/analyze.ts` ~95 | «…estas cuentas de fitness» | su nicho |
| `src/components/manny/ideas-board.tsx` ~12, ~117 | `TOPICS` (Espalda, Pierna, Mitos…) y `WHERE` | 6 temas rápidos de su nicho |
| `src/components/manny/copiar-form.tsx` ~116 | placeholder «lo grabaría con un colega» | ejemplo de su nicho |
| `src/app/(app)/manny/radar/page.tsx` ~118 | «Sigo a los mejores creadores de fitness…» | su nicho |
| `src/components/manny/radar-accounts.tsx` ~140 | «…las cuentas de fitness que salieron de la investigación» | si `STARTER_ACCOUNTS` es `[]`, quita el botón de cuentas de partida; si no, su nicho |
| `src/app/(app)/manny/biblioteca/page.tsx` ~40, ~56 | subtítulos de «fitness» y «29/09/2026» | su nicho; si `REFERENCES` es `[]`, texto neutro («Añade aquí vídeos de referencia») |
| `src/app/(app)/manny/page.tsx` ~112, ~118 | «22:00 directo» los viernes y «Plan de partida: …13:30 y 21:30…» | horario de su perfil o texto neutro |
| `src/lib/manny/profile.ts` `DEFAULT_PROFILE` | perfil de demostración de fitness | su nicho, público, tono, objetivo, ritmo, directos y límites. `nombre`, `tiktok`, `instagram` y `situacion` se quedan vacíos: los rellena él en «Mi perfil» |

Con fitness, solo cambia `DEFAULT_PROFILE` (con los datos de la entrevista) y `STARTER_ACCOUNTS` si dio otras cuentas.

## 5 · Redes

- Redes que no usa: `PUBLISH_INSTAGRAM|FACEBOOK|TIKTOK|YOUTUBE=false` en `.env.local`. X y LinkedIn dependen de Upload-Post y de `FEATURE_LINKEDIN`.
- Solo para preparar contenido: deja vacías las claves de Upload-Post, Meta, Google y TikTok. La página **Cuentas** lo explica sola.
- La landing (`src/app/page.tsx`) y `precios/page.tsx` hablan de publicar en todas las redes y de planes Pro y Business. Si solo lo usará él, no hace falta tocarlas: entra directamente por `/entrar`.

## 6 · Formato de datos que el código espera

- `PlanScript.dia`: `Lun Mar Mié Jue Vie Sáb Dom` o `null`; `hora`: `HH:MM` o `null`. En `gancho`, lo que va entre `*asteriscos*` sale en amarillo.
- `Reference.estilo`: una clave de `STYLE_LABEL`; `dificultad`: 1-3; `plataforma`: `tt | yt | ig`; `idioma`: `es | en`.
- `STARTER_ACCOUNTS.handle`: sin `@`, en minúsculas, `[A-Za-z0-9._]` en TikTok.
- Los guiones de `PLAN_SCRIPTS` se copian a la base de datos **la primera vez** que se abre Guiones en cada espacio. Si cambias la semilla después, los espacios ya creados no cambian.
- El radar marca «revienta» con ≥ 2× la mediana de la cuenta y ≥ 5.000 visitas (`src/lib/manny/radar.ts`). No lo cambies sin que el usuario lo pida.

## 7 · Datos personales retirados de la demo

El kit ya viene limpio: el perfil por defecto, las referencias a la cuenta del autor en los guiones, las menciones a su familia y a su canal de Kick, la ruta local del script del icono, el archivo de verificación de TikTok del autor (`public/tiktok*.txt`) y sus guías internas de lanzamiento y auditoría se han quitado o sustituido por datos neutros. Si el usuario tiene su propio archivo de verificación de TikTok, va en `public/` con su nombre original.

## 8 · Comprobación final

```
grep -rniE "easypop|manny|fitness|gym|gimnas|espalda|29/09" src public deploy package.json .env.example
```
Con el nombre y el nicho de la demo, solo deben salir identificadores internos (`/manny`, `MannyError`…) y el contenido de fitness. Con otro nombre u otro nicho, revisa cada resultado que sea texto visible o una instrucción para la IA. Después: `npm run typecheck && npm test && npm run build`.
