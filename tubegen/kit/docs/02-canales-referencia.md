# Investigación: canales faceless de "cosas interesantes" (EN + ES) — septiembre 2026

> Objetivo: mapear canales existentes que ya hacen vídeos/Shorts automatizados o semi-automatizados sobre curiosidades, ciencia, historia, tecnología/IA, visualización de datos, "¿qué pasaría si?", comparaciones y listas, con especial atención al estilo motion graphics / programático (Remotion), y derivar las 3 mejores combinaciones nicho+formato para un desarrollador español que producirá con Claude API + TTS + Remotion.
>
> **Nota de fiabilidad:** las cifras de suscriptores proceden de Social Blade / vidIQ / HypeAuditor / artículos (fechas 2026 indicadas cuando existen). Los ingresos son **estimaciones de terceros** (rangos muy amplios; Social Blade suele infraestimar, los blogs de "faceless" suelen sobreestimar). Donde pone "≈" o "(no verificado)" es aproximación del autor sin fuente directa de 2026.

---

## 1. Contexto 2025-2026 que condiciona todo

| Hecho | Detalle | Fuente |
|---|---|---|
| Política de "contenido no auténtico" (15-jul-2025) | YouTube renombra "repetitious" a "inauthentic content": vídeos "hechos con plantilla con poca o ninguna variación" o "fácilmente replicables a escala" pierden YPP. La IA no está prohibida; lo está el contenido masivo sin aporte. | [SEJ](https://www.searchenginejournal.com/youtube-targets-mass-produced-content-in-monetization-update/550337/), [SocialMediaToday](https://www.socialmediatoday.com/news/youtube-clarifies-monetization-update-inauthentic-repeated-content/752892/) |
| Carta anual de Neal Mohan (ene-2026) | El CEO usa literalmente "AI slop" y promete ampliar los sistemas anti-spam contra contenido de baja calidad repetitivo. | [Tubefilter](https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/) |
| Purga de enero 2026 | 16 canales (11 terminados, 6 vaciados), 35M suscriptores y 4.700M vistas eliminadas. Sistema "S-CTS": 50.000 clusters / 130.000 canales terminados en 6 meses. | [OutlierKit](https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/), [Fstoppers](https://fstoppers.com/artificial-intelligence/how-google-machine-terminated-130000-ai-slop-youtube-channels-six-months-903645) |
| **España, epicentro del slop** | Informe Kapwing (nov-2025): España es el país con más suscriptores a canales slop (20,2M). Los 2 mayores canales slop del mundo eran hispanohablantes: **CuentosFacinantes** (5,95M, Dragon Ball IA) e **Imperio de Jesús** (5,87M, quizzes bíblicos IA). **Ambos terminados en ene-2026.** | [Kapwing](https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/), [Infobae](https://www.infobae.com/america/agencias/2026/01/29/varios-canales-de-ia-desaparecen-de-youtube-tras-el-anuncio-de-la-plataforma-de-reducir-contenido-de-baja-calidad/) |
| Shorts pagan muy poco | Datos de 274 canales: RPM de Shorts = 3-14% del de long-form; típicamente $0,07-0,20 por 1.000 vistas. Hacen falta 11.000-34.000 vistas de Shorts para igualar 1.000 de long-form. **Educación tiene el RPM long-form más alto ($15-18)** y los canales educativos que pivotan a Shorts pierden más suscriptores. | [AIR Media-Tech](https://air.io/en/air-data-findings/youtube-shorts-rpm-vs-long-form-how-much-do-shorts-earn-in-2026) |
| RPM en español | CPM típico audiencia hispana $1,10-5,61; España RPM ≈ $3-5,5; México en Shorts ≈ $0,04. La audiencia hispana (≈270M en LATAM+España) supera a la de EE. UU. | [AIR idiomas](https://air.io/en/audience-growth/what-are-the-most-popular-languages-on-youtube), [Fluxnote](https://fluxnote.io/guides/youtube-rpm-by-country) |
| Caso real ES long-form | Canal de geopolítica en español (adaptado de temas probados en inglés): 3,3M vistas/mes → $8.600/mes (RPM ≈ $2,61). | [SaturaAI](https://saturaai.com/blog/how-to-build-spanish-faceless-youtube-channel-by-translating-proven-videos-8-6k-mo-icgf4h) |

**Conclusión de contexto:** el modelo "fábrica de slop" está bajo fuego directo y **España es precisamente el mercado vigilado**. La ventaja de un desarrollador con Remotion no es "producir más barato", sino **producir con más variación visual real y más rigor** (datos, fuentes, gráficos generados desde datos), que es justo lo que la política premia.

---

## 2. Tabla de canales (28)

### 2A. Inglés — animación/motion graphics/explicativos

| # | Canal | URL | Nicho | Formato | Subs (aprox.) | Vistas/vídeo (aprox.) | Frecuencia | Estilo visual | Ingresos estimados/mes | Por qué funciona | ¿IA/automatizado? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Zack D. Films** | [youtube.com/@zackdfilms](https://www.youtube.com/@zackdfilms) | Curiosidades, "cómo funciona", cuerpo humano | Shorts | 28,5M (sep-2026) | ~3,3M media | Diaria o casi | 3D (estilo "maniquí"), cortes rápidos, hook visual en 1 s | $64K-150K (Social Blade/vidIQ; tendencia a la baja) | Hook visual inmediato + dato "¿sabías que...?" + loop. 77.000M vistas totales | No IA; pipeline 3D industrializado y muy repetible. [Fuente](https://hypeauditor.com/youtube/UCvz84_Q0BbvZThy75mbd-Dg/) |
| 2 | **The Infographics Show** | [youtube.com/@TheInfographicsShow](https://www.youtube.com/@TheInfographicsShow) | Historia, militar, "qué pasaría si", comparaciones | Long (10-20 min) | 15,5M | 300K-1M | Diaria | 2D vectorial plano, personajes simples reutilizados | $8K-180K (rango SB); blogs dicen $100-300K | Titulares morbosos + animación barata reutilizable; >6.200 vídeos. | Equipo humano; muy "plantillable" (ideal para Remotion). [SB](https://socialblade.com/youtube/handle/theinfographicsshow) |
| 3 | **Kurzgesagt – In a Nutshell** | [youtube.com/@kurzgesagt](https://www.youtube.com/@kurzgesagt) | Ciencia, filosofía, futuro | Long + algunos Shorts | 25,6M | 5-15M | 1-2/mes | Vector flat premium, paleta firmada | $80K-250K + tienda | Calidad y rigor extremos, marca | No; estudio de ~60 personas. Referencia estética "Kurzgesagt barato". |
| 4 | **What If** (Underknown) | [youtube.com/@WhatIfScienceShow](https://www.youtube.com/@WhatIfScienceShow) | Hipotéticos científicos | Long + Shorts | 8,9M (jun-2026) | 200K-1M | Semanal+ | 3D/2D stock + animación | $15K-85K | Pregunta imposible en el título = CTR alto | Estudio; formato muy sistematizable. [CreatorDB](https://creatordb.app/creatorstats/what-if/) |
| 5 | **RealLifeLore** | [youtube.com/@RealLifeLore](https://www.youtube.com/@RealLifeLore) | Geografía, geopolítica, "por qué X" | Long | 7,9M | 1-3M | 2-4/mes | Mapas animados, datos, zooms satélite | $41K-132K | Mapas + datos = autoridad | No IA; mapas animados → replicable con Remotion + GeoJSON |
| 6 | **Fern** | [youtube.com/@fern-tv](https://www.youtube.com/@fern-tv) | Documental investigativo | Long | 4,5-5M (jun-2026) | 1-20M | 1-2/mes | 3D cinematográfico (mapas/escenas reconstruidas) | ~$80K+ | Reconstrucción 3D de sucesos de actualidad | No; mismo equipo que Hoog/Simplicissimus. [Fandom](https://youtube.fandom.com/wiki/Fern) |
| 7 | **MetaBallStudios** (creador español) | [youtube.com/@MetaBallStudios](https://www.youtube.com/@MetaBallStudios) | Comparaciones de tamaño | Long corto (3-8 min) + Shorts | 1,97M | 1-5M (554M en 239 vídeos ≈ 2,3M/vídeo) | Mensual | 3D limpio, música, **sin voz** | n/d (alto por vídeo) | Formato universal sin idioma, evergreen | No IA; formato **perfectamente programable**. [vidIQ](https://vidiq.com/youtube-stats/channel/UCQwFuQLnLocj5F7ZcmcuWYQ/) |
| 8 | **Data Is Beautiful** | [youtube.com/channel/UCZfh7M4yMPeRkgwSl52ACjg](https://www.youtube.com/channel/UCZfh7M4yMPeRkgwSl52ACjg) | Bar chart races / estadísticas | Long (3-10 min) | ~1,3M | 500K-5M | Irregular | Bar chart race, líneas temporales, sin voz | ~$200K/año citado (solo ~60 vídeos) | Datos históricos + música épica = retención | Programático (100% datos→vídeo). [Medium](https://medium.com/analytics-vidhya/making-beautiful-racing-bar-animations-for-youtube-869e55073547) |
| 9 | **Fireship** | [youtube.com/@Fireship](https://www.youtube.com/@Fireship) | Programación, noticias tech/IA | Long corto (4-8 min) + "100 seconds" | 4,25M | 500K-2M | 2-4/semana | Kinetic typography + código + memes, ritmo altísimo | $50K+ AdSense + sponsors | Densidad de info + humor + velocidad | Voz humana; guion propio; estética replicable con Remotion (y Jeff Delaney tiene vídeo sobre Remotion). [Playboard](https://playboard.co/en/channel/UCsBjURrPoezykLs9EqgamOA) |
| 10 | **ByteByteGo** | [youtube.com/@ByteByteGo](https://www.youtube.com/@ByteByteGo) | System design | Long corto (5-8 min) | ~700K+ | 100K-500K | Semanal | Diagramas animados paso a paso, iconos, flechas de flujo | n/d (monetiza libro/newsletter) | Diagramas = claridad; audiencia de alto valor | After Effects; **estilo idéntico a lo que hace Remotion con SVG**. [Blog](https://blog.bytebytego.com/p/new-system-design-youtube-channel) |
| 11 | **Primal Space** | [youtube.com/@primalspace](https://www.youtube.com/@primalspace) | Ingeniería, espacio, historia técnica | Long | ~1,9M | 500K-3M | Mensual | 3D técnico estilizado | n/d | Visualizar lo invisible (motores, cohetes) | No IA. |
| 12 | **Ridddle** | [youtube.com/@Ridddle](https://www.youtube.com/@Ridddle) | Espacio, ciencia, "qué pasaría si" | Long | 5,7M | 100K-500K | Semanal | 2D/3D + stock + voz | $5K-11K | Temas cósmicos evergreen | Semi-industrial. [Flowshorts](https://flowshorts.app/blog/best-faceless-youtube-channels) |
| 13 | **Economics Explained** | [youtube.com/@EconomicsExplained](https://www.youtube.com/@EconomicsExplained) | Economía | Long | 2,3-2,9M | 300K-1M | Semanal | Gráficos animados + mapas | $16K-91K | CPM finanzas + gráficos | Voz humana, mucho gráfico programable. [OutlierKit](https://outlierkit.com/resources/faceless-youtube-channels/) |
| 14 | **Modern MBA** | [youtube.com/@ModernMBA](https://www.youtube.com/@ModernMBA) | Negocio/empresas | Long | ~800K | 200K-1M | 2-4/mes | Slides animados + narración asistida IA | $5K-17K | CPM negocio $10-25 | Asistido por IA, reconocido. |
| 15 | **Hashem Al-Ghaili** | [youtube.com/@HashemAlGhaili](https://www.youtube.com/@HashemAlGhaili) | Ciencia/tecnología futura | Shorts + medio | ~960K | variable | Semanal | Clips + texto en pantalla + CGI | n/d | Titular "increíble" + visual | Semi. |

### 2B. Inglés — historia "para dormir" / automatizados IA (modelo Adavia)

| # | Canal | URL | Nicho | Formato | Subs | Vistas/vídeo | Frecuencia | Estilo | Ingresos | Por qué funciona | ¿IA? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 16 | **Boring History For Sleep** (red de Adavia Davis; varios clones con el mismo nombre) | [ejemplo](https://www.youtube.com/channel/UCnsonYpC4oCNTR_YQe79hzA) · [otro](https://www.youtube.com/@BoringSleepHistory) | Historia cotidiana "aburrida" para dormir | Long **3-6 h** | 400K-1M+ por canal | 50K-300K (pero 3-6 h de watch time) | 1/día o casi | Imágenes IA fijas con zoom, voz británica tipo Attenborough | Red de 5 canales: **$40-60K/mes**, margen 85-89%, ~2M vistas/día, $60/vídeo | Watch time gigantesco por usuario dormido; RPM long-form | **Sí, 100% IA**: TubeGen (Claude para guion+prompts, ElevenLabs voz). [Fortune](https://fortune.com/2025/12/30/ai-slop-faceless-youtube-accounts-adavia-davis-user-generated-content/) |
| 17 | **Sleepless Historian** | [youtube.com/@sleeplesshistorian](https://vidiq.com/youtube-stats/channel/@sleeplesshistorian/) | Historia para dormir | Long 2-4 h | 703K (jul-2026) | ~130K (41M / 320 vídeos) | Varias/semana | Imágenes IA + voz suave | n/d | Audiencia adulta 25-64 (RPM bueno) | Sí, IA. Crecimiento frenándose (+4K/mes). |
| 18 | **Sleepy Science Channel** | n/d | Documental ciencia para dormir | Long | 339K en 14 meses | n/d | n/d | Narración sobre imágenes | $13K+/mes | Mismo mecanismo que Boring History en ciencia | Sí. [Unavidaonline](https://unavidaonline.com/canal-youtube-automatizado/) |
| 19 | **Chloe VS History** (y "Time Traveller POV", "POV Lab") | [Studypal](https://studypal.my/articles/read/what-are-ai-time-travel-vlogs-the-new-history-trend/) | Historia en POV ("tu vida como...", vlog en el Titanic) | Long 10-15 min + Shorts | 15M vistas YT, 610K IG | Titanic: 4M | Semanal | Vídeo IA generativo, personaje recurrente | n/d | Inmersión en 1ª persona; personaje = autenticidad | Sí, IA generativa (tendencia documentada por The Guardian, mayo 2026). |

> Sobre el formato **"Your life as..."** (tu vida como campesino medieval, legionario romano...): es la variante narrativa en 2ª persona del "boring history" y del "time traveller POV". No encontré confirmación pública de que un canal concreto de Adavia lo use con ese título; lo documentado es que su canal estrella es "Boring History" (6 h) y que el resto de su red son Minecraft, animales, bromas, anime y famosos.

### 2C. Inglés — clips / curación

| # | Canal | URL | Nicho | Formato | Subs | Vistas/vídeo | Frec. | Estilo | Ingresos | Por qué funciona | ¿IA? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 20 | **Daily Dose Of Internet** | [youtube.com/@DailyDoseOfInternet](https://www.youtube.com/@DailyDoseOfInternet) | Clips virales curados | Medio (5-10 min) + Shorts | 20,75M (estancado) | 1-5M | 2/semana | Clip + voz breve de 1 frase | $140K-400K | Curación + voz = "contenido transformado"; licencias pagadas a autores | No IA. Estancado en 2026. |
| 21 | **WatchMojo** | [youtube.com/@WatchMojo](https://www.youtube.com/@WatchMojo) | Top 10 cultura pop | Long | ~26M | 100K-500K | Diaria | Clips + voz + rótulos | $120K-334K | Listas = SEO infinito | Industrial, humano. |

### 2D. Español (España + LATAM)

| # | Canal | URL | Nicho | Formato | Subs | Vistas/vídeo | Frec. | Estilo | Ingresos | Por qué funciona | ¿IA? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 22 | **GENIAL** (TheSoul Publishing, Bright Side ES) | [youtube.com/@GENIAL](https://www.youtube.com/@GENIAL) | Curiosidades, acertijos, "qué pasaría si" | Long + Shorts | 44,6M (may-2026) | 100K-1M | Diaria | 2D plano barato, personajes plantilla | n/d (alto por volumen) | Volumen industrial, "content farm" | Semi-industrial; el ejemplo más claro de que el formato infografía-animada funciona en ES. [Wikipedia](https://es.wikipedia.org/wiki/Genial_(canal_de_YouTube)) |
| 23 | **Doc Tops** | [youtube.com/@DocTops](https://www.youtube.com/@DocTops) | Tops de misterios/curiosidades | Long | ~15,4M | 200K-1M | Varias/semana | Voz + clips/imágenes | n/d | Formato "top" hispano clásico | Voz humana; saturado. |
| 24 | **Academia Play** | [youtube.com/@academiaplay](https://www.youtube.com/@academiaplay) | Historia | Long (10-20 min) | 3,66M | ~770K media (534M/694) | Semanal | **Videoscribe** (mano dibujando) | n/d | El mayor canal de historia en español; estilo muy barato | Humano; estilo replicable programáticamente. [SB](https://socialblade.com/youtube/channel/UCv05qOuJ6Igbe-EyQibJgwQ) |
| 25 | **QuantumFracture** | [youtube.com/@QuantumFracture](https://www.youtube.com/@QuantumFracture) | Física/ciencia | Long + Shorts | 3,95M | ~1,15M media | 2-4/mes | Animación 2D propia, humor | n/d | Rigor + humor + animación | Humano (José Luis Crespo). |
| 26 | **El Robot de Platón** | [youtube.com/@ElRobotdePlaton](https://www.youtube.com/user/ElRobotdePlaton) | Ciencia, curiosidades | Long | 3,04M | 200K-1M | Semanal | Animación + voz | n/d | Divulgación ligera | Humano. [vidIQ](https://vidiq.com/es/youtube-stats/channel/UCaVPhFg-Ax873wvhbNitsrQ/) |
| 27 | **Memorias de Pez** | [youtube.com/c/memoriasdepez](https://www.youtube.com/c/memoriasdepez) | Historia/curiosidades España | Long corto | 2,95M | 200K-1M | Irregular | Dibujo animado sencillo | n/d | Humor + temas de España | Humano. |
| 28 | **CuriosaMente** (MX) | [youtube.com/channel/UCX16cLWl6dCjlZMgUBxgGkA](https://www.youtube.com/channel/UCX16cLWl6dCjlZMgUBxgGkA) | Ciencia/cultura, preguntas | Long (4-8 min) | ≈3M (no verificado 2026) | 100K-500K | Semanal | Animación 2D + voz | n/d | Pregunta-título ("¿Por qué...?") | Humano. |
| 29 | **B - Gráficas** | [youtube.com/@BGraficas](https://www.youtube.com/@BGraficas) | Bar chart races en español | Long corto | pequeño | bajo-medio | Irregular | Bar chart race | n/d | Demuestra que **apenas hay competencia seria en dataviz en español** | Programático. |
| 30 | **CuentosFacinantes / Imperio de Jesús** (terminados) | — | Slop IA (Dragon Ball / Biblia) | Shorts/long | 5,95M / 5,87M | CuentosFacinantes 1.280M vistas | Diaria | IA generativa plantilla | Entre los mayores ingresos slop | Demuestra la **demanda hispana** de contenido IA… y el riesgo | **Sí – eliminados ene-2026.** [Kapwing](https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/) |

Otros referentes ES de IA con cara (no faceless, pero marcan el nicho): **DotCSV** (~650K) y **Xavier Mitjana** (~120K). [Awisee](https://awisee.com/es/blog/canales-youtube-ia-espana/). En español **no encontré ningún canal faceless grande de noticias de IA con motion graphics** — hueco.

### 2E. Remotion en producción (evidencia)

- **GitHub Unwrapped** (2021-2024): vídeo personalizado por usuario, 100% generado desde datos → el caso de referencia "datos → vídeo". [Remotion resources](https://www.remotion.dev/docs/resources)
- **Product Hunt Today**: vídeo diario automático con los lanzamientos del día (data-driven, programado). Misma fuente.
- Productos de "faceless videos" construidos sobre Remotion: *aicut*, *Content Studio AI*, *vidbuilder.ai*, *AnimStats* (plantillas de estadísticas), *Animatiq*. Misma fuente.
- Pipeline documentado **Remotion + TTS + Inngest + publicación multiplataforma**: 136 ciclos de render, coste ≈ $0,64-0,76/render a 500 renders/mes; lección clave: *"la QA humana de ritmo/sincronía no se puede automatizar"*. [Instavar](https://instavar.com/research/production-systems/build-ai-youtube-shorts-pipeline-2026)
- Repos open-source de "Shorts factory con Claude Code + Remotion TSX + ElevenLabs con subtítulos palabra a palabra": [GitHub topic faceless-youtube](https://github.com/topics/faceless-youtube), [video-automation](https://github.com/topics/video-automation).
- No he encontrado ningún canal grande que declare públicamente "hecho con Remotion"; los estilos más cercanos (ByteByteGo, Fireship, Data Is Beautiful, MetaBallStudios en 2D) usan After Effects/Blender/Flourish. **Es decir: el estilo está validado, la herramienta programática está infrautilizada.**

---

## 3. Patrones

### 3.1 Formatos que ganan en 2026
1. **Long-form con watch time enorme** (historia/ciencia para dormir, 2-6 h): la red de Adavia factura $40-60K/mes. Pero ya hay docenas de clones en inglés ("Sleepless Historian", "Boring History Bites", "History Before Sleep"...) y el crecimiento de los veteranos se frena (Sleepless Historian +4K subs/mes). [Genbeta](https://www.genbeta.com/inteligencia-artificial/moda-historia-aburrida-videos-automatizados-ia-estan-reescribiendo-pasado-youtube)
2. **Explicativo visual con autoridad** (mapas, datos, 3D técnico): Fern, RealLifeLore, Primal Space, Economics Explained. RPM educación $15-18 (EN).
3. **Comparaciones/visualización sin voz** (MetaBallStudios, Data Is Beautiful): universales, evergreen, pocos vídeos con muchas vistas.
4. **Shorts de curiosidad con hook visual en 1 s** (Zack D. Films): enormes en vistas pero RPM $0,07-0,20 → sirven para crecer, no para facturar.
5. **Historia POV / "tu vida como..."** (Chloe VS History, Time Traveller POV): tendencia fuerte de 2026, pero depende de vídeo generativo (caro, y es lo que más "huele" a IA).
6. **Tech/IA explicada con kinetic typography** (Fireship, ByteByteGo): CPM alto, audiencia de valor.

### 3.2 Saturado / peligroso
- **Historias de Reddit**, parkour de Minecraft/Subway Surfers en split-screen, motivación genérica, trivia de famosos, listas genéricas de herramientas IA: saturados y RPM $2-5. [ShortsFast](https://shortsfast.com/blog/saturated-faceless-youtube-niches-2026/), [Nexlev](https://www.nexlev.io/is-youtube-automation-saturated)
- **Slop IA generativo con personajes** (animales, Dragon Ball, Biblia): funcionó enorme en español y fue lo primero en caer en la purga de enero 2026.
- **Slideshows IA + voz sintética sin comentario** y **subidas diarias idénticas**: patrones citados como disparadores del S-CTS. [OutlierKit](https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/)
- **Boring History en inglés**: aún rentable, pero es la categoría más señalada por la prensa como "slop que reescribe la historia" (Genbeta, Slashdot, Reason) → riesgo reputacional y de política.

### 3.3 Huecos en español
- **Dataviz/bar chart races en español**: prácticamente vacío (B - Gráficas es pequeño). Datos de INE, Eurostat, Banco Mundial, OWID, LaLiga, etc., son públicos.
- **Historia/ciencia "para dormir" en YouTube en español**: existe como **podcast** ("Historia Aburrida para Dormir", 367 episodios) pero no encontré un canal de YouTube dominante → demanda probada en audio, hueco en vídeo.
- **Tech/IA/programación faceless con motion graphics** ("Fireship en español"): los referentes (DotCSV, Midudev, Mitjana) son con cara. Nadie hace el formato "noticia tech en 5 min con código y kinetic typography".
- **Comparaciones de escala en español con narración**: MetaBallStudios (creador español) lo hace sin voz y en inglés; nadie lo hace con narración y temas hispanos (ciudades, clubes, economías LATAM).
- **"¿Qué pasaría si...?" en español de calidad**: GENIAL lo hace barato; hay espacio para versión con rigor y datos.

### 3.4 Realidad económica del español
- RPM long-form ES ≈ $2,5-5 (España mejor que LATAM). Con 1M vistas/mes long-form ≈ $2.500-5.000/mes.
- Shorts en ES ≈ céntimos por 1.000 vistas → **usar Shorts solo como embudo**.
- Estrategia que se ha visto funcionar: **validar el tema en inglés → adaptar al español con guion nativo (no traducción literal)**. El caso de geopolítica en ES ($8,6K/mes) lo confirma.
- Ventaja estructural: Remotion permite **renderizar la misma composición en ES y EN** cambiando solo guion+voz → duplicar mercado con coste marginal casi nulo (y el inglés compensa el RPM bajo del español).

---

## 4. TOP 3 recomendaciones para un dev español (Claude API + TTS + Remotion)

### #1 — "Datos que cuentan historias": visualización de datos animada en español (y espejo en inglés)
- **Formato:** long-form 6-12 min (bar chart races narradas, mapas coropléticos animados, comparaciones de escala, "España vs X en datos", "cómo ha cambiado Y en 50 años") + 3-5 Shorts por vídeo cortados de la misma composición.
- **Evidencia:** Data Is Beautiful (~1,3M subs con ~60 vídeos, ~$200K/año), MetaBallStudios (2M subs, 2,3M vistas/vídeo con 239 vídeos), RealLifeLore (7,9M) y Economics Explained demuestran demanda; en español el hueco es casi total. GitHub Unwrapped/Product Hunt Today demuestran que es **el caso de uso nativo de Remotion** (datos → vídeo).
- **Por qué resiste la política anti-slop:** cada vídeo es único porque los datos lo son; fuentes citables (INE, Eurostat, OWID, Banco Mundial); nada de imágenes IA. Es lo contrario de "plantilla con poca variación".
- **Claude:** búsqueda/limpieza de datasets, guion con el "giro" narrativo, elección del tipo de gráfico. **TTS:** voz ES (España o neutra) — o incluso sin voz + música en algunos formatos.
- **Riesgo:** necesita buen criterio editorial (el dato tiene que sorprender). Crecimiento más lento que el slop, pero RPM educativo y evergreen.

### #2 — "Fireship en español": tech/IA/programación explicada con kinetic typography y diagramas animados
- **Formato:** vídeos de 4-8 min ("X explicado en 100 segundos", "qué ha pasado esta semana en IA", "cómo funciona por dentro Y") con código animado, diagramas tipo ByteByteGo, tipografía cinética; Shorts derivados.
- **Evidencia:** Fireship 4,25M subs, ByteByteGo 700K+, canales EN de noticias IA faceless (AI Revolution 557K, $10-32K/mes) y CPM de tech/IA $15-30 (EN). En español los referentes son con cara (DotCSV 650K) → no hay versión faceless con motion graphics. Tú eres desarrollador: tu criterio técnico es el "aporte humano" que exige YouTube, y además el propio canal es portfolio.
- **Encaje Remotion:** máximo (bloques de código con resaltado, diagramas SVG, logos, texto animado, todo en React). Claude genera también los datos de escena (JSON) para las composiciones.
- **Riesgo:** actualidad = hay que ser rápido y preciso; necesita voz con personalidad (considerar clonar tu propia voz en ElevenLabs para autenticidad).

### #3 — "Historia/ciencia para dormir" en español, pero con motion graphics y mapas en vez de imágenes IA
- **Formato:** long-form 1,5-3 h (no 6 h al principio): "Cómo era un día en la Hispania romana", "La vida en al-Ándalus", "El Universo de lo pequeño a lo grande", narración lenta, visuales suaves generados en Remotion (mapas animados de época, líneas temporales, ilustraciones vectoriales/obras de dominio público con Ken Burns, partículas).
- **Evidencia:** red de Adavia $40-60K/mes con coste $60/vídeo; Sleepy Science 339K subs/$13K mes en 14 meses; Sleepless Historian 703K. La demanda en español existe (podcast "Historia Aburrida para Dormir" con 367 episodios) pero **no hay un canal de YouTube dominante**. La historia española/latinoamericana es un tema que los canales EN no cubren.
- **Diferenciación obligatoria:** rigor (Claude con fuentes y revisión humana), visuales propios y variados (no slideshow IA idéntico), divulgar IA en la etiqueta. Es el formato más rentable por vídeo, pero **el más expuesto** a la política de "inauthentic content" y a la crítica de prensa; por eso va 3º y con estas condiciones.

### Por qué NO recomiendo
- Reddit stories / split-screen gameplay / motivación: saturados, RPM $2-5, sin ventaja para un dev.
- Slop generativo de personajes (tipo CuentosFacinantes): el mercado español ya fue purgado; riesgo de terminación de canal.
- Shorts-only: incluso con millones de vistas, en español paga céntimos; úsalos como embudo hacia el long-form.

### Recomendación operativa
1. Empezar por **#1 (dataviz ES)** y reutilizar el mismo motor para **#2**; las composiciones Remotion (gráficos, mapas, tipografía) son compartidas.
2. Publicar cada vídeo en **ES y EN** (dos canales) desde el mismo proyecto: el EN compensa el RPM hispano bajo.
3. Cadencia sostenible (2-3 long/semana + Shorts derivados), **no diaria idéntica**: variación visual real por vídeo, fuentes en la descripción, etiqueta de contenido sintético activada.
4. Presupuesto realista: 3-9 meses hasta YPP según las guías; validar con 8-10 subnichos × 2-3 vídeos durante 90 días y escalar solo lo que tenga CTR/retención.

---

## 5. Fuentes principales
- Fortune sobre Adavia Davis: https://fortune.com/2025/12/30/ai-slop-faceless-youtube-accounts-adavia-davis-user-generated-content/
- UNILAD Tech (Adavia, "fecha límite 2027"): https://www.uniladtech.com/news/ai/student-700-000-two-hour-day-ai-reveal-deadline-corporation-control-556581-20260326
- Kapwing AI Slop Report: https://www.kapwing.com/blog/ai-slop-report-the-global-rise-of-low-quality-ai-videos/
- Purga 2026: https://outlierkit.com/resources/youtube-ai-slop-crackdown-2026/ · https://www.tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans/ · https://fstoppers.com/artificial-intelligence/how-google-machine-terminated-130000-ai-slop-youtube-channels-six-months-903645
- Política inauthentic content: https://www.searchenginejournal.com/youtube-targets-mass-produced-content-in-monetization-update/550337/
- RPM Shorts vs long (274 canales): https://air.io/en/air-data-findings/youtube-shorts-rpm-vs-long-form-how-much-do-shorts-earn-in-2026
- RPM por país/idioma: https://fluxnote.io/guides/youtube-rpm-by-country · https://air.io/en/audience-growth/what-are-the-most-popular-languages-on-youtube
- Canal ES geopolítica $8,6K: https://saturaai.com/blog/how-to-build-spanish-faceless-youtube-channel-by-translating-proven-videos-8-6k-mo-icgf4h
- Ejemplos faceless con ingresos: https://outlierkit.com/resources/faceless-youtube-channels/ · https://flowshorts.app/blog/best-faceless-youtube-channels · https://unavidaonline.com/canal-youtube-automatizado/
- Boring History / crítica: https://www.genbeta.com/inteligencia-artificial/moda-historia-aburrida-videos-automatizados-ia-estan-reescribiendo-pasado-youtube · https://news.slashdot.org/story/25/09/03/2028206/ai-generated-boring-history-videos-are-flooding-youtube-drowning-out-real-history
- Time traveller POV: https://studypal.my/articles/read/what-are-ai-time-travel-vlogs-the-new-history-trend/
- Nichos saturados: https://shortsfast.com/blog/saturated-faceless-youtube-niches-2026/ · https://www.nexlev.io/is-youtube-automation-saturated
- Ciencia faceless: https://blog.autonolab.com/niches/2026-02-08-faceless-youtube-science/
- Remotion: https://www.remotion.dev/docs/resources · https://www.remotion.dev/showcase · https://instavar.com/research/production-systems/build-ai-youtube-shorts-pipeline-2026
- Stats canales: Zack D. Films https://hypeauditor.com/youtube/UCvz84_Q0BbvZThy75mbd-Dg/ · Infographics Show https://socialblade.com/youtube/handle/theinfographicsshow · MetaBallStudios https://vidiq.com/youtube-stats/channel/UCQwFuQLnLocj5F7ZcmcuWYQ/ · Fireship https://playboard.co/en/channel/UCsBjURrPoezykLs9EqgamOA · Academia Play https://socialblade.com/youtube/channel/UCv05qOuJ6Igbe-EyQibJgwQ · QuantumFracture https://socialblade.com/youtube/handle/quantumfracture · El Robot de Platón https://vidiq.com/es/youtube-stats/channel/UCaVPhFg-Ax873wvhbNitsrQ/ · GENIAL https://es.wikipedia.org/wiki/Genial_(canal_de_YouTube) · Sleepless Historian https://vidiq.com/youtube-stats/channel/@sleeplesshistorian/ · What If https://creatordb.app/creatorstats/what-if/ · Fern https://youtube.fandom.com/wiki/Fern · Daily Dose https://hypeauditor.com/youtube/UCdC0An4ZPNr_YiFiYoVbwaw/
- IA en español (con cara): https://awisee.com/es/blog/canales-youtube-ia-espana/
