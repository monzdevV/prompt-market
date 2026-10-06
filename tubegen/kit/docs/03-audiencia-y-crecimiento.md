# Playbook: audiencia y crecimiento de un canal faceless de "cosas interesantes" (finales de 2026)

> Contexto: desarrollador español, canal sin cara sobre curiosidades, ciencia, tecnología e historia, con vídeos largos y Shorts producidos automáticamente.
> Fecha de la investigación: 29-09-2026. Las cifras de terceros (vidIQ, OutlierKit, blogs) son **estimaciones**. Se marca como **[OFICIAL]** lo que viene de YouTube o Google, y como **[EST.]** lo que es una estimación de la industria.

---

## 0. Cambios de 2025-2026 que condicionan todo lo demás

| Fecha | Cambio | Qué implica para ti |
|---|---|---|
| 15-jul-2025 | La política de "contenido repetitivo" pasa a llamarse **"contenido no auténtico"**. No se monetizan vídeos con variaciones mínimas entre sí, los producidos en masa con la misma plantilla ni los pases de diapositivas o texto sin narración ni valor educativo. **[OFICIAL]** | **Es el riesgo principal de un canal automatizado.** Cada vídeo necesita guion propio, una tesis o un ángulo, y una estructura visual que cambie. Se puede usar IA como herramienta, pero no como fábrica de plantillas. |
| 31-mar-2025 | En los Shorts, una vista cuenta desde el primer frame. La métrica antigua pasa a llamarse "engaged views" y es la que sigue contando para monetizar. **[OFICIAL]** | En Analytics hay que medir los Shorts con `engagedViews`, no con `views`. |
| Finales de 2025 | Las recomendaciones de Shorts y de vídeos largos se separan del todo. Lo que hagan los Shorts ya no hunde ni impulsa a los vídeos largos del mismo canal. **[EST., OutlierKit]** | Tener los dos formatos en el mismo canal ya no penaliza. |
| 4-feb-2026 | El **doblaje automático** llega a todos los creadores, en 27 idiomas. "Expressive Speech" en 8 idiomas, **español incluido**. **[OFICIAL]** | Un vídeo en español puede tener pista en inglés sin trabajo extra (ver §1). |
| Feb-may 2026 | La personalización del feed Explorar pasa a basarse en **clusters del historial de visionado**, y la satisfacción del espectador (encuestas, compartidos, repetición de visionado, volver al canal) sube por encima del tiempo de visualización bruto. **[EST., OutlierKit]** | Los canales de nicho enfocado ganan. Rellenar minutos ya no sirve. |
| 24-ago-2026 | **Todas** las vistas (vídeos largos, directos y Shorts) cuentan desde el primer frame. La métrica anterior pasa a llamarse "engaged view". **[OFICIAL]** | Las vistas públicas se inflan. Para comparar vídeos anteriores y posteriores a esa fecha hay que usar engaged views y el tiempo de visualización. |
| 10-ago-2026 (en vigor el **1-feb-2027**) | Los umbrales del YPP se **duplican** para canales nuevos: 1.000 suscriptores + **8.000 h** en 12 meses **o** **20 M** de vistas de Shorts en 90 días. **[OFICIAL]** | **Si consigues entrar en el YPP antes del 1-feb-2027 (4.000 h / 10 M de vistas de Shorts), entras con las reglas antiguas.** Es una fecha límite real para el plan. |
| 1-jun-2026 | En la Data API, `search.list` y `videos.insert` pasan a tener **cuotas diarias propias**, separadas del bloque de 10.000 unidades. **[OFICIAL]** | El minado de outliers (§2) ya no gasta la cuota que usas para leer estadísticas. |
| Ene-2025 / 2026 | La Reporting API ofrece **impresiones y CTR** (`channel_reach_basic_a1`). **[OFICIAL]** | El bucle automático (§6) ya puede leer el CTR sin hacer scraping de Studio. |
| 1-sep-2026 | Todd Beaupré (director de crecimiento y descubrimiento) explica que los suscriptores tienen un CTR de alrededor del 10% en su feed y que las recomendaciones se calculan para cada espectador en cada sesión. **[OFICIAL, Creator Insider]** | Los suscriptores no garantizan vistas. Cada vídeo compite por sí mismo. |

---

## 1. Idioma y mercado

### 1.1 Español frente a inglés: los números

- **CPM en español [EST., AIR Media-Tech 2025]:** España ~2,80 $, Puerto Rico 2,10, Chile 1,01, Costa Rica 0,96, México 0,91, Argentina 0,55. En EE. UU., Reino Unido, Canadá y Australia, el CPM de canales de ciencia, historia o tecnología en inglés suele ser de **3 a 6 veces** el de España (el nicho "educativo" suele estar en RPM de 4-10 $ frente a 1-2,5 $ en español).
- **Tamaño del mercado:** hay más de 600 M de hispanohablantes, y México es el centro (84 M de usuarios). El nicho de curiosidades en español está menos saturado que en inglés, en proporción a la demanda.
- **Edad:** el público de **35-65 años** es el que más pagan los anunciantes (el pico está en 35-54) **[EST., vidIQ]**. Además es el que más ve YouTube **en la TV**, que ya es la pantalla principal en EE. UU. (36% de las horas, 12,7% de todo el tiempo de TV según Nielsen, dic-2025) **[EST.]**. En TV funcionan mejor los vídeos largos de 20-60 min. La historia y la ciencia "documental" atraen de forma natural a ese público.
- **"Made for kids": marca siempre NO.** Un canal para niños tiene CPM de 1-4 $ frente a 8-20 $ del mismo contenido para adultos, sin comentarios, sin notificaciones y sin anuncios personalizados. Para evitar que el sistema o la COPPA lo clasifiquen como infantil, **no uses estética infantil** (colores de caricatura, mascotas, "datos para niños").

