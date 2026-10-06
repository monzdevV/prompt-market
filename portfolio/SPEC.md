# SPEC · Portfolio «Caída estelar» (una página, scroll narrativo, 3D)

Especificación para reconstruir el proyecto **sin el kit** (modo C). Si tienes `kit/`, el código manda sobre este documento.

## 1 · Producto

Portfolio personal de una sola página para un profesional creativo o técnico. Es una **historia contada con el scroll**: una estrella cae desde el cielo mientras bajas, aterriza, y la página se funde en «Sobre mí», una galería de proyectos en forma de **doble hélice de ADN en 3D**, una marquesina de tecnologías y un contacto con un **robot 3D interactivo**.

- Sin backend, sin base de datos, sin variables de entorno. Todo el contenido (perfil, redes, proyectos, tecnologías, textos de interfaz, robot y SEO) vive en un único archivo, `src/content.ts`.
- Español (España) de serie: `site.lang`, `profile.locale` y `profile.timeZone` lo controlan.
- Objetivo: que quien lo visite recuerde a la persona y le escriba un email.

## 2 · Stack y estructura

Next.js **16.3.5** (App Router, TypeScript, Turbopack), React **19.2.8**, Tailwind **v4** (`@tailwindcss/postcss`, `@theme inline`), `motion` 13 (`motion/react`), `lenis` 1.3 (scroll suave), `three` 0.186 + `@react-three/fiber` 9 + `@react-three/drei` 10 (galería 3D), WebGL a pelo para el fondo del hero, `@splinetool/react-spline` 4 + `@splinetool/runtime` 2 (robot del contacto), `lucide-react` (iconos), `clsx` + `tailwind-merge` (`cn`). Fuentes por `next/font/google`.

```
assets/fonts/              TTF (OFL) de Unbounded 800, Instrument Serif itálica y Geist Mono, solo para next/og
scripts/demo-imagenes.mjs  Genera las imágenes de los proyectos de demo (SVG → WebP con sharp)
public/proyectos/<slug>/   Imágenes de los proyectos · public/social/ iconos de redes
src/
├── app/
│   ├── layout.tsx         Fuentes (Geist, Geist Mono, Instrument Serif 400 normal+itálica, Unbounded 300/500/800), metadata completa desde content.ts (title, description, keywords, canonical, openGraph, twitter, metadataBase), viewport, <SmoothScroll>, capa .grain
│   ├── page.tsx           "/": Backdrop, Starfield, Nav, Hero, About, Proyectos(variante), Stack, Contact. Lee ?proyectos= (página dinámica)
│   ├── opengraph-image.tsx  Imagen para compartir 1200×630 (next/og): estrella, rol, nombre y statement
│   ├── icon.tsx, apple-icon.tsx  Favicon 64 px y icono de Apple 180 px: inicial del nombre (lib/monogram.tsx)
│   └── globals.css        @theme (colores y fuentes), .dna-text, .grain, keyframes, loader de hélice, reduced-motion
├── content.ts             profile, socials, stack, contacto, site, textos, projects (+ valores derivados)
├── components/
│   ├── Nav, Hero, HeroCanvas, HeroHud, DnaName, About, Stack, Contact, Backdrop, Starfield, SmoothScroll
│   ├── proyectos/         Proyectos (selector), variantes.ts, comun (Media, useCaso), galeria-helice y las 6 variantes: VarianteHelice, Work (apilado), VarianteIndice, VarianteCarrete, VarianteCortina, VarianteRejilla
│   └── ui/                dna-helix (geometría y shaders), case-sheet, frames, social-stack, splite (Spline + error boundary), landed-star (alternativa al robot), spotlight
└── lib/                   useFade.ts, utils.ts (cn), og-fonts.ts, monogram.tsx
```

Dev: `npm run dev` (puerto 3000). No hay rutas aparte de `/` (más las de imagen: `/icon`, `/apple-icon`, `/opengraph-image`). Antes de `tsc` hay que generar los tipos de rutas (`next typegen`), porque `LayoutProps` y `PageProps` son globales generados: el kit trae `npm run typecheck` para eso.

## 3 · Dirección visual

**Mundo:** cielo nocturno profundo con una nebulosa viva y una doble hélice de ADN. Cósmico pero editorial: tipografía enorme, mucho negro, luz solo donde importa. La sensación es «caer» por la página.

