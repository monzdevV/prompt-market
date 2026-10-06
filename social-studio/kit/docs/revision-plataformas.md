# Cómo conseguir que Meta, TikTok y Google aprueben la app

Esta guía se ha sustituido por la documentación detallada (una sola fuente de verdad, alineada con el código):

- **¿Qué falta para enviar cada revisión?** → [`review-readiness.md`](review-readiness.md)
- **Expediente por red** (configuración, permisos y su justificación, flujo, pruebas):
  [`platform-review/instagram.md`](platform-review/instagram.md) · [`platform-review/tiktok.md`](platform-review/tiktok.md) · [`platform-review/youtube.md`](platform-review/youtube.md)
- **Qué usa exactamente la app de cada API** → [`integrations/`](integrations/)
- **Matriz de cumplimiento** → [`compliance-matrix.md`](compliance-matrix.md)
- **Guion para grabar los vídeos de revisión** → [`review-demo-script.md`](review-demo-script.md)

Orden recomendado (lleva semanas; hazlo en paralelo):

1. Dominio propio con HTTPS fijo + `LEGAL_NAME` y `CONTACT_EMAIL` rellenos.
2. Crear las tres apps de desarrollador y probar todo en modo desarrollo con tus propias cuentas.
3. Verificación de empresa de Meta (el paso más lento).
4. Enviar TikTok (revisión de la app → auditoría de Direct Post) y Google (verificación OAuth → auditoría de la API de YouTube + cuota).
5. App Review de Meta (Acceso avanzado) → modo Activo.
6. Mientras tanto: beta privada con invitaciones (`SIGNUP_MODE=invite`) y usuarios añadidos como testers.