### 1.2 Doblaje automático: el comodín de 2026

- Un original en **español se puede doblar automáticamente al inglés** (con expressive speech) **[OFICIAL, Ayuda de YouTube]**. En el piloto, los canales con pistas dobladas sacaron **más del 25% de su tiempo de visualización** de idiomas no principales, y el canal de Jamie Oliver triplicó sus vistas.
- **Límites:** vídeos de más de 120 min, con poca voz, con voz demasiado rápida o con reclamaciones de copyright quedan fuera. Puede haber errores, así que conviene activar **"Publicar manualmente"** para revisar antes.
- Hay **miniaturas y títulos por idioma**: sube una miniatura localizada para cada pista y traduce título y descripción en Studio (Idiomas).

### 1.3 Recomendación

1. **Canal principal en español (de España, pero neutro para LATAM):** evita localismos ("guay", "vale", "tío") y el vosotros en títulos y guion. Así compites en un mercado menos saturado donde puedes ser el mejor.
2. **Activa el doblaje automático al inglés** y traduce título, descripción y miniatura. Coste marginal casi cero, y te da acceso al CPM anglosajón sin llevar dos canales.
3. **Cuando el pipeline sea estable (mes 4-6)**, plantéate un **segundo canal nativo en inglés** con los mismos guiones regenerados y voz nativa. El doblaje ayuda, pero un canal nativo en inglés posiciona mejor en búsqueda y en Explorar en inglés. Según el principio de Beaupré, "mismo público, mismo canal; público distinto, canal distinto", un idioma distinto es un público distinto.
4. **Busca un público adulto:** tono documental, temas como historia militar, ingeniería, catástrofes, misterios científicos y "cómo funciona X", sin humor juvenil. Vídeos largos de 12-25 min pensados también para la TV.

---

## 2. Cómo elegir el nicho: detección de outliers

### 2.1 Método (Paddy Galloway, 1of10 y vidIQ)

- **Un outlier es un vídeo que consigue entre 5 y 10 veces o más la media (mejor, la mediana) de vistas de su canal.** Si además el canal es **joven (menos de 90-180 días) o pequeño**, la prueba es más fuerte: demuestra que **el tema y el empaquetado** funcionan sin una audiencia previa.
- Galloway propone tres piezas: **idea con mucho potencial y poca saturación**, **empaquetado** y **un producto que cumpla lo que promete el empaquetado**. Los creadores top dedican alrededor del 30% de su tiempo a idear y empaquetar; los pequeños, el 5%.
- **"No es el nicho, es el sub-nicho que conquistas primero."** No arranques con "curiosidades" en general. Empieza por algo como "ingeniería extrema e historia de megaproyectos" o "misterios científicos sin resolver" y amplía cuando domines ese hueco.
- **Niche bending:** un nicho es la suma de formato (micro) y mercado (macro). Toma un **formato** que funciona en otro mercado ("Every X explained", "Por qué es horrible ser…", "Qué pasaría si…", la línea temporal de escala, el iceberg, el 3D) y aplícalo a tu mercado (ciencia, historia o tecnología en español). Así el formato ya está validado y el mercado es enorme.
- **Herramientas:**
  - **1of10:** outliers de 10 a 100 veces y generador de ideas. Tiene capa gratuita.
  - **vidIQ Outliers:** filtros por puntuación de outlier, VPH, tamaño del canal, fecha y formato. Además tiene keywords con volumen de búsqueda.
  - **Viewstats** (MrBeast): outliers y análisis de canales.
  - **NexLev:** orientado a nichos faceless, muestra RPM estimado y edad del canal.
  - **OutlierKit / Overseer:** alternativas.
- **Cómo verificar la demanda (hazlo todo antes de comprometerte):**
  1. Hay **al menos 5 outliers de al menos 3 canales distintos** en los últimos 60-90 días dentro del mismo cluster temático. Un solo outlier no demuestra nada.
  2. Hay al menos 2-3 **canales de menos de 6 meses** con más de 10k suscriptores en el cluster. Eso significa que el nicho aún deja entrar.
  3. Tienes al menos **50 ideas de vídeo** posibles. Si no, el nicho se agota.
  4. El RPM estimado es aceptable (NexLev o vidIQ) y **el público es adulto**.
  5. Haz la prueba en español **y** en inglés: un tema que es outlier en inglés y **no tiene cobertura en español** es oro (arbitraje de idioma).

### 2.2 Algoritmo automático con la YouTube Data API v3

**Presupuesto de cuota [OFICIAL]:** `search.list` cuesta 100 unidades y desde el 1-jun-2026 tiene su propia cuota. `videos.list`, `channels.list` y `playlistItems.list` cuestan 1 unidad por llamada, con hasta 50 IDs por llamada. La cuota por defecto es de 10.000 unidades al día.

