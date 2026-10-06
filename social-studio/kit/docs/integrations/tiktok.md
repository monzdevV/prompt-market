# Integración: TikTok

Productos de TikTok for Developers: **Login Kit (Web)**, **Display API** (perfil y vídeos) y **Content Posting API — Direct Post**.

Código: `src/lib/platforms/tiktok.ts` (conexión, renovación, publicación), `src/lib/platforms/tiktok-insights.ts` (analítica), `src/app/(app)/nuevo/tiktok-panel.tsx` (interfaz obligatoria de publicación).

## Conexión (OAuth)

| Paso | Llamada |
|---|---|
| Autorización | `https://www.tiktok.com/v2/auth/authorize/?client_key&scope&response_type=code&redirect_uri&state` |
| Código → tokens | `POST https://open.tiktokapis.com/v2/oauth/token/` (`grant_type=authorization_code`) |
| Renovación | mismo endpoint, `grant_type=refresh_token`. El refresh token **rota**: se guarda el nuevo. Acceso 24 h, refresh 365 días |
| Revocar al desconectar | `POST /v2/oauth/revoke/` |

- `state` en servidor, de un solo uso. La URL de redirección debe ser **HTTPS** y fija.
- Los permisos concedidos (`scope` de la respuesta) se guardan.

## Permisos (scopes)

| Scope | Función | Pantalla | Endpoint |
|---|---|---|---|
| `user.info.basic` | Nombre, foto e id de la cuenta | Cuentas | `GET /v2/user/info/` |
| `user.info.profile` | Nombre de usuario (para el enlace del vídeo publicado) | Cuentas, Publicaciones | `GET /v2/user/info/?fields=username` |
| `user.info.stats` | Seguidores, seguidos, nº de vídeos | Analítica → TikTok | `GET /v2/user/info/?fields=open_id,display_name,avatar_url,username,follower_count,following_count,video_count` |
| `video.list` | Vídeos públicos y sus visualizaciones, me gusta, comentarios y compartidos | Analítica → TikTok | `POST /v2/video/list/` (20 por página) |
| `video.publish` | Publicar directamente (solo si `PUBLISH_TIKTOK` ≠ `false`) | Nueva publicación | `/v2/post/publish/creator_info/query/`, `/video/init/`, subida, `/status/fetch/` |

## Publicación (Direct Post)

1. `creator_info/query` → avatar, nombre, **opciones de privacidad**, interacciones desactivadas, duración máxima.
2. Panel obligatorio (pautas de TikTok): cuenta visible; **privacidad elegida por el usuario sin valor por defecto**; comentarios/dúo/stitch; **contenido comercial** («Tu marca» / «Contenido de marca»; el de marca no puede ser privado); texto de **Confirmación de uso de música** (y Política de contenido de marca) junto al botón; aviso de que tarda unos minutos.
3. `video/init` con `FILE_UPLOAD`, `chunk_size` y `total_chunk_count` (≤64 MB en un trozo; si no, trozos de 10 MB y el último absorbe el resto).
4. `PUT` de cada trozo con `Content-Range` al `upload_url` (host verificado).
5. `status/fetch` hasta `PUBLISH_COMPLETE` (`publicaly_available_post_id`, grafía de TikTok) o `FAILED`.

**Sin auditar** (`TIKTOK_AUDITED=false`): TikTok solo admite `SELF_ONLY` y la cuenta del creador debe ser privada. La app solo ofrece «Solo yo» y lo avisa. **Programar**: desactivado por prudencia (`TIKTOK_ALLOW_SCHEDULING=false`); la documentación no lo prohíbe.

## Limitaciones que se muestran al usuario

- TikTok solo da métricas de **vídeos públicos**: los privados no aparecen en la analítica.
- No hay alcance ni guardados en la API: se muestran como «no disponible».

## Estado

| | |
|---|---|
| Implementado según la documentación oficial | Sí (consultada el 23/09/2026) |
| Probado con la red real | **No**: pendiente de crear la app y el Sandbox |
| Probado con respuestas simuladas | Perfil, lista de vídeos paginada, reanudación de la subida |
