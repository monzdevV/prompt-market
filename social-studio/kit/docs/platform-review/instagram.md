# Expediente de revisión — Meta (Instagram + Facebook)

## Configuración de la app (developers.facebook.com)

- Tipo: **Empresa**. Productos: **Inicio de sesión con Facebook para empresas** + **Instagram (API con inicio de sesión de Facebook)**.
- URL de redirección OAuth: `https://TU-DOMINIO/api/oauth/meta/callback`
- Configuración → Básica:
  - Dominio de la app: `TU-DOMINIO`
  - Política de privacidad: `https://TU-DOMINIO/privacidad`
  - Condiciones del servicio: `https://TU-DOMINIO/terminos`
  - **Eliminación de datos → URL de devolución de llamada**: `https://TU-DOMINIO/api/meta/data-deletion` (alternativa aceptada: instrucciones en `https://TU-DOMINIO/eliminar-datos`)
  - Icono (1024×1024), categoría, email de contacto.
- Variables: `META_APP_ID`, `META_APP_SECRET` en `.env.local`.

## Permisos a solicitar (Acceso avanzado) y justificación

| Permiso | Qué hace la app con él | Dónde se ve |
|---|---|---|
| `pages_show_list` | Muestra las Páginas del usuario para que elija cuáles conectar | Cuentas |
| `pages_read_engagement` | Lee seguidores de la Página y me gusta/comentarios de sus vídeos; necesario para leer la cuenta de Instagram vinculada | Analítica → Facebook |
| `business_management` | Lista Páginas que el usuario gestiona desde un Business Manager | Cuentas |
| `instagram_basic` | Lee el perfil y las publicaciones de la cuenta profesional de Instagram | Analítica → Instagram |
| `instagram_manage_insights` | Lee visualizaciones, alcance, guardados y compartidos de cada publicación y el alcance diario | Analítica → Instagram |
| `instagram_content_publish` | Publica el Reel que el usuario sube y aprueba en la app | Nueva publicación |
| `pages_manage_posts` | Publica el vídeo en la Página que el usuario elige | Nueva publicación |

Si decides lanzar primero solo analítica, pon `PUBLISH_INSTAGRAM=false` y `PUBLISH_FACEBOOK=false`: la app dejará de pedir los dos últimos permisos y la revisión será más sencilla.

## Flujo del usuario (lo que verá el revisor)

1. Entra en la app con la cuenta de prueba.
2. Cuentas → «Antes de conectar» (requisitos) → «Conectar Facebook + Instagram».
3. Diálogo de Meta: elige Páginas y cuenta de Instagram, acepta permisos.
4. Vuelve a Cuentas: «1 cuenta conectada… Estamos trayendo sus datos». Estado «Sincronizando» → «Al día».
5. Analítica → Instagram: seguidores, publicaciones con métricas; «—» donde Meta no da el dato.
6. Nueva publicación: sube un vídeo, la IA propone el texto, elige Instagram, publica. Publicaciones → estado «Publicada» con enlace.
7. Cuentas → Desconectar.

## Requisitos previos

- **Verificación de empresa** (Configuración del negocio → Centro de seguridad).
- Cuenta de prueba para el revisor (crear invitación en Admin).
- Instagram de prueba **profesional** vinculado a una Página.
- Dominio con HTTPS estable.

## Pruebas antes de enviar

- En modo desarrollo, con tu cuenta (administrador de la app): conectar, sincronizar, publicar un Reel, desconectar.
- Comprobar que `/api/meta/data-deletion` responde: en Configuración → Avanzado → «Eliminación de datos» Meta permite probar la URL.

## Capturas / vídeo necesarios

Un screencast por permiso (o uno que cubra todos mostrando claramente cada uso). Guion en [`../review-demo-script.md`](../review-demo-script.md#meta).