```
ENTRADA:
  seeds = lista de consultas por sub-tema y por idioma
          (ej. "misterios científicos", "historia de la ingeniería",
           "qué pasaría si", "unsolved science mysteries", ...)
  ventana = 30 días (también 7 y 90 para ver la tendencia)
  idiomas = [("es", regionCode "ES"/"MX"/"US"), ("en", "US"/"GB")]

PASO 1: Descubrimiento (search.list, 100 u/llamada, cuota propia)
  para cada seed, idioma y duración en {medium (4-20 min), long (>20 min), short (<4 min)}:
    search.list(part=id, type=video, q=seed, order=viewCount,
                publishedAfter=now-ventana, relevanceLanguage=lang,
                regionCode=rc, videoDuration=dur, maxResults=50)
    (pagina hasta 2-3 páginas si la seed es buena)
  → conjunto V de videoIds (sin duplicados)

PASO 2: Datos de los vídeos (videos.list, 1 u por cada 50 IDs)
  videos.list(part=snippet,statistics,contentDetails, id=lote de 50)
  guarda: views, likes, comments, publishedAt, duration (ISO8601→s),
          channelId, title, tags, defaultAudioLanguage, thumbnails
  es_short = duration ≤ 180 s  (confírmalo con un HEAD a
             https://www.youtube.com/shorts/{id}: 200 = Short, 303 = vídeo normal)

PASO 3: Datos de los canales (channels.list, 1 u por cada 50 IDs)
  channels.list(part=snippet,statistics,contentDetails, id=lote de 50)
  guarda: subscriberCount (descarta hiddenSubscriberCount=true),
          videoCount, viewCount, snippet.publishedAt (edad del canal),
          contentDetails.relatedPlaylists.uploads

PASO 4: Línea base de cada canal (playlistItems + videos.list, unas 2 u por canal)
  playlistItems.list(playlistId=uploads, maxResults=50)  → últimos 50 vídeos
  videos.list(estadísticas)  → vistas de cada uno
  separa Shorts y vídeos largos (compara cada formato con su propia base)
  excluye los vídeos de menos de 7 días (aún no han madurado) y el vídeo evaluado
  baseline = MEDIANA(vistas de los últimos 10-30 vídeos del mismo formato)
             (si el canal tiene menos de 5 vídeos: baseline = max(subscriberCount*0.3, 500))

PASO 5: Métricas por vídeo
  age_h      = horas desde publishedAt
  vph        = views / age_h
  outlier    = views / baseline                  # métrica principal
  vs_ratio   = views / max(subscriberCount, 100)  # alcance fuera de los suscriptores
  ch_age_d   = días desde que se creó el canal
  eng        = (likes + 3*comments) / views
  # normaliza por edad: un vídeo de 3 días con 4x vale más que uno de 30 días con 4x
  age_factor = clamp(log(30*24) / log(max(age_h, 48)), 1, 2)

PASO 6: Filtros
  outlier ≥ 5            (vídeos largos) | ≥ 3 en Shorts (su varianza es enorme)
  views   ≥ 20k (ES) / 50k (EN) para vídeos largos; ≥ 200k para Shorts
  subscriberCount ≤ 100k  O  ch_age_d ≤ 180   (canales pequeños o nuevos)
  excluye música, gaming, noticias, "para niños" (madeForKids en status)

PASO 7: Puntuación
  score = log2(outlier) * 0.45
        + log2(vs_ratio + 1) * 0.25
        + log2(vph + 1) * 0.15 * age_factor
        + bonus_new_channel (0.15 si ch_age_d ≤ 90)
        + gap_bonus (0.2 si el tema es outlier en EN y no hay vídeo equivalente en ES
                     con más de 50k vistas en los últimos 12 meses)

PASO 8: Clustering y validación de demanda
  embedding(título + descripción[:300]) → HDBSCAN o k-means
  un LLM etiqueta cada cluster con {tema, formato, promesa del título, emoción}
  cluster válido si: nº de outliers ≥ 5, nº de canales distintos ≥ 3,
                     y ≥ 1 de esos canales tiene menos de 180 días
  prioridad_cluster = sum(score) * diversidad_canales * frescura (outliers en los últimos 14 días / total)

SALIDA: ranking de clusters (sub-nichos) y de vídeos outlier concretos, con
        título, miniatura y duración, como referencia de empaquetado.
REPETICIÓN: semanal. Guarda históricos (SQLite o Postgres) para ver si un cluster
            está subiendo (se acelera) o se está agotando.
```

**Notas:**
- Con `order=viewCount` y `publishedAfter` ya obtienes los vídeos recientes con más vistas. Con 30-50 seeds, 2 idiomas y 3 duraciones salen unas 300 llamadas a `search` (30.000 u). Si no cabe en tu cuota propia de `search`, pide ampliación (Quota Extension Form) o rota las seeds por días.
- **Usa la mediana, no la media:** un solo viral distorsiona la media.
- Añade una **lista semilla de canales competidores** (encontrados con vidIQ, 1of10 o Viewstats) y recórrelos **sin search** (uploads → videos.list). Es barato y es la fuente más fiable.
- Desde el 24-ago-2026 las vistas públicas de los vídeos largos se inflan (primer frame). Compara siempre dentro de la misma época, o usa `vs_ratio` y `outlier`, que son relativos.

---

## 3. Empaquetado: títulos, miniaturas, gancho y estructura

