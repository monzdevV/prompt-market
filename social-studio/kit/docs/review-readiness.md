# ¿Estamos listos para enviar las revisiones?

Resumen por plataforma. Detalle en `docs/platform-review/*` e `docs/integrations/*`. **Ninguna red aprueba por adelantado**: la app está preparada para cumplir sus requisitos, no se garantiza la aprobación.

## Lo común (bloquea las tres)

| Requisito | Estado |
|---|---|
| Dominio propio con HTTPS estable (túnel de Cloudflare con dominio fijo o VPS) | **Pendiente (tú)** |
| `LEGAL_NAME` y `CONTACT_EMAIL` rellenos y recompilado | **Pendiente (tú)** |
| Páginas `/privacidad`, `/terminos`, `/eliminar-datos`, `/contacto`, `/seguridad` | Hechas |
| Cuenta de prueba para los revisores (invitación desde Admin) | Pendiente (cuando tengas dominio) |
| Revisión de los textos legales por alguien que sepa de RGPD | Recomendado |

## TikTok

- **Productos**: Login Kit, Content Posting API (Direct Post). Datos con `user/info` y `video/list`.
- **Scopes**: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`, `video.publish`.
- **Para qué y dónde**: ver tabla en `platform-review/tiktok.md`.
- **Cómo conectar**: Cuentas → Conectar TikTok. **Cómo probar**: Sandbox con tu cuenta en privado.
- **Vídeo**: flujo completo por producto/scope (guion en `review-demo-script.md#tiktok`).
- **URLs**: web, términos, privacidad, redirect `…/api/oauth/tiktok/callback`.
- **Falta para enviar**: crear la app, dominio HTTPS, probar en Sandbox, grabar el vídeo. Después: auditoría de Direct Post.

## Instagram / Facebook (Meta)

- **Configuración**: app de tipo Empresa con Inicio de sesión con Facebook para empresas + Instagram (API con inicio de sesión de Facebook).
- **Permisos**: `pages_show_list`, `pages_read_engagement`, `business_management`, `instagram_basic`, `instagram_manage_insights` (+ `instagram_content_publish`, `pages_manage_posts` si se publica).
- **Flujo**: Cuentas → Conectar → elegir Página e Instagram → Analítica → Publicar → Desconectar.
- **Eliminación de datos**: callback `…/api/meta/data-deletion` implementado.
- **Falta para enviar**: crear la app, **verificación de empresa**, Instagram profesional de prueba vinculado a una Página, grabar el vídeo, pedir Acceso avanzado.

## Google / YouTube

- **Proyecto**: Data API v3 + Analytics API; OAuth web externo.
- **Scopes**: `youtube.readonly`, `yt-analytics.readonly`; `youtube.upload` solo al publicar.
- **Pantalla de consentimiento**: nombre, logo, dominio verificado, URLs legales.
- **Verificación**: OAuth (scopes sensibles) con vídeo; después auditoría de la API de YouTube + cuota para vídeos públicos.
- **Pruebas**: en «Prueba» con tu cuenta como usuario de prueba (caduca a los 7 días).
- **Falta para enviar**: crear el proyecto con una cuenta personal, verificar dominio, grabar el vídeo.

## Estado de la app (lo que ya cumple)

- OAuth con `state` en servidor (un solo uso), PKCE en Google, permisos concedidos guardados, reconexión y desconexión con revocación.
- Tokens cifrados y nunca enviados al navegador (test canario).
- Solo se piden los permisos que usa una función real; interruptores para apagar la publicación por red.
- Analítica honesta: «no disponible» ≠ 0 ≠ «sin sincronizar».
