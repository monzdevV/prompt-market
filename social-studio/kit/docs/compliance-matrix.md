# Matriz de cumplimiento

«Implementado» = el código existe y sigue la documentación oficial vigente (consultada el 23/09/2026).
«Probado» = **real** (contra la red) · **simulado** (tests con respuestas con la forma documentada) · **no**.
YouTube (lectura y subida) y TikTok (conexión y estadísticas, en Sandbox) ya se han probado contra la red real; Meta espera a su app de desarrollador.

| Plataforma | Funcionalidad | API | Scope | Implementado | Probado | Review requerida | Estado |
|---|---|---|---|---|---|---|---|
| Instagram | Conectar cuenta profesional | Facebook Login + `/me/accounts` | `pages_show_list`, `business_management` | Sí | Simulado (estado OAuth) | Sí (Acceso avanzado) | Pendiente de app |
| Instagram | Perfil y seguidores | IG User | `instagram_basic`, `pages_read_engagement` | Sí | No | Sí | Pendiente de app |
| Instagram | Publicaciones y métricas | IG User media + Media insights | `instagram_manage_insights` | Sí | No | Sí | Pendiente de app |
| Instagram | Alcance diario de la cuenta | IG User insights | `instagram_manage_insights` (con Business Manager: + `ads_management`/`ads_read`, no pedidos) | Sí | No | Sí | Pendiente de app |
| Instagram | Publicar Reel | Content Publishing (reanudable) | `instagram_content_publish` | Sí | Simulado (errores/reanudación) | Sí | Pendiente de app |
| Facebook | Seguidores y vídeos de la Página | Page / Page videos | `pages_read_engagement` (¿+ `pages_read_user_content`? sin verificar) | Sí | No | Sí | **En riesgo**: la referencia dice que `/{page-id}/videos` no se puede leer; probar con la app |
| Facebook | Publicar vídeo en Página | Video API | `pages_manage_posts` | Sí | Simulado | Sí | Pendiente de app |
| Meta | Eliminación de datos | Data Deletion Callback | — | Sí | Simulado (firma HMAC, borrado) | Requisito de App Review | Listo |
| TikTok | Conectar cuenta | Login Kit | `user.info.basic` | Sí | **Real** (23/09/2026, Sandbox) | Sí | Funciona en Sandbox |
| TikTok | Nombre de usuario | User info | `user.info.profile` | Sí | Simulado | Sí | Pendiente de app |
| TikTok | Seguidores y estadísticas | User info | `user.info.stats` | Sí | **Real** (Sandbox: 0 seguidores, 14 seguidos) | Sí | Funciona en Sandbox |
| TikTok | Vídeos públicos y métricas | Video list | `video.list` | Sí | Simulado (paginación) | Sí | Pendiente de app |
| TikTok | Publicar (Direct Post) con panel obligatorio | Content Posting API | `video.publish` | Sí (solo «Solo yo» hasta la auditoría) | Simulado (reanudación, estados) | Sí + auditoría Direct Post | Pendiente de app |
| TikTok | Revocar al desconectar | OAuth revoke | — | Sí | No | — | Pendiente de app |
| YouTube | Conectar canal (lectura) | Google OAuth + PKCE | `youtube.readonly` | Sí | **Real** (23/09/2026, proyecto en «Prueba», canal propio) | Verificación OAuth (sensible) | Funciona en modo prueba |
| YouTube | Canal, suscriptores, vídeos, estadísticas | Data API v3 | `youtube.readonly` | Sí | **Real** (canal sin vídeos: 0 suscriptores, 0 vídeos) + simulado (lotes, ocultos) | Verificación OAuth | Falta probar con un canal con vídeos |
| YouTube | Analítica diaria del canal | Analytics API v2 | `yt-analytics.readonly` | Sí | Simulado (sin permiso = no disponible) | Verificación OAuth | Pendiente de proyecto |
| YouTube | Subir vídeo (autorización incremental) | `videos.insert` reanudable | `youtube.upload` | Sí | Simulado (200, 308+Range, 404) | Verificación OAuth + auditoría de API | Pendiente de proyecto |
| YouTube | Revocar y borrar datos al desconectar | OAuth revoke | — | Sí | Simulado (borrado) | Política de datos | Listo |
| YouTube | Retención de metadatos ≤ 30 días | — | — | Sí | Simulado | Política de datos | Listo |
| YouTube | Short o vídeo | `videos.insert` (YouTube clasifica el Short por duración ≤ 3 min y proporción; se añade `#Shorts`) | `youtube.upload` | Sí | Simulado | — | Pendiente de probar |
| YouTube | Miniatura propia | `thumbnails.set` | `youtube.upload` | Sí (si falla, el vídeo queda con la automática) | Simulado (200 y 403) | Canal verificado por teléfono | Pendiente de probar |
| Instagram | Reel / solo pestaña Reels / historia | `media_type=REELS` (`share_to_feed`) o `STORIES` | `instagram_content_publish` | Sí | Simulado | Sí | Pendiente de app |
| Instagram | Portada (fotograma) | `thumb_offset` | `instagram_content_publish` | Sí | Simulado | Sí | Pendiente de app |
| Facebook | Reel e historia de Página | `/video_reels`, `/video_stories` (start → rupload → finish) | `pages_manage_posts` | Sí | Simulado (flujo, corte = «Comprobar») | Sí | Pendiente de app |
| Facebook | Portada del vídeo | `thumb` en `/{page-id}/videos` | `pages_manage_posts` | Sí (Reels: portada automática; poner una exigiría más permisos) | No | Sí | Pendiente de app |
| TikTok | Portada (fotograma) | `video_cover_timestamp_ms` | `video.publish` | Sí (TikTok no admite imagen propia) | No | Sí | Pendiente de app |
| LinkedIn | Publicar en perfil | Posts API | `w_member_social` | Sí (apagado: `FEATURE_LINKEDIN=false`) | No | Sí | Fuera de alcance |