### 3.1 Primero el concepto, luego el título y luego la miniatura
- Galloway, Film Booth y 1of10 coinciden: **la idea y el empaquetado se deciden antes de producir.** Si no puedes imaginar una miniatura y un título irresistibles, no produzcas el vídeo. Para el pipeline: **genera 10-20 títulos por idea, puntúalos (con un LLM entrenado con los títulos outlier de §2) y descarta la idea si ninguno supera el umbral.**
- **Títulos (ES):** menos de 60 caracteres, con **curiosidad y una promesa concreta**. Patrones que funcionan en curiosidades:
  - "Por qué X [hecho contraintuitivo]"
  - "Qué pasaría si X"
  - "La verdadera razón de X"
  - "El [objeto] más [superlativo] del mundo"
  - "Nadie sabe por qué X"
  - "Cómo X cambió Y para siempre"
  - Números concretos ("11.000 metros bajo el mar…")
  - Evita el clickbait que el vídeo no cumple: la satisfacción es la señal principal en 2026.
- **Miniaturas:** **un solo foco visual** y un máximo de 3 palabras (que **no repitan** el título, sino que lo complementen). Alto contraste, objeto o escena reconocible, tamaño o escala extremos, "algo raro" en el encuadre. Tienen que leerse a 160 px (móvil) **y quedar bien en una TV**. Desde sep-2026 la API admite miniaturas de hasta 50 MB y 4K.
- **Test & Compare [OFICIAL]:** hasta **3 variantes** de título, de miniatura o de ambos. YouTube las reparte a partes iguales durante **hasta 2 semanas** y el ganador se decide por **watch time share** (tiempo de visualización por impresión), no por CTR. Si no hay ganador claro, se queda con la **primera** variante, así que **sube primero tu favorita**. Úsalo en **todos** los vídeos largos. Con poco tráfico el test no concluye, pero no cuesta nada. Automatízalo con 3 miniaturas generadas: una con el objeto en primer plano, otra con escala o contraste y otra con texto o pregunta.

### 3.2 Gancho (primeros 5-30 s)
Estructura en 3 fases (Film Booth y la industria):
1. **0-5 s, ruptura de patrón y confirmación del clic:** la primera frase **confirma lo que prometen el título y la miniatura** y añade algo inesperado. Sin logo, sin "hola a todos", sin "en este vídeo…".
2. **5-15 s, promesa concreta de recompensa:** qué vas a saber al final, o qué pregunta se va a resolver.
3. **15-30 s, compromiso y bucle abierto:** "pero lo más raro no es eso…". Plantea una pregunta que solo se responde más adelante.
- Lo normal es perder un 30-40% de la audiencia en los primeros 30 s. El objetivo es **retener al menos el 70% a los 30 s** en vídeos largos.
- Algunas fuentes estiman que el primer minuto pesa alrededor del 40% en la señal de satisfacción **[EST., OutlierKit]**. Aunque el número exacto sea especulativo, la conclusión es la misma: **pule los primeros 60 s más que cualquier otra parte.**

### 3.3 Estructura de retención (vídeo largo)
- **Escaleras de curiosidad:** bloques de 60-120 s, cada uno cierra un bucle y abre otro.
- **Re-hook cada 2-3 min:** un cambio visual o de ritmo más una pregunta nueva.
- **Guarda el dato más fuerte para el 60-70% del vídeo**, no para el principio ni para el final.
- **Cierre:** termina en cuanto se cumple la promesa y **enlaza de inmediato** con el siguiente vídeo (pantalla final más una frase verbal del tipo "si esto te ha volado la cabeza, lo de X es aún peor"). Ese enlace da sesión y regreso al canal.
- **Incluye 1-2 momentos pensados para compartir** (un dato que dan ganas de reenviar): los compartidos pesan mucho en satisfacción **[EST.]**.
- **Para no caer en "contenido no auténtico":** cada vídeo debe tener **voz narrativa con opinión o análisis**, fuentes, visuales variados (mapas, animaciones, material de archivo con licencia) y **no la misma plantilla idéntica**. Rota 3-5 formatos: explicación, top/lista, línea temporal, "qué pasaría si" e investigación de un misterio.

### 3.4 Duración
- **Vídeo largo:** **10-20 min** es el punto óptimo para curiosidades y ciencia (monetiza mid-rolls desde 8 min). Para historia documental orientada a TV y a mayores de 35, de **20 a 40 min**. **No rellenes:** en 2026 la duración por sí sola no da ventaja. Hazlo tan largo como la historia lo pida y ni un segundo más.
- **Shorts:** el máximo es **3 min**, pero los datos siguen favoreciendo **30-60 s**. Con 15-30 s se consigue la mayor retención (más del 80%), y los de 1-3 min retienen menos. Objetivo: **APV (porcentaje medio visto) de al menos 80-100%**, con bucle (que el final enlace con el principio). Usa los Shorts de 60-120 s solo para historias que de verdad lo necesitan.

---

## 4. El algoritmo en 2026

### 4.1 Shorts y vídeos largos
- Tienen **sistemas de recomendación separados**. Los Shorts ya no perjudican a los vídeos largos del mismo canal **[EST., OutlierKit/vidIQ]**.
- **La conversión de Shorts a vídeos largos es baja por naturaleza.** YouTube distingue tres perfiles: espectadores que solo ven Shorts, espectadores que dependen del contexto y exploradores. Para convertirlos, la guía oficial recomienda:
  1. **Related Video:** enlaza cada Short a un vídeo largo **con la misma intención** (el Short "¿por qué el mar es salado?" enlaza al vídeo largo "Los océanos: 10 misterios").
  2. **CTA en los últimos 5 s**, verbal y visual.
  3. **Recompensa inmediata:** los primeros 5-10 s del vídeo largo deben tratar **exactamente** lo que prometía el Short.