- **Paleta (`@theme inline`):** `--color-void #050816` (fondo), `--color-abyss #03050d`, `--color-ink #0a0f2a`, `--color-slate #141b45`, `--color-mist #e3e7ff` (texto), `--color-glow #f5f6ff`, `--color-haze #8e9ad0` (texto secundario), `--color-steel #7f8cc4`, `--color-indigo #6d6bff`, `--color-cyan / --color-neon #5ee0ff`, `--color-amber #ff9a3c` (acento cálido), `--color-ember #ffc27a`. Selección de texto: fondo ámbar, texto ink.
- **Degradado ADN (`.dna-text`):** `linear-gradient(100deg, #8f96ff 0%, #5ee0ff 28%, #ffb35c 52%, #ff8a3d 64%, #8f96ff 100%)`, `background-size 220%`, recortado al texto y animado (`dna-sweep` 9 s lineal infinito). Se usa en el nombre, en las 2 últimas palabras del statement, en las marcas `*…*` del «Sobre mí», en una de cada dos tecnologías y en «Hablemos».
- **Tipografía:** display **Unbounded 800** en MAYÚSCULAS con tracking negativo (`-0.045em`); titulares de proyecto y párrafos grandes en **Instrument Serif** (con itálicas); interfaz en **Geist**; etiquetas en **Geist Mono** 10-11 px, MAYÚSCULAS, tracking `0.2-0.35em`.
- **Textura:** capa `.grain` fija con ruido SVG `feTurbulence` al 3,5 %, sin blend mode (por rendimiento).
- **Fondo continuo:** cada sección es transparente y declara `data-bg`; `Backdrop` es una capa fija que interpola el color entre secciones mientras la siguiente sube del 80 % al 20 % de la pantalla (también `data-fg` para el color del texto, vía `--fg`).
- **Estrellas:** canvas 2D fijo con 170 estrellas deterministas (seed con `sin`), parpadeo, deriva y paralaje según el tamaño; 12 % ámbar `#ffb35c`, ~26 % índigo `#8f96ff`, el resto `#eef1ff`.
- **Movimiento:** curva `[0.22, 1, 0.36, 1]` en casi todo; hoja del caso con `[0.32, 0.72, 0, 1]`. Lenis `lerp 0.1` conducido desde el bucle de frames de Motion (`frame.update`). `MotionConfig reducedMotion="user"`; con `prefers-reduced-motion` no hay Lenis, ni marquesinas, ni chispas, ni barrido del degradado.
- **Prohibido:** tarjetas genéricas con sombra suave y radio grande en rejilla de 3, glassmorphism decorativo, emojis como iconos, frases de relleno, cifras inventadas.

## 4 · Página `/` (orden y comportamiento)

1. **Nav** (fija, `mix-blend-difference`, blanca): invisible arriba; aparece entre 120 y 420 px de scroll (opacidad y `y` de −12 a 0). Izquierda: enlaces Inicio · Sobre mí · Proyectos · Contacto (solo ≥ md) con un punto que se desliza (`layoutId`) a la sección activa (IntersectionObserver en la franja central). Centro: «{nombre} *portfolio*» en serif. Derecha: botón píldora con borde «Hablemos». Todo hace scroll suave con Lenis (1,6 s).
2. **Hero «la caída»** (`#inicio`, `h-[420vh]` con escena `sticky h-svh`). Progreso `p` de 0 a 1:
   - Al cargar: la escena se enciende (1,4 s), un haz de luz se abre arriba (`scaleX` 0,2→1), la estrella entra desde −30vh y el nombre aparece desde un desenfoque de 12 px (1,6 s).
   - Fondo: degradado radial `#1b2466 → #0e1438 → #060a1c → #03050d`, encima **HeroCanvas** (WebGL propio, 2 pasadas): nebulosa fbm con paleta índigo→cian→ámbar que sigue al ratón y sube con el scroll, más partículas: motas/bokeh con paralaje y una **doble hélice** de cuentas que cruza detrás del nombre, se construye de izquierda a derecha al cargar y se «descremallera» en chispas cuando empieza la caída. DPR ≤ 1,5 y tope de 2 Mpx; se pausa fuera de pantalla; sin WebGL queda el degradado CSS.
   - Un cono de luz cónico baja desde arriba; una **estrella** (halo radial, cruz de destellos, núcleo blanco y 9 chispas que se desprenden) cae de 10vh a 74vh con un leve zigzag; su **estela se alarga con la velocidad del scroll** (`useVelocity` + muelle). El color `--tint` pasa de `#8fdcff` a `#b7a6ff` a `#ffb35c`. Al tocar el suelo (p ≈ 0,8) hay un destello ámbar horizontal y un charco de luz cálida abajo.
   - Texto: «Hola, soy» (mono), **nombre gigante** (`.dna-text`; tamaño `min(15rem, Nvw[, 21svh])` con N = `min(17, 92 / unidades de la palabra más larga)`, donde W cuenta 1,5, M 1,15, I/J 0,5 y el resto 1; con varias palabras parte en líneas y limita por altura), rol (mono) y «{verb} *{rotador}*» en serif con las palabras de `builds` cambiando cada 2,4 s en fundido (no rota con la pestaña oculta). El nombre sube y se desvanece entre p 0,07 y 0,17.
   - Durante la caída, las 3 frases de `fall` aparecen una tras otra («01 / 03»…) en Geist enorme.
   - Al final (p 0,54-1), el **statement** aparece arriba en Unbounded light, con las dos últimas palabras en `.dna-text` 800, y se desvanece junto con la escena.
   - **HUD:** esquinas de visor; arriba «● {available}» (punto ámbar con ping), «{location} — reloj en vivo HH:MM:SS» (≥ md) y «Portfolio © año»; a la derecha un **altímetro** que baja de 1.200 m a 0 con una marca del color de la estrella; abajo una marquesina mono de tecnologías separadas por ✦ ámbar (45 s). Todo el HUD se desvanece en el primer 5-8 % del scroll. Pista «Desliza para caer» con un punto ámbar que bota.
