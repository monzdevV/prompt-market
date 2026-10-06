# PERSONALIZAR · mapa exacto de cambios

Rutas relativas a `kit/`. Los datos salen de `negocio.json` (esquema en `negocio.ejemplo.json`). Ve en orden. Los números de línea son orientativos: busca siempre el texto literal.

> **Qué no se toca:** layout, animaciones, `src/components/ui`, la lógica de `src/lib`, `src/proxy.ts` ni las políticas RLS.
>
> **Ya es automático, no lo toques a mano:**
> - El número de centros, de ciudades, de zonas y de tarifas en letra («Tres centros», «Dos cuotas»…), y la lista de ciudades sin repetir.
> - Las columnas de los marcadores (de 1 a 4).
> - Si todos los centros están en la misma ciudad, se muestra el barrio en lugar de la ciudad.
> - La altura de la galería de instalaciones y el tamaño del rótulo gigante del pie según la longitud del nombre.
> - Los centros del login del CRM, que se leen de la base de datos.

---

## 1 · Identidad: `src/marca.ts` (obligatorio)

Un solo archivo. Cambia estos campos:

| Campo | Ejemplo plantilla | Qué poner |
|---|---|---|
| `nombre` (const de arriba) | `"Ice Gym"` | Nombre comercial. De él salen el título SEO, los aria-labels, el monograma del CRM, la regex que quita el prefijo de los centros, el texto RGPD y los alts |
| `logo` | `["ICE", "GYM"]` | Las dos partes del logotipo |
| `slug` | `"ice-gym"` | Slug corto |
| `dominio` | `"icegym.com"` | Su dominio; se usa en el placeholder del login |
| `descripcion` | «Cadena de gimnasios… Madrid, Barcelona y Valencia… sin permanencia.» | Una frase SEO **solo con datos dados**: ciudades reales y, si `permanencia` es true, nada de «sin permanencia» |
| `claveTema` / `eventoTarifa` | `"ice-tema"` / `"ice:tarifa"` | `"<slug>-tema"` / `"<slug>:tarifa"` |
| `zonaHoraria` / `locale` / `moneda` | `Europe/Madrid` / `es-ES` / `EUR` | Solo si el negocio no está en España. Cámbialo también en `supabase/01_seed_web.sql` |
| `contacto` | todo `""` | email, teléfono, whatsapp (número con prefijo), instagram/tiktok/facebook/youtube (**URL completa**). Lo que esté vacío no se ve |

Si tiene un **logo en imagen**, sustituye el interior de `src/components/marca/Logotipo.tsx` por un `<Image>` y mantén sus props y su tamaño en `em`. El rótulo gigante del pie (`Pie.tsx`) sigue siendo de texto, con `MARCA.logo`.

`package.json`: `"name"` → slug (y el mismo cambio en `package-lock.json`, en las dos primeras apariciones de `"name"`).

## 2 · Color (solo si cambia el acento)

```
node scripts/contraste.mjs --generar "#C6FF3D"
```

El script imprime un bloque listo para pegar en `src/design/tokens.ts`, con `marca.azul`, `acentoTinta` y `datoAzul` de los dos temas, las dos `rampa` y `marca-gym` de `extrasCrm`, junto con la tabla de contrastes. Pégalo y comprueba que todos los pares de texto están en ≥ 4,5:1. Si el script avisa de que el acento necesita texto blanco encima (acentos oscuros), avisa al usuario: el diseño pone texto negro sobre el acento. Hay dos salidas: elegir un acento más claro o cambiar `camposMarca.sobreCampo`.
- Si el acento es cálido (rojo o naranja), cambia también `marca.bengala` por un tono frío, porque marca las alarmas.
- **El CRM tiene su propio azul de herramienta (`temasCrm`) y no cambia.** Solo cambia `marca-gym`, que es el color del logotipo dentro del CRM. Díselo al usuario.

## 3 · Textos de las secciones

Solo los textos de negocio. Los de interfaz se quedan. Rutas desde `src/components/landing/`.