- Los **Shorts no cuentan para las horas de visualización** del YPP. Si eliges la vía de los Shorts (10 M en 90 días ahora, 20 M a partir de feb-2027), el RPM de Shorts es mucho menor.
- **¿El mismo canal o uno aparte?** Beaupré: "mismo público, mismo canal; público distinto, canal distinto". Si tus Shorts son **cortes o teasers del mismo tema** para el mismo público, **usa el mismo canal**. Si los Shorts derivan hacia contenido masivo y joven de otro tipo (memes o datos sueltos virales sin relación), sepáralos: pueden llenar el canal de suscriptores que nunca verán un vídeo largo, lo que baja el CTR con suscriptores y las señales de regreso.

### 4.2 Frecuencia de publicación
- **Calidad antes que cantidad.** Beaupré dice que los suscriptores ignoran el 90% de las subidas y que el ranking se calcula para cada espectador. Publicar más no te da más de nada si cada vídeo no gana su propia competición.
- **Recomendación para un pipeline automático:**
  - **Vídeos largos: 2 por semana** en los meses 1-3 (necesitas volumen de datos para iterar). Luego **1-2 por semana**, según la retención.
  - **Shorts: 1 al día** como máximo, idealmente 5-7 a la semana. **No publiques 5-10 Shorts al día casi idénticos**: es exactamente el patrón de "producción en masa" que penaliza la política de contenido no auténtico, y además satura tu propia audiencia.
  - **Horario fijo** (mismos días y hora), para que el sistema y tus espectadores aprendan cuándo publicas.
  - **Ritmo, no ráfagas:** antes de lanzar, ten un colchón de 8-10 vídeos para no parar nunca.

### 4.3 Mejores horas (España y LATAM)
- Referencia general: los vídeos largos tienen más actividad entre las 10:00 y las 16:00 hora local, y los Shorts entre las 14:00 y las 18:00. Los días fuertes son de **miércoles a viernes**, más **sábado y domingo por la mañana** en entretenimiento **[EST., Metricool/Fanpage Karma]**.
- **Si quieres cubrir España y LATAM a la vez**, publica los vídeos largos a las **18:00-19:00 hora de España** (11:00-12:00 en México, 13:00-14:00 en Buenos Aires y Santiago). Así los pillas en la tarde de España y en el mediodía de LATAM, y el vídeo sigue "fresco" para el pico nocturno de LATAM (20-23 h local).
- Para el doblaje al inglés, esa misma hora corresponde a las 12:00-13:00 ET en EE. UU. Es razonable.
- **Regla final:** a partir del día 30, usa el informe de Studio "Cuándo están conectados tus espectadores" (o `day` y `hour` en Analytics) y publica **1-2 h antes de tu pico**.

### 4.4 SEO y metadatos
- **Título:** la keyword principal en las primeras 3-5 palabras, **sin sacrificar la curiosidad**. La búsqueda es la vía de descubrimiento más fiable para un canal a cero.
- **Descripción:** las 2 primeras líneas (unos 150 caracteres) resumen la promesa con keywords. Después, 150-300 palabras de resumen real, fuentes (dan credibilidad y demuestran originalidad), enlace a la playlist y al vídeo relacionado, y 3 hashtags relevantes (**los 3 primeros aparecen sobre el título**; no pases de 15 o YouTube ignora todos).
- **Capítulos:** marca de tiempo 00:00 más al menos 3 capítulos de 10 s o más. Ayudan en búsqueda (los "momentos clave" de Google) y en TV. Autogéneralos a partir del guion.
- **Tags:** tienen poco peso. Úsalos solo para variantes y faltas de ortografía comunes (máximo 5-10).
- **Subtítulos:** sube el SRT exacto del guion (mejor que los automáticos) y **traducciones al inglés** del título y la descripción.
- **Idioma del audio** bien configurado (`defaultAudioLanguage=es`): es necesario para que el doblaje funcione.
- **Playlists temáticas** por sub-nicho (ciencia, historia, ingeniería…) con descripción rica en keywords. Añade cada vídeo a su playlist **y** usa "reproducir playlist" en la pantalla final. Aumenta la sesión.
- **Pantallas finales:** 1 vídeo concreto (el más relacionado, **no** "el más reciente" genérico) más el botón de suscripción. Que ocupen los últimos 10-20 s, ya integradas en el guion.
- **Posts de comunidad:** úsalos 1-2 veces por semana para encuestas que **generen datos de temas** ("¿qué misterio investigo ahora?") y para teasers. Alimentan la señal de regreso al canal.

---

## 5. Crecimiento desde cero

1. **Sub-nicho claro desde el primer vídeo.** Con los clusters de historial de 2026, un canal disperso confunde al sistema. Los **primeros 10 vídeos del mismo cluster** le enseñan a quién mostrarte.
2. **Mezcla 70/30:**
   - 70% de **temas outlier validados** (§2), para explorar y descubrir.
   - 30% de **temas de búsqueda perenne** con demanda constante ("cómo funciona una central nuclear", "qué hay en el fondo del mar"). Para un canal a cero, la búsqueda es la vía más estable.