3. **Sobre mí** (`#sobre-mi`, `-mt-[45vh]` para que suba mientras se funde el hero). Columna izquierda pegajosa con «Sobre mí» y una lista Nombre / Qué soy / Dónde / Ahora. Derecha: el texto `about` en Instrument Serif 4xl-6xl donde **cada palabra pasa de 15 % a 100 % de opacidad con el scroll**; las marcadas con `*` en itálica `.dna-text`. Debajo «Qué hago»: lista numerada 01-0n con título Unbounded y texto, separada por líneas de 1 px; todo entra con fundido simple de 1,2 s.
4. **Proyectos** (`#proyectos`). De serie, **Hélice 3D** (`VarianteHelice`): sección de `110vh × nº de proyectos` con escena `sticky`. Un canvas R3F (cargado con `dynamic`, sin SSR, precargado al estar a 150 % de distancia y montado solo al llegar) muestra una doble hélice de cuentas con brillo, bokeh y niebla; la cámara orbita y baja por la hélice **deteniéndose en cada proyecto** (función `dwell`) y sigue un poco al ratón. Cada proyecto es una tarjeta HTML (`drei <Html transform>`) de 224 px con la captura, el título en serif y «año · primera etiqueta», colgada de la hebra con un hilo y un nodo ámbar que late. La tarjeta enfocada crece y se ilumina; al pasar el ratón escala 1,07 con borde ámbar. Un clic (sin arrastre) abre la **ficha del caso**. Loader propio: dos hebras de puntos animadas en CSS y «Cargando proyectos». Rótulos «Proyectos» y «Desplázate para recorrer · Clic para abrir».
   - Textos calculados: en **apilado** el subtítulo es «{n.º en letra} proyectos, {año actual}» y en **cortina** la entradilla se genera («Seis proyectos, de {primero} a {último}. Baja para abrir cada uno.») salvo que `textos.proyectos.intro` la fije; la **rejilla** solo muestra filtros de categorías con proyectos.
   - Otras variantes (con `?proyectos=<id>` aparece un selector flotante tipo píldora con `layoutId`): **apilado** (índice con vista previa que sigue al cursor + tarjetas de caso que se apilan y oscurecen), **indice** (lista fija a la izquierda, fotos a la derecha), **carrete** (tira horizontal fijada con contador 01/0n y barra ámbar), **cortina** (cada proyecto se abre con `clip-path` desde una ventana hasta pantalla completa) y **rejilla** (filtros Todo/Web/Móvil/Diseño con contadores y anchos 7/5 alternos).
   - **Composición de portada** por tipo (`Media`): `web` = navegador + foto o móvil superpuesto; `mobile` = 3 móviles en abanico (−7°, 0°, 7°); `print` = 3 páginas giradas; `brand` = logo sobre un halo cónico que gira. Las capas se desplazan a distinta velocidad (falsa profundidad).
   - **Marcos** (`frames.tsx`): navegador (barra de 28 px, 3 puntos, URL en píldora mono), móvil (radio 2 rem con isla), página (papel `#f4efe5`, radio 3 px) y foto. Sombra común `0 28px 60px -24px rgba(0,0,0,.85)`.
   - **Ficha del caso** (`case-sheet.tsx`): portal a `<body>`, velo `#02030a/80`, hoja que sube desde abajo (0,55 s) con fondo teñido del `accent`, scroll propio (`data-lenis-prevent`), bloqueo del scroll de la página, Escape y clic fuera cierran y el foco vuelve a donde estaba. Contenido: tipo · año, título serif 6xl-8xl, descripción, Papel / Año / Con qué (etiquetas) / «Ver en vivo» si hay `href`; tira de móviles; resto de imágenes en 2 columnas con pie; «Lo que hace» con guiones del color del proyecto; «Siguiente caso» gigante que reutiliza la hoja.
