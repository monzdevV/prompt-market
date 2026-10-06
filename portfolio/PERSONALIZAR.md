# PERSONALIZAR · mapa exacto de cambios

Rutas relativas a `kit/`. Los datos salen de `negocio.json` (aquí, «perfil»: la persona dueña del portfolio).

> **Casi todo es un solo archivo: `src/content.ts`.** Perfil, redes, proyectos, tecnologías, textos de cada sección, robot del contacto y SEO. Fuera de él solo hay que tocar las **imágenes** (`public/proyectos/`) y, si se piden, los **colores** (§6).

> **Qué no se toca:** las animaciones (`Hero.tsx`, `HeroCanvas.tsx`, `HeroHud.tsx`, `Backdrop.tsx`, `Starfield.tsx`, `SmoothScroll.tsx`), los shaders, la galería 3D (`proyectos/galeria-helice.tsx`, `ui/dna-helix.tsx`), los marcos (`ui/frames.tsx`) ni la ficha de caso (`ui/case-sheet.tsx`). Ninguno contiene datos.

---

## 0 · Lo que trae de serie es una DEMO ficticia

El kit viene con un perfil inventado, **«Alex Rivera»**, email `hola@example.com`, redes que apuntan a `example.com` y **6 proyectos ficticios** (Marea, Brújula, Nódulo, Atlas de luz, Fermento, Cuadrante) con imágenes generadas para la demo (`scripts/demo-imagenes.mjs`). No hay datos de personas ni marcas reales, pero **todo tiene que cambiarse** antes de publicar: un portfolio con proyectos inventados es engañoso.

Comprobación final (no debe salir nada salvo lo que el comprador decida conservar):

```
grep -rniE "alex|rivera|example\.com|marea|brújula|brujula|nódulo|nodulo|atlas de luz|fermento|cuadrante|valencia" src
```

## 1 · `profile` (identidad y textos)

| Campo | Demo | Dónde se ve | Regla |
|---|---|---|---|
| `name` | `"Alex Rivera"` | nombre gigante del hero, nav, «Sobre mí», pie, `<title>`, favicon (inicial) e imagen para compartir | Cualquier longitud: el tamaño se calcula solo (ver §1.1) |
| `role` | `"Diseñador y desarrollador"` | hero, «Sobre mí», `<title>`, imagen para compartir | 2-4 palabras |
| `statement` | «Diseño y construyo interfaces que se recuerdan.» | frase al aterrizar la estrella, imagen para compartir | 5-8 palabras. **Las dos últimas** salen en degradado |
| `about` | 2 frases con `*marcas*` | «Sobre mí», revelado palabra a palabra | 2-3 frases; `*así*` = cursiva con degradado (máx. 3). El `*` de cierre puede ir pegado a `:` o `.` |
| `now` | «Una app de rutas a pie…» | «Sobre mí» → «Ahora» | Frase corta. `""` oculta la línea |
| `location` | `"Valencia, España"` | HUD del hero y «Sobre mí» | Ciudad o país |
| `timeZone` | `"Europe/Madrid"` | reloj en vivo del HUD | Zona IANA |
| `locale` | `"es-ES"` | formato de hora y del altímetro | Locale BCP 47 |
| `available` | «Disponible para proyectos» | HUD (punto ámbar) | Su estado real |
| `verb` | `"Construyo"` | rotador «{verb} …» del hero | «Diseño», «Fotografío», «Escribo»… si no encaja |
| `builds` | 4 cosas en minúscula | rotador del hero | 3-5 cosas que encajen tras `verb` |
| `fall` | «Una idea», «Un diseño», «Algo que funciona» | las 3 frases durante la caída | 3 frases de máx. 4 palabras |
| `services` | 3 × `{ title, text }` | lista «Qué hago» | 2-5 servicios; título 2-3 palabras, texto 1 frase |
| `email` | `"hola@example.com"` | contacto (`mailto:`) | Obligatorio |

### 1.1 · Nombre largo