| Archivo:línea | Texto actual | Qué poner (de `negocio.json → contenido`) |
|---|---|---|
| `Portada.tsx:120` | H1 «Entrena\nen frío.» | `portadaTitulo` (2 líneas cortas) |
| `Portada.tsx:136` | «Acceso libre, clases colectivas y sin permanencia.» | `propuesta` |
| `Manifiesto.tsx:17-18` | «Abres el torno… en Madrid, Barcelona y Valencia.» | `manifiesto`. Un `*` delante de la palabra que va en color. Las ciudades están escritas a mano: pon las suyas |
| `Manifiesto.tsx:20` | `MARQUESINA` | `marquesina` |
| `Instalaciones.tsx:18` | `SALAS` (nombre, foto, texto, alt, `encuadre` opcional) | `salas`. Quita `encuadre` si las fotos son suyas |
| `Instalaciones.tsx:90` / `:94` | «Todo a mano.» / «De la polea al ciclo…» | 2.ª línea del título y subtítulo coherentes con sus salas |
| `Tarifas.tsx:108` | «Cero permanencia.» | Si hay permanencia: otra frase, por ejemplo «Tú eliges.» |
| `Tarifas.tsx:115` y `:128` | «Pagas mes a mes y te das de baja…» / «Cuotas mensuales · Sin permanencia» | Coherente con `permanencia` |
| `Cifras.tsx:80` | nota «Sin permanencia» | Si hay permanencia: «Cuota mensual» |
| `Centros.tsx:220` | «El mismo hielo.» | `tituloCentros[1]` (juego de palabras con su marca) |
| `Centros.tsx:24` / `:30` | `FOTOS` / `FOTO_POR_CODIGO` | Una foto por centro. El mapa por código es opcional: si no coincide, la foto se asigna por orden |
| `Clases.tsx:12` | `FOTO_CLASES` (foto, alt, pie «Sala de ciclo», encuadre) | Foto y pie de una de sus salas |

**Si no hay clases colectivas:** quita `<Clases />` de `src/app/page.tsx` y «Clases» de los enlaces de `Cabecera.tsx` y `Pie.tsx`. Renumera los antetítulos «05» y «06».

## 4 · Fotos

`public/landing/`: `sala-poleas.jpg` (hero y sala), `sala-peso-libre.jpg`, `sala-cardio.jpg`, `sala-ciclo.jpg`, `sala-funcional.jpg`, `fachada-frontal.jpg` y `fachada-esquina.jpg`.

⚠️ **Son fotos del gimnasio Ice Gym real:** las fachadas tienen el rótulo «ICE GYM» y algunas salas muestran marcas. **No se publican con otra marca.** Hay que sustituirlas por fotos propias, de stock con licencia libre o generadas (ver PROMPT §2, bloque 6). Formato `.jpg` horizontal de unos 2000 px como mucho, mejor nocturnas o con poca luz, porque la landing es siempre oscura. Mantén los nombres de archivo o actualiza las rutas en `SALAS`, `FOTOS`, `FOTO_CLASES` y en `Portada.tsx` (foto del hero) y `Visita.tsx` (fachada).

## 5 · Formato de datos que el código espera

- `centros.nombre` = «<Marca> <Barrio>». El prefijo se quita solo con la regex de `marca.ts`.
- `centros.horario` con el patrón **`L-V 6:30-23:30 · S-D 8:00-22:00`**. Si un tramo no aplica, se omite.
- `centros.slug`: minúsculas y sin acentos. Las 3 primeras letras forman el código del centro y no pueden repetirse.
- De 1 a 4 centros y de 1 a 4 tarifas.

## 6 · Base de datos (`supabase/`)

- `00_schema.sql`: no se toca. Se puede ejecutar más de una vez.
- `01_seed_web.sql`: tres bloques marcados `-- PERSONALIZAR`: centros, tarifas y horario semanal. En el horario, cambia los slugs de `from (values ('chamberi'),('poblenou'),('ruzafa'))`, que aparece dos veces. Revisa también el texto «Acceso a los 3 centros» de las tarifas. Se puede ejecutar más de una vez.
- `02_seed_crm.sql` (opcional, datos de ejemplo):
  - **Bloque de marca:** solo la línea `('Ice Gym', 'icegym.es', array['Chamberí','Poblenou','Ruzafa'], 'tres')`, con marca, dominio, barrios y número en letra. Todas las menciones del seed se cambian solas.
  - **Bloque de equipo:** de 1 a N filas. El seed reparte las oportunidades entre los que haya.
  - Las empresas de ejemplo «Club de Remo Poblenou», «Ruzafa Runners Club» y «Coworking La Nave Chamberí» conservan su nombre, porque su logo va ligado a él. Avisa al usuario de que son datos de ejemplo.
- Los catálogos del CRM (sectores y tipos de oportunidad, orientados a fitness) están en `src/lib/b2b.ts`. Se dejan, salvo que el negocio no sea un gimnasio.

## 7 · Comprobación final

```
grep -rniE "ice ?gym|icegym|\"ice-|\bice:|chamber|poblenou|ruzafa" src --exclude=marca.ts
npx tsc --noEmit --incremental false && npm run build
```

El grep no debe devolver nada, salvo que el negocio se llame así o tenga esos barrios. `src/marca.ts` ya llevará los valores nuevos.
