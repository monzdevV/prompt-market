# Integración: Instagram y Facebook (Meta)

Producto de Meta: **API de Instagram con inicio de sesión de Facebook** (la cuenta de Instagram profesional está vinculada a una Página de Facebook) + **API de Páginas / Vídeo**. Versión de la Graph API: `META_GRAPH_VERSION` (por defecto `v25.0`).

Código: `src/lib/platforms/meta.ts` (conexión y publicación), `src/lib/platforms/meta-insights.ts` (analítica), `src/lib/meta-deletion.ts` + `src/app/api/meta/data-deletion/route.ts` (eliminación de datos).

## Conexión (OAuth)

| Paso | Llamada |
|---|---|
| Diálogo | `https://www.facebook.com/{v}/dialog/oauth?client_id&redirect_uri&response_type=code&scope&state` |
| Código → token corto | `GET graph.facebook.com/{v}/oauth/access_token?client_id&client_secret&redirect_uri&code` |
| Token largo (≈60 días) | `GET …/oauth/access_token?grant_type=fb_exchange_token&fb_exchange_token=…` |
| Id del usuario (para eliminación de datos) | `GET …/me?fields=id` |
| Permisos concedidos | `GET …/me/permissions` (se guardan; el usuario puede desmarcar algunos) |
| Páginas + Instagram vinculado | `GET …/me/accounts?fields=id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}` (paginado) |

- `state` aleatorio guardado en servidor, ligado al usuario y al espacio, de un solo uso y 10 min (`src/lib/oauth.ts`).
- Se guardan los **tokens de Página** (cifrados AES-256-GCM). No caducan mientras el token de usuario sea válido, pero Meta puede invalidarlos: un error `190` marca la cuenta «Reconectar».

## Permisos (scopes) y para qué se usa cada uno

| Permiso | Función de la app | Pantalla |
|---|---|---|
| `pages_show_list` | Listar las Páginas del usuario al conectar | Cuentas → Conectar Facebook + Instagram |
| `pages_read_engagement` | Leer seguidores de la Página y me gusta/comentarios de sus vídeos; requisito para los datos de Instagram | Analítica → Facebook / Instagram |
| `business_management` | Listar Páginas gestionadas desde un Business Manager | Cuentas |
| `instagram_basic` | Perfil de Instagram (usuario, foto, seguidores, publicaciones) | Analítica → Instagram |
| `instagram_manage_insights` | Métricas de publicaciones y alcance diario de la cuenta | Analítica → Instagram |
| `instagram_content_publish` | Publicar Reels (solo si `PUBLISH_INSTAGRAM` ≠ `false`) | Nueva publicación |
| `pages_manage_posts` | Publicar vídeos en la Página (solo si `PUBLISH_FACEBOOK` ≠ `false`) | Nueva publicación |

**No se pide** `read_insights` ni `pages_manage_engagement`: las visualizaciones de vídeos de Página no se muestran (aparecen como «no disponible»).

**Limitación conocida (por verificar con la app real):** la referencia de insights de Instagram indica que, con Facebook Login, si el usuario tiene el rol en la Página a través de un Business Manager también hacen falta `ads_management` y `ads_read`. La app **no** los pide (no tiene función de anuncios que los justifique ante App Review). Si en las pruebas una cuenta gestionada por Business Manager no devuelve métricas, aparecerán como «no disponible» y se documentará aquí.

## Analítica (sincronización cada `SYNC_INTERVAL_HOURS`, por defecto 6 h)

| Dato | Llamada |
|---|---|
| Perfil IG | `GET /{ig-id}?fields=username,profile_picture_url,followers_count,follows_count,media_count` |
| Alcance y visualizaciones de ayer (día natural UTC, 00:00→24:00; se re-sincroniza porque Meta consolida hasta 48 h) | `GET /{ig-id}/insights?metric=reach,views&period=day&metric_type=total_value&since&until` |
| Publicaciones | `GET /{ig-id}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,thumbnail_url,media_url,like_count,comments_count&limit=50` (paginado hasta la fecha) |
| Métricas por publicación | `GET /{media-id}/insights?metric=views,reach,likes,comments,shares,saved` |
| Página de Facebook | `GET /{page-id}?fields=name,followers_count,fan_count,picture{url}` y `GET /{page-id}/videos?fields=id,description,created_time,permalink_url,picture,likes.summary(true).limit(0),comments.summary(true).limit(0)` |

**En riesgo:** la referencia v25.0 de `/{page-id}/videos` dice en *Reading* «You can't perform this operation on this endpoint», aunque el nodo `Video` documenta los campos que usamos. Hay que probarlo en el Explorador de la Graph API en cuanto exista la app; si falla, la lista de vídeos de la Página se mostrará como no disponible (el resto de la analítica no se ve afectado) y se cambiará a un edge de lectura documentado antes de App Review. Tampoco está verificado si leer la Página exige `pages_read_user_content`.

Métricas retiradas por Meta que **no** se usan: `plays`, `impressions`, `video_views`, `clips_replays_count`.

## Publicación (Reels)

1. `POST /{ig-id}/media` con `media_type=REELS`, `upload_type=resumable`, `caption`, `share_to_feed=true` → contenedor (se guarda).
2. `POST https://rupload.facebook.com/ig-api-upload/{v}/{container}` con cabeceras `Authorization: OAuth …`, `offset`, `file_size` y el vídeo.
3. Consulta de `status_code` una vez por minuto, máximo 5 minutos (recomendación de Meta).
4. `POST /{ig-id}/media_publish?creation_id=…` → publicado. Antes se marca `committed` para no duplicar.

Facebook: `POST graph-video.facebook.com/{v}/{page-id}/videos` (multipart). Si se corta, queda «Comprobar».

## Eliminación de datos

`POST /api/meta/data-deletion` con `signed_request` (HMAC-SHA256 con el App Secret) → borra tokens y datos de Instagram/Facebook de ese usuario y responde `{ url, confirmation_code }`. Estado en `/eliminar-datos/estado?codigo=…`.

## Estado

| | |
|---|---|
| Implementado según la documentación oficial | Sí (consultada el 23/09/2026; URLs en el código) |
| Probado con la red real | **No**: pendiente de crear la app en developers.facebook.com |
| Probado con respuestas simuladas | Clasificación de errores y reanudación (tests) |