El hero calcula el tamaño a partir de la palabra más larga del nombre (`Hero.tsx`, `NAME_SIZE`): hasta 5 letras se ve exactamente como el diseño original (`17vw`, tope `15rem`); con más, baja en proporción para que nunca se salga, y si hay varias palabras se parten en líneas y se limita también por altura (`21svh`). Probado con «Alex» (igual que el original) y «Alexandra Montenegro» (dos líneas, sin desbordar a 375 px ni a 1440 px). No hace falta tocar nada; si prefiere el nombre de pila más grande, que ponga solo el nombre de pila.

## 2 · `socials` (redes del contacto)

Array de `{ label, href, icon, invert? }`. Se reparten en dos pilas laterales (posiciones impares a la izquierda, pares a la derecha) que se abren en abanico. `icon` es un PNG cuadrado de `public/social/` (hay `instagram`, `linkedin`, `tiktok`, `github`); para otra red, añade su icono cuadrado (~250 px) ahí. `invert: true` para logos negros. **`[]` quita las pilas.**

## 3 · `stack` (herramientas)

Dos filas (`[string[], string[]]`) de 4-6 palabras cortas. Se ven en la marquesina del HUD y en «Con qué trabajo». Ninguna fila puede quedar vacía.

## 4 · `contacto` (robot 3D o alternativa)

| Campo | Demo | Regla |
|---|---|---|
| `robot` | `true` | `true` carga la escena de Spline; `false` muestra la **alternativa propia**: la estrella del hero posada en dos órbitas (CSS, sin descargas, sigue un poco al ratón) |
| `escena` | robot público de un tercero en `prod.spline.design` | URL `.splinecode` de su escena (spline.design → Export → Code → React). Si falla al cargar o tarda más de 20 s, se muestra la alternativa sola |

## 5 · `site` (SEO) y `textos` (interfaz)

`site`:

| Campo | Demo | Regla |
|---|---|---|
| `url` | `""` | Dominio definitivo sin barra final. Vacío: en Vercel se usa la URL de producción del proyecto (`VERCEL_PROJECT_PRODUCTION_URL`) |
| `lang`, `ogLocale` | `"es"`, `"es_ES"` | idioma del `<html>` y de Open Graph |
| `title` | `""` | `""` = «{name} — {role}» |
| `description` | frase de demo | ~150 caracteres. `""` = `statement` |
| `keywords` | 5 palabras | opcional |
| `twitter` | `""` | `@usuario` o vacío |

Con eso se generan solos: `<title>`, description, Open Graph y Twitter (`app/layout.tsx`), la **imagen para compartir** 1200×630 con nombre, rol y frase (`app/opengraph-image.tsx`) y el **favicon** y el icono de Apple con la inicial (`app/icon.tsx`, `app/apple-icon.tsx`). Las fuentes de esas imágenes están en `assets/fonts/` (OFL). Si el comprador tiene logo propio, sustituye `icon.tsx` por un `icon.svg`/`icon.png` en `src/app/`.

`textos`: todas las etiquetas de la interfaz agrupadas por sección (`nav`, `hero`, `sobreMi`, `proyectos`, `caso`, `stack`, `contacto`). Solo se tocan para traducir o cambiar el tono. `textos.proyectos.intro` es la frase de la variante Cortina: `""` la genera sola («Seis proyectos, de Marea a Cuadrante…»).

**Se calculan solos (no hay que tocarlos):** el número de proyectos en letra (1-12) y el año actual en la variante Apilado («seis proyectos, 2026»), la frase de la Cortina, los contadores de la Rejilla (y sus filtros: solo aparecen las categorías con proyectos), el carrete 01/0n y el «© año» del pie y del HUD.

## 6 · `projects` (proyectos)

Cada proyecto es un `Project`:

| Campo | Regla |
|---|---|
| `slug` | minúsculas, sin acentos, único (anclas `#caso-<slug>` y carpeta de imágenes) |
| `title` | 1-3 palabras |
| `kind` | tipo de trabajo («Web con reservas», «App móvil»…) |
| `summary` | 1 frase, máx. ~90 caracteres |
| `description` | 2-3 frases: qué es y para quién |
| `highlights` | 3-5 puntos, **sin cifras inventadas** |
| `tags` | 2-5 herramientas; la primera sale en la tarjeta 3D |
| `year`, `role` | año real y papel del comprador |
| `href` | opcional; si existe, la ficha muestra «Ver en vivo» |
| `accent` | color medio saturado (el texto encima es claro) |
| `layout` | `web` · `mobile` · `print` · `brand` (composición de portada) |
| `categoria` | `"Web" \| "Móvil" \| "Diseño"`. Para otra, añádela a `CATEGORIAS` |
| `fondo` | opcional: imagen a pantalla completa de la variante Cortina |
| `cover` | composición de portada (ver abajo) |
| `gallery` | 1-6 imágenes de la ficha del caso |

**`cover` según `layout`** (si no se cumple, cae a «web»):
- `web`: `cover[0]` escritorio (`"browser"`), `cover[1]` opcional (móvil `"phone"` o foto, se superpone en la esquina).
- `mobile`: exactamente **3** móviles (`"phone"`).
- `print`: exactamente **3** páginas (`"page"`).
- `brand`: **1** logo cuadrado (`"photo"`) sobre un halo que gira.

Las imágenes se crean con `img(ruta, ancho, alto, frame, alt, { url?, caption? })`; la ruta es relativa a `public/proyectos/`. **Ancho y alto = píxeles reales del archivo** (si no, `next/image` deforma). `url` es la dirección del navegador falso: dominio público o nada.

Número recomendado: **3 a 8**. La Hélice 3D alarga la sección `110vh` por proyecto.

## 7 · Imágenes (`public/`)

- `public/proyectos/<slug>/…`: **todas las de la demo son generadas** (`node scripts/demo-imagenes.mjs`). Al poner proyectos reales, borra `public/proyectos/*` y `scripts/demo-imagenes.mjs`.
- Formatos recomendados: escritorio 1440×900, móvil 430×932 o 945×2048, página A4 794×1122, logo cuadrado ~880, fondo 1920×1080. WebP o JPG de calidad ~80, máx. ~400 KB.
- `public/social/*.png`: iconos de redes.

## 8 · Variante de proyectos

`src/app/page.tsx`: `const variante = esVariante(proyectos) ? proyectos : "helice";`. Valores: `helice` (de serie), `apilado`, `indice`, `carrete`, `cortina`, `rejilla`. Con `?proyectos=<id>` se previsualiza otra y aparece un selector flotante. Si el comprador elige otra por defecto, cambia `"helice"`.

## 9 · Color (solo si se pide)

La paleta («ADN»: azul noche, índigo, cian y ámbar) está repartida; si se cambia, en todos estos sitios a la vez:
- `src/app/globals.css`: `@theme inline` (`--color-*`) y el degradado `.dna-text`.
- `src/components/Hero.tsx`: `tint` y degradados del cielo.
- `src/components/HeroCanvas.tsx`, `src/components/ui/dna-helix.tsx` (shaders) y `PALETTE` en `proyectos/galeria-helice.tsx`.
- `src/components/Starfield.tsx`, `src/components/ui/landed-star.tsx`.
- `src/app/opengraph-image.tsx` y `src/lib/monogram.tsx` (imagen para compartir y favicon).
- `data-bg="#050816"` en cada sección y `themeColor` en `layout.tsx`.

Comprueba que el texto `mist` sigue legible (≥ 4,5:1) sobre el fondo nuevo.

## 10 · Traducción

1. `site.lang`, `site.ogLocale`, `profile.locale`.
2. Todo `textos`.
3. Los textos de `profile` y `projects`.
4. `NUMEROS` y `contarProyectos()` del final de `content.ts` (número en letra) si el idioma no es español.

## 11 · Comprobación

```
npm run typecheck && npm run lint && npm run build
```
y el `grep` de §0.
