# Expediente de revisión — TikTok

## Productos y configuración (developers.tiktok.com → Manage apps)

- **Login Kit** (Web), **Content Posting API** con **Direct Post** activado. Los datos de perfil y vídeos usan la API v2 (`user/info`, `video/list`).
- Redirect URI (HTTPS, fija): `https://TU-DOMINIO/api/oauth/tiktok/callback`
- Web / Terms / Privacy: `https://TU-DOMINIO/`, `/terminos`, `/privacidad`
- La web debe parecer un **servicio público** (portada, términos y privacidad enlazados): TikTok rechaza apps «de uso personal».
- Variables: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.

## Scopes solicitados

| Scope | Para qué | Pantalla que lo demuestra | Endpoint |
|---|---|---|---|
| `user.info.basic` | Identificar la cuenta (nombre, foto) | Cuentas | `GET /v2/user/info/` |
| `user.info.profile` | Nombre de usuario para enlazar los vídeos publicados | Publicaciones (enlace «Ver») | `GET /v2/user/info/` (`username`) |
| `user.info.stats` | Seguidores, seguidos, nº de vídeos | Analítica → TikTok | `GET /v2/user/info/` (`follower_count`…) |
| `video.list` | Métricas de los vídeos públicos | Analítica → TikTok (tabla) | `POST /v2/video/list/` |
| `video.publish` | Publicar directamente el vídeo que el usuario aprueba | Nueva publicación (panel TikTok) | `/v2/post/publish/...` |

Estrategia de menor riesgo: enviar primero **analítica** (`PUBLISH_TIKTOK=false`, sin `video.publish`) y después la publicación.

## Flujo completo

1. Cuentas → «Conectar TikTok» → pantalla de autorización de TikTok → vuelve con la cuenta conectada.
2. Analítica → TikTok: seguidores y vídeos públicos con métricas.
3. Nueva publicación → sube vídeo → selecciona TikTok → **panel**: cuenta (avatar + nombre), «¿Quién puede ver este vídeo?» sin opción preseleccionada, permitir comentarios/dúo/stitch, contenido comercial (tu marca / contenido de marca), texto de consentimiento junto al botón → Publicar → estado en Publicaciones.
4. Cuentas → Desconectar (revoca el token en TikTok).

## Sandbox y pruebas

- Crear un **Sandbox** (hasta 10 cuentas de prueba) y añadir tu cuenta. En Sandbox no se publica en público.
- Antes de la auditoría de Direct Post: solo `SELF_ONLY` y la cuenta del creador en **privado** (`TIKTOK_AUDITED=false`).

## Requisitos de revisión

- Vídeo(s) de demostración del flujo completo de **cada producto y scope** (máx. 5 vídeos, 50 MB cada uno). El dominio del vídeo debe coincidir con la web registrada.
- Quitar cualquier scope que no se use (la app ya pide solo los de la tabla).
- Tras aprobar la app, solicitar la **auditoría de Direct Post** para publicar en público; entonces `TIKTOK_AUDITED=true`.

Guion del vídeo: [`../review-demo-script.md`](../review-demo-script.md#tiktok).