3. **Vídeos de "Browse" en las primeras 48 h:** YouTube prueba los vídeos de canales nuevos con públicos pequeños y en ventanas **más cortas que antes (días)** **[EST.]**. Por eso el empaquetado tiene que salir bueno ya en la primera versión.
4. **Arbitraje de idioma:** traduce o adapta outliers en inglés **que no existen en español**, con investigación propia y valor añadido. **Nunca** re-subas ni traduzcas literalmente el vídeo de otro: eso es contenido no auténtico o reutilizado.
5. **Shorts como radar:** publica Shorts con **la idea central de cada vídeo largo que vas a producir** y fíjate en cuáles "enganchan" (APV, compartidos, suscriptores por cada 1.000 vistas). Los ganadores se convierten en vídeos largos: es una prueba barata de temas. Enlaza siempre con Related Video.
6. **Hype** (ampliado en 2026): los espectadores pueden "hypear" vídeos de canales pequeños. Pídelo con sutileza en la comunidad cuando tengas tus primeros fans.
7. **Colaboraciones y comentarios:** comenta con valor (no spam) en canales grandes del nicho durante los primeros minutos tras su publicación. Así captas tráfico cualificado. Con más de 1.000 suscriptores, colabora con canales de tamaño parecido.
8. **Publicación cruzada en TikTok e Instagram Reels:**
   - **Sube el archivo limpio y nativo**, sin marca de agua de otra plataforma. Instagram (abr-2026) clasifica como "agregador" y **retira de las recomendaciones** a las cuentas en las que, durante 30 días, la mayoría del contenido **no es suyo**. Recortar o poner una marca de agua no lo hace original. Como el contenido **es tuyo**, puedes publicarlo, pero súbelo de forma nativa, con texto en pantalla y portada adaptados.
   - En TikTok, para curiosidades funcionan mejor los vídeos de **60-90 s o más** (el programa Creator Rewards solo paga vídeos de más de 1 min). Publica una versión de ese tipo, no el mismo corte de 30 s.
   - En Reels e Instagram busca crecer la marca y derivar a YouTube (enlace en la bio). No esperes monetizar mucho en España ahí.
   - Si automatizas todo, añade variación por plataforma: gancho reescrito, texto en pantalla y CTA distintos.
9. **Antes del 1-feb-2027:** prioriza **horas de visualización de vídeos largos** (vídeos de 15-25 min con buena retención y playlists) para acercarte a 1.000 suscriptores y 4.000 h con el umbral antiguo. Cuando se endurezca, 8.000 h es mucho para un canal nuevo.

---

## 6. Analítica y bucle de retroalimentación automático

### 6.1 Métricas clave y umbrales orientativos

| Métrica | Dónde (API) | Umbral orientativo (canal nuevo, curiosidades) |
|---|---|---|
| **CTR de impresiones** | Reporting API `channel_reach_basic_a1` → `video_thumbnail_impressions`, `video_thumbnail_impressions_ctr` | 4-6% está bien, más del 8% es excelente (depende de la fuente: la búsqueda da más CTR que Explorar) |
| **AVD** (duración media de visualización) | Analytics API `averageViewDuration` | más de 4-5 min en vídeos de 12-15 min |
| **APV** (% medio visto) | `averageViewPercentage` | Vídeo largo: más del 40-50%. Short: más del 80-100% |
| **Retención a los 30 s** | `audienceWatchRatio` con `dimensions=elapsedVideoTimeRatio`, `filters=video==ID` | más del 70% |
| **Vistas "engaged"** | `engagedViews` (sobre todo en Shorts y desde el 24-ago-2026 también en vídeos largos) | comparar con la mediana del canal |
| **Suscriptores por cada 1.000 vistas** | `subscribersGained / views * 1000` | más de 5 en vídeos largos y más de 1 en Shorts |
| **Compartidos por cada 1.000 vistas** | `shares` | señal fuerte de satisfacción |
| **Fuente de tráfico** | `dimensions=insightTrafficSourceType` (YT_SEARCH, SUBSCRIBER, RELATED_VIDEO, BROWSE (Explorar), SHORTS, END_SCREEN…) | Explorar y vídeos sugeridos al alza indican que el sistema te "entiende" |
| **Formato** | `dimensions=creatorContentType` (SHORTS / VIDEO_ON_DEMAND / LIVE_STREAM) | separa siempre los análisis |
| **Demografía y geografía** | `ageGroup`, `gender`, `country` | verificar que el público de 25-54 años y de España, México y EE. UU. crece |
| **Espectadores que vuelven** | Studio (Audiencia). La API no expone de forma fiable "nuevos frente a recurrentes", así que usa como aproximación el % de tráfico SUBSCRIBER y la conversión a suscriptor | subida mes a mes |

### 6.2 Diagnóstico (regla 2x2 clásica)
- **CTR bajo y APV alto:** el vídeo es bueno pero el empaquetado es malo. Cambia la miniatura o el título (lanza un Test & Compare o sube una variante nueva el día 3-5).
- **CTR alto y APV bajo:** el empaquetado promete algo que el vídeo no cumple, o el gancho es flojo. Revisa los primeros 30 s. **Es el peor caso para la satisfacción.**
- **Los dos bajos:** tema equivocado. Baja el peso de ese cluster.
- **Los dos altos pero pocas impresiones:** es cuestión de tiempo o el tema es demasiado nicho. Espera 7-14 días y amplía el ángulo.

### 6.3 Bucle automático (diseño)

