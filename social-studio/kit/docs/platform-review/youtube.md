# Expediente de revisión — Google / YouTube

## Proyecto (console.cloud.google.com)

1. Proyecto nuevo con tu cuenta **personal** (las cuentas de organización pueden tener bloqueada la creación o limitar a apps internas).
2. Habilitar **YouTube Data API v3** y **YouTube Analytics API**.
3. **Pantalla de consentimiento OAuth** → Externa:
   - Nombre de la app, logo, email de soporte.
   - Dominio autorizado: `TU-DOMINIO` (verificado en Google Search Console).
   - Página principal `https://TU-DOMINIO/`, privacidad `/privacidad`, términos `/terminos`.
   - Permisos: `youtube.readonly`, `yt-analytics.readonly`, `youtube.upload`.
4. **Credenciales** → ID de cliente OAuth → Aplicación web → URI de redirección `https://TU-DOMINIO/api/oauth/youtube/callback` (en local también `http://localhost:3000/api/oauth/youtube/callback`).
5. Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Scopes y justificación

| Scope | Uso | Pantalla |
|---|---|---|
| `youtube.readonly` | Mostrar el canal, suscriptores y estadísticas de sus vídeos | Analítica → YouTube |
| `yt-analytics.readonly` | Mostrar la evolución diaria de visualizaciones y tiempo de visualización | Analítica → YouTube |
| `youtube.upload` | Subir el vídeo que el usuario aprueba (se pide **solo al publicar**, autorización incremental) | Cuentas → «Autorizar publicación en YouTube», Nueva publicación |

## Mientras está en «Prueba»

- Solo pueden conectarse los usuarios de prueba que añadas.
- **Sus conexiones caducan a los 7 días** (la app lo detecta y muestra «Reconectar»).
- Los vídeos subidos desde un proyecto no auditado quedan **privados**.

## Verificación

1. **Verificación de marca / dominio** (Search Console).
2. **Verificación OAuth** (scopes sensibles): «Publicar app» → enviar a verificación. Justificación por scope + **vídeo de demostración** subido a YouTube como **oculto**, que muestre: pantalla de consentimiento en inglés, el nombre de la app, el ID de cliente en la barra de direcciones y el uso de cada scope. Suele tardar 3-5 días hábiles.
3. **Auditoría de cumplimiento de los Servicios de API de YouTube** + **ampliación de cuota** (formulario «Audit and Quota Extension»): necesaria para publicar vídeos públicos y para más cuota. La subida tiene su propia bolsa de 100 llamadas/día.

## Cumplimiento ya implementado

- Revocación del token al desconectar y borrado inmediato de los datos de YouTube.
- Metadatos refrescados o borrados como máximo a los 30 días.
- Enlaces a las Condiciones de YouTube, a la Política de privacidad de Google y a la página de permisos de Google; texto de «uso limitado» en `/privacidad`.

Guion del vídeo: [`../review-demo-script.md`](../review-demo-script.md#google--youtube).
