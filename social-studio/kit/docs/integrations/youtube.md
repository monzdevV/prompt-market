# Integración: YouTube (Google)

APIs: **YouTube Data API v3** y **YouTube Analytics API v2**. OAuth 2.0 de Google para aplicaciones web.

Código: `src/lib/platforms/youtube.ts` (conexión, renovación, subida), `src/lib/platforms/youtube-insights.ts` (analítica), `src/lib/platforms/revoke.ts` (revocación), `src/lib/sync.ts` (retención de datos).

## Conexión (OAuth)

- `https://accounts.google.com/o/oauth2/v2/auth` con `access_type=offline`, `prompt=consent`, `include_granted_scopes=true`, `state` en servidor y **PKCE S256**.
- **Autorización incremental**: al conectar solo se piden los permisos de lectura. El de subida se pide cuando el usuario pulsa «Autorizar publicación en YouTube» (`?permiso=publicar`). El servidor no deja publicar sin ese permiso.
- Los permisos concedidos (`scope` de la respuesta) se guardan: el usuario puede aceptar solo algunos.
- Renovación: `POST https://oauth2.googleapis.com/token` (`grant_type=refresh_token`). Un `400/401` marca la cuenta «Reconectar».
- **Revocación al desconectar**: `POST https://oauth2.googleapis.com/revoke` (obligatorio por las políticas de YouTube).

## Permisos (scopes)

| Scope | Función | Pantalla | Clase |
|---|---|---|---|
| `youtube.readonly` | Canal, suscriptores, vídeos y sus estadísticas | Analítica → YouTube | Sensible |
| `yt-analytics.readonly` | Métricas diarias del canal (visualizaciones, tiempo de visualización) | Analítica → YouTube | Sensible |
| `youtube.upload` | Subir vídeos (solo cuando el usuario lo autoriza) | Nueva publicación | Sensible |

(Clase según la consola de Google; confírmalo en «Acceso a datos» del proyecto.)

## Llamadas y cuota

| Dato | Llamada | Cuota |
|---|---|---|
| Canal | `channels.list?part=snippet,statistics,contentDetails&mine=true` | 1 |
| Vídeos | `playlistItems.list` de la lista de subidas (50 por página) — **no** `search.list` | 1 por página |
| Estadísticas | `videos.list?part=statistics&id=…` en lotes de 50 | 1 por lote |
| Analítica diaria | `youtubeanalytics…/v2/reports?ids=channel==MINE&dimensions=day&metrics=views,estimatedMinutesWatched,likes,comments,shares` (día de hace 3 días: los datos llegan con 48-72 h) | 1 |
| Subida | `videos.insert` reanudable (`uploadType=resumable`), consulta de estado con `bytes */tamaño`, reanuda con `308` + `Range` | Bolsa propia de 100 llamadas/día |

Una sincronización cuesta unas 3-5 unidades por canal.

## Políticas de datos de YouTube aplicadas

- Estadísticas: se conservan mientras dure la conexión (histórico diario).
- Títulos, miniaturas y demás metadatos: se refrescan en cada sincronización y **se borran si pasan 30 días sin refrescar** (`purgeStaleYoutubeMetadata`).
- Al desconectar: revocación + **borrado inmediato** de los datos leídos de YouTube.
- La política de privacidad enlaza las Condiciones de YouTube, la Política de privacidad de Google y la página de permisos de Google, e incluye el texto de «uso limitado».
- Sin métricas derivadas presentadas como de YouTube.

## Subida

Proyectos no auditados: YouTube deja los vídeos en **privado** aunque se pidan públicos. Hace falta la auditoría de cumplimiento (formulario «Audit and Quota Extension»).

## Estado

| | |
|---|---|
| Implementado según la documentación oficial | Sí (consultada el 23/09/2026) |
| Probado con la red real | **No**: pendiente de crear el proyecto en Google Cloud |
| Probado con respuestas simuladas | Canal, suscriptores ocultos, lotes de estadísticas, subida reanudable (200, 308+Range, 404) |