```
DIARIO (cron):
  1. Analytics API (youtubeAnalytics.reports.query, ids=channel==MINE):
     dimensions=video, metrics=views,engagedViews,estimatedMinutesWatched,
       averageViewDuration,averageViewPercentage,subscribersGained,likes,
       comments,shares, filtros por fecha (día 1, 3, 7, 28 desde la publicación)
     + dimensions=video,insightTrafficSourceType
     + dimensions=elapsedVideoTimeRatio, filters=video==ID  (curva de retención, 100 puntos)
  2. Reporting API: descarga los informes diarios channel_reach_basic_a1 (impresiones y CTR por vídeo)
  3. Guarda en la BD: (video_id, cluster, formato, idioma, título, variante de miniatura, métricas por día)

POR VÍDEO, al día 7 (vídeo largo) o al día 3 (Short):
  rel_views = engagedViews_d7 / mediana_canal_d7 (mismo formato, últimos 10 vídeos)
  reward = 0.35*z(rel_views) + 0.25*z(APV) + 0.15*z(CTR)
         + 0.15*z(subs_por_1000) + 0.10*z(shares_por_1000)
  (z = puntuación estandarizada frente al histórico del propio canal)
  diagnóstico automático con la regla 2x2 → acción:
     CTR < p25 y APV ≥ p50 → generar 2 miniaturas o títulos nuevos y lanzar Test & Compare / thumbnails.set
     retención_30s < 60% → marcar la plantilla de gancho como "mala" en el generador de guiones
     en la curva de retención, caídas de más del 8% en 10 s → guardar el timestamp y el texto
       del guion en ese punto; alimenta un prompt de "qué NO hacer"

SEMANAL: selección de temas con un multi-armed bandit
  brazos = clusters/sub-nichos (de §2) × formato narrativo (explicación, lista, "qué pasaría si"…)
  Thompson Sampling: cada brazo tiene una Normal(μ, σ²) del reward con prior débil
  prior del brazo = score del cluster en el minado de outliers (demanda externa)
  posterior = prior + rewards observados de TUS vídeos en ese brazo
  asignación semanal: 70% de los huecos a los brazos que se muestrean más alto
                     (explotación), 20% a brazos nuevos del minado, 10% al azar
  cuando un brazo acumula 4 o más vídeos con reward < -0.5 σ, retíralo
  cuando un brazo tiene 2 o más vídeos con rel_views ≥ 3: "doble apuesta"
     (secuelas, parte 2, mismo formato en un tema adyacente)

MENSUAL:
  - recalcula la mejor hora de publicación (Analytics dimensions=day, o el informe
    de Studio de cuándo están conectados los espectadores)
  - revisa la geografía y la edad: si EE. UU./inglés supera el 20% del tiempo de
    visualización, sube la prioridad del canal nativo en inglés
  - revisa las alertas de monetización y de la política de contenido no auténtico:
    diversidad de plantillas (distancia entre guiones y visuales de los últimos 20 vídeos)
```

**Aviso importante:** el reward nunca debe optimizar solo CTR o vistas. Un sistema automático que solo maximiza CTR acaba haciendo clickbait. Eso baja la satisfacción y en 2026 hunde la distribución. El APV, los compartidos y los suscriptores por cada 1.000 vistas tienen que pesar tanto como el CTR.

---

## 7. Resumen de reglas (lista de control)

1. Canal en **español neutro**, público **adulto**, **no "made for kids"**, **doblaje automático al inglés** activado y revisado.
2. **Sub-nicho validado con outliers:** al menos 5 outliers de 5x o más, de al menos 3 canales, con al menos 1 canal de menos de 180 días, en los últimos 60-90 días.
3. **Empaquetado antes de producir:** 10-20 títulos por idea, 3 miniaturas y **Test & Compare** siempre (la favorita, primero).
4. **Gancho:** confirma el clic en 5 s, promete en 15 s y abre un bucle en 30 s. Objetivo: al menos 70% de retención a los 30 s.
5. **Vídeos largos de 10-20 min** (20-40 min para historia orientada a TV). **Shorts de 30-60 s** con bucle.
6. **Frecuencia:** 2 vídeos largos por semana y 1 Short al día como máximo, **sin plantillas idénticas**.
7. **Publicar a las 18-19 h de España** hasta tener datos propios, y después 1-2 h antes de tu pico.
8. Cada Short tiene un Related Video con la misma intención. Mismo canal mientras el público coincida.
9. **Fecha límite: el 1-feb-2027** (el umbral del YPP se duplica). Prioriza horas de visualización de vídeos largos.
10. Bucle automático: Analytics y Reporting API → reward compuesto → diagnóstico 2x2 → bandit de temas.

---

## Fuentes

**Oficiales (YouTube/Google)**
- Doblaje automático, idiomas soportados: https://support.google.com/youtube/answer/15569972?hl=en
- Test & Compare (títulos y miniaturas): https://support.google.com/youtube/answer/16391400?hl=en-GB
- Shorts de 3 minutos: https://support.google.com/youtube/answer/15424877?hl=en
- Convertir espectadores de Shorts a vídeos largos: https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/
- Políticas de monetización (contenido no auténtico): https://support.google.com/youtube/answer/1311392?hl=en
- Cambios del YPP en 2027: https://blog.youtube/news-and-events/youtube-partner-program-updates-2027-new-opportunities-earn/
- Engaged views explicado: https://blog.youtube/inside-youtube/engaged-views-youtube-explained/
- Historial de revisiones de la Data API (cuotas granulares jun-2026, miniaturas de 50 MB): https://developers.google.com/youtube/v3/revision_history
- Historial de revisiones de la Analytics/Reporting API (reach, engagedViews, vistas desde el primer frame): https://developers.google.com/youtube/analytics/revision_history
- Métricas de la Reporting API: https://developers.google.com/youtube/reporting/v1/reports/metrics
- Informes de canal de la Reporting API: https://developers.google.com/youtube/reporting/v1/reports/channel_reports
- Data API, visión general y cuotas: https://developers.google.com/youtube/v3/getting-started
- Creator Insider en X: https://x.com/YouTubeInsider/status/1847071677080809534

