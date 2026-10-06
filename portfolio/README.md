# Caída estelar · Portfolio personal con scroll narrativo y 3D

**Un portfolio de una sola página que se recorre como una historia: una estrella cae por un cielo nocturno mientras bajas, y tus proyectos cuelgan de una doble hélice de ADN en 3D. Lo monta tu propia IA con tus datos.**

Pegas un prompt, contestas unas 25 preguntas (nombre, frase, proyectos con sus imágenes, redes) y la IA rellena un único archivo de contenido, coloca tus imágenes, comprueba que todo compila y lo publica en Vercel.

## Qué incluye

**La página**
- Portada «la caída»: cielo con nebulosa en WebGL que sigue al ratón, una doble hélice de partículas que se deshace y una estrella cuya estela se alarga con la velocidad del scroll. Tu nombre gigante en degradado (se ajusta solo a cualquier longitud), un rotador «Construyo …», reloj en vivo, altímetro y marquesina de tecnologías
- Tres frases de tu proceso mientras cae la estrella, y tu frase principal al aterrizar
- «Sobre mí» con el texto revelándose palabra a palabra y la lista de servicios
- **Galería de proyectos en hélice 3D** (three.js): la cámara baja por la hélice y se para en cada proyecto
- 5 maquetaciones más para elegir: apilado, índice fijo, carrete horizontal, cortina y rejilla con filtros
- Ficha de cada caso a pantalla completa, con imágenes enmarcadas como navegador, móvil o página impresa
- Marquesina gigante de herramientas que acelera y cambia de sentido con el scroll
- Contacto con un robot 3D interactivo de Spline **o** una alternativa propia sin dependencias (la estrella posada en órbita), tu email y tus redes abriéndose en abanico
- SEO listo: título, descripción, Open Graph y Twitter, **imagen para compartir generada** con tu nombre y rol, y **favicon generado** con tu inicial
- Fondo que funde el color entre secciones, scroll suave con Lenis, respeta «reducir movimiento»

**Técnico:** Next.js 16, React 19, Tailwind v4, Motion, Lenis, three.js + React Three Fiber, Spline (opcional). Sin backend ni base de datos: **todo el contenido está en `src/content.ts`**, y las imágenes en `public/proyectos/`. Se despliega gratis en Vercel. Verificado: `npm ci`, `npm run typecheck`, `eslint .` y `next build` pasan.

## Qué necesitas

- Una IA. Lo ideal es un agente que toque archivos (Claude Code, Cursor, Windsurf, Codex); también vale un chat como claude.ai o ChatGPT (le pasas un archivo y te lo devuelve rellenado).
- Node.js 20 o superior y una cuenta gratis de Vercel (y de GitHub para desplegar).
- Tus datos: nombre, una frase, un párrafo sobre ti, tu email, tus redes y, sobre todo, **de 3 a 8 proyectos con imágenes**.

## Cómo se usa

1. Descomprime el paquete.
2. Abre tu IA en esa carpeta.
3. Pega el contenido de `PROMPT.md`.
4. Responde a las preguntas.

Tiempo estimado: de 20 a 45 minutos con un agente (lo que más tarda es preparar las imágenes) y de 1 a 2 horas en modo chat.

## Contenido del paquete

| Archivo | Para qué |
|---|---|
| `PROMPT.md` | El prompt maestro que pegas en tu IA |
| `PERSONALIZAR.md` | El mapa campo a campo de `content.ts` que sigue la IA |
| `SPEC.md` | La especificación completa, por si quieres reconstruirlo sin el kit |
| `kit/` | El código fuente con una demo ficticia, listo para `npm ci && npm run dev` |

## Avisos (léelos antes de comprar)

- **La demo es ficticia:** «Alex Rivera» y sus 6 proyectos son inventados y sus imágenes son composiciones generadas por un script, sin marcas reales. Sirven para ver la plantilla funcionando, no para publicarlas: hay que poner tu contenido.
- **Sin proyectos con imágenes, el portfolio luce poco**: la galería es el centro de la página. Si aún no tienes trabajos, espera a tenerlos o empieza con 3.
- **El robot del contacto es una escena pública de Spline de un tercero** que se descarga de sus servidores. Puedes usar tu propia escena o desactivarlo (`contacto.robot: false`) y queda una alternativa propia; si la escena falla o la retiran, la alternativa aparece sola.
- Es una web **pesada a propósito** (WebGL, three.js y, si lo dejas, Spline): fluida en ordenadores y móviles actuales, pero puede ir a saltos en móviles antiguos. Está pensada para impresionar en una visita, no para posicionar contenido largo en buscadores.
- Cambiar la **paleta de colores** es posible, pero está repartida en CSS y shaders: es un cambio delicado que la IA hace en varios archivos.
- El texto está en español; todas las etiquetas están agrupadas en `content.ts` para traducirlas.
- Las fuentes son de Google Fonts (licencia OFL); las copias TTF de `kit/assets/fonts/` solo se usan para generar la imagen para compartir y el favicon.