5. **Con qué trabajo** (`#stack`): dos filas de tecnologías en Instrument Serif a 10-16vw, una de cada dos en itálica `.dna-text`, separadas por puntos; avanzan solas en sentidos opuestos y **aceleran y cambian de sentido con la velocidad del scroll**.
6. **Contacto** (`#contacto`, `h-[280vh]`, escena `sticky`): foco de luz que sigue al ratón (ámbar→índigo); las redes en dos pilas laterales de iconos cuadrados que **se abren en abanico** con el scroll (grises, a color al pasar el ratón, con su nombre al lado); «Contacto» y **«HABLEMOS.»** (Unbounded, punto ámbar) que crece de 0,85 a 1; el email en serif subrayado ámbar; el **robot 3D de Spline** (`contacto.escena`) entra desde abajo (opacidad y escala 1,15→1), se precarga en reposo a los 2,5 s y solo se renderiza mientras la sección se ve. **Alternativa** (`contacto.robot: false`, error de carga capturado por un error boundary o 20 s sin cargar): `LandedStar`, la estrella del hero posada (halo ámbar, cruz de destellos, núcleo blanco, chispas que se desprenden) en dos órbitas de puntos inclinadas en 3D que giran (26 s y 17 s, sentidos opuestos) sobre un charco de luz cálida; se inclina un poco hacia el puntero con un muelle; con reduce-motion queda estática. Pie: «© año {nombre}» y «Hecho con Next.js».

## 5 · Datos (`src/content.ts`)

```ts
profile: { name, role, statement, about /* con *marcas* */, now /* "" la oculta */, location, timeZone, locale,
  available, verb, builds: string[], fall: string[3], services: {title,text}[], email }
socials: { label, href, icon /* /social/x.png */, invert?: boolean }[]
stack: [string[], string[]]
contacto: { robot: boolean, escena: string /* URL .splinecode */ }
site: { url /* "" = VERCEL_PROJECT_PRODUCTION_URL */, lang, ogLocale, title /* "" = name — role */, description, keywords, twitter }
textos: { nav, hero, sobreMi, proyectos, caso, stack, contacto }   // todas las etiquetas de interfaz

type Frame = "browser" | "phone" | "page" | "photo";
type Shot = { src; width; height; alt; frame; caption?; url? };
const CATEGORIAS = ["Web", "Móvil", "Diseño"] as const;
type Project = { slug; title; kind; summary; description; highlights: string[]; tags: string[]; year; role;
  href?; accent /* hex */; layout: "web" | "mobile" | "print" | "brand"; categoria: Categoria;
  fondo?: Shot; cover: Shot[]; gallery: Shot[] };
projects: Project[]

// derivados: contarProyectos() ("seis proyectos", 1-12 en letra), año, introProyectos(), siteUrl, siteTitle, siteDescription
```
La demo trae un perfil ficticio (Alex Rivera, `hola@example.com`, redes en example.com) y 6 proyectos ficticios sin marcas reales (Marea, Brújula, Nódulo, Atlas de luz, Fermento, Cuadrante) con imágenes generadas por `scripts/demo-imagenes.mjs` en `public/proyectos/<slug>/`.

## 6 · Calidad

- Funciona a 375 px: en móvil desaparecen el altímetro, el reloj y los enlaces de la nav; las variantes horizontales pasan a listas.
- `prefers-reduced-motion` respetado en todo (sin Lenis, sin animaciones infinitas; los canvas pintan fotogramas estáticos).
- Accesible: el nombre lleva el rol en `sr-only`; cada tarjeta 3D es un `<button>` con `aria-label` y, al enfocarla con teclado, la página baja hasta ella; la ficha es `role="dialog" aria-modal`.
- Rendimiento: WebGL con DPR limitado, canvas pausados fuera de pantalla, three.js y Spline cargados bajo demanda.
- Honesto con los datos: ninguna cifra inventada; si un proyecto no tiene enlace público, no se muestra «Ver en vivo».
- SEO: title, description, canonical, Open Graph y Twitter completos; imagen para compartir y favicon generados desde el contenido.
- Robustez: el contacto funciona sin Spline (alternativa propia) y el nombre del hero no desborda con ninguna longitud.