**Algoritmo y cambios de 2025-2026**
- Beaupré: los suscriptores ignoran el 90% de las subidas (Creator Insider, sep-2026): https://ppc.land/subscribers-skip-90-of-uploads-in-their-feed-youtube-director-says/
- Cambios confirmados del algoritmo en 2026: https://outlierkit.com/resources/youtube-algorithm-updates/
- Satisfacción del espectador en 2026: https://outlierkit.com/resources/youtube-viewer-satisfaction-algorithm-2026/
- vidIQ, algoritmo 2026: https://vidiq.com/blog/post/understanding-youtube-algorithm/
- vidIQ, vídeos largos recomendados a espectadores de Shorts: https://vidiq.com/blog/post/youtube-recommends-long-form-videos-shorts-viewers/
- Vistas de Shorts desde el 31-mar-2025: https://ppc.land/youtube-changes-how-shorts-views-are-counted-from-march-31/
- Vistas desde el primer frame (24-ago-2026): https://www.relevantaudience.com/youtube/youtube-first-frame-view-count-24-august-2026/ · https://vidiq.com/blog/post/youtube-view-count-update/
- YPP de 8.000 h: https://tbreak.com/youtube-partner-program-8000-watch-hours/ · https://www.musicbusinessworldwide.com/new-youtube-creators-will-need-8000-watch-hours-to-start-earning-from-ads-double-the-current-bar/
- Contenido no auténtico: https://ppc.land/youtube-clarifies-inauthentic-content-policy-changes/ · https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/
- Doblaje automático para todos (feb-2026): https://winbuzzer.com/2026/02/05/youtube-ai-auto-dubbing-all-creators-27-languages-xcxwbn/ · https://www.socialmediatoday.com/news/youtube-expands-auto-dubbing-to-all-creators/811375/ · https://www.bemultilingual.ca/blog/youtube-dubbing-updates
- Test & Compare de títulos: https://www.searchenginejournal.com/youtube-title-a-b-testing-rolls-out-globally-to-creators/562571/ · https://vidiq.com/blog/post/youtube-launches-new-thumbnail-testing-tool/

**Nicho, outliers y empaquetado**
- Paddy Galloway, nuevas reglas: https://www.colinandsamir.com/resources/the-new-rules-of-youtube-from-paddy-galloway
- Paddy Galloway, proceso de 12 pasos: https://passionfru.it/paddy-galloways-how-to-grow-youtube-71562/
- Paddy Galloway (podcast Creator Science): https://podcast.creatorscience.com/paddy-galloway-2/
- Film Booth, estrategia: https://1of10.com/blog/film-booths-strategy-gaining-millions-views/
- Gancho en los primeros 30 s: https://1of10.com/blog/how-to-hook-viewers-in-the-first-30-seconds-of-a-youtube-video/ · https://prepublish.ai/guides/first-30-seconds
- Herramientas de outliers: https://outlierkit.com/blog/best-youtube-outlier-finder-tools · https://vidiq.com/compare/vidiq-vs-1of10/ · https://www.overseeros.com/blog/best-youtube-outlier-finder-tools
- Niche bending: https://www.overseeros.com/blog/youtube-niche-bending-guide
- Cuotas de la API: https://outlierkit.com/resources/youtube-api-quota/ · https://dev.to/siyabuilt/youtubes-api-quota-is-10000-unitsday-heres-how-i-track-100k-videos-without-hitting-it-5d8h
- Duración de los Shorts: https://piktochart.com/blog/how-long-youtube-shorts/ · https://www.opus.pro/blog/ideal-youtube-shorts-length-format-retention

**Mercado, CPM y público**
- CPM por país e idioma: https://air.io/en/audience-growth/top-languages-to-localize-your-youtube-content-in-2025
- Factores del CPM y "made for kids": https://vidiq.com/blog/post/youtube-cpm/ · https://vidiq.com/blog/post/make-money-kids-youtube-channel/
- Demografía de los Shorts: https://www.demandsage.com/youtube-shorts-statistics/
- YouTube en la TV y público mayor: https://www.subsub.io/blog/tv-is-now-the-main-screen-for-youtube · https://adwave.com/resources/youtube-tv-viewing-share-q4-2025
- Mejores horas para publicar: https://metricool.com/best-time-to-post-on-youtube/ · https://www.fanpagekarma.com/insights/the-best-time-to-post-on-youtube/
- Originalidad en Instagram (abr-2026): https://techcrunch.com/2026/04/30/instagram-restricts-reach-of-content-aggregators-in-new-crackdown/ · https://www.tubefilter.com/2026/04/30/instagram-removes-algorithm-recommendations-repost-content-aggregator/

> Nota sobre r/NewTubers: la búsqueda no devolvió hilos concretos indexables. Las recomendaciones del subreddit (nicho claro, empaquetado y constancia) coinciden con las fuentes anteriores.
