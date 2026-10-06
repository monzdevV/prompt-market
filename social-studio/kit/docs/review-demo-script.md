# Guion para grabar los vídeos de revisión

Consejos comunes:
- Graba a 1080p con el cursor visible. Navegador limpio (sin extensiones a la vista), zoom al 100 %.
- La **barra de direcciones debe verse** en todo momento: las redes comprueban que el dominio coincide con el registrado.
- Usa la **app en inglés o con subtítulos en inglés** si la red lo pide (Google exige ver la pantalla de consentimiento en inglés: cambia el idioma de la cuenta de Google de prueba a inglés antes de grabar).
- Narra o pon rótulos breves: «Here the app uses *permiso* to …».
- Empieza siempre desde la portada pública y el inicio de sesión.

## Meta

1. Portada `https://TU-DOMINIO/` → «Entrar» con la cuenta de prueba.
2. Cuentas → abrir «Antes de conectar» (se ven los requisitos) → «Conectar Facebook + Instagram».
3. Diálogo de Meta: se ven los permisos solicitados; elegir la Página y el Instagram de prueba; aceptar.
4. Vuelta a Cuentas: «cuenta conectada»; estado «Sincronizando» → «Al día» (recarga tras 1 min).
   - Rótulo: *pages_show_list / business_management: list the Pages the user manages.*
5. Analítica → Instagram: seguidores, tabla de publicaciones con visualizaciones, alcance, me gusta, guardados.
   - Rótulo: *instagram_basic + pages_read_engagement: profile and media; instagram_manage_insights: per-post metrics and daily reach.*
6. Analítica → Facebook: seguidores de la Página y vídeos con me gusta/comentarios (*pages_read_engagement*).
7. Nueva publicación: subir un vídeo corto → se transcribe → la IA propone título, descripción y hashtags → marcar Instagram y Facebook → «Publicar».
8. Publicaciones: estado «Publicada» con enlace «Ver» → abrir el Reel en Instagram y el vídeo en la Página.
   - Rótulo: *instagram_content_publish / pages_manage_posts: publish the video the user uploaded and approved.*
9. Cuentas → «Desconectar» → confirmar.
10. Portada → pie → «Eliminar mis datos» (mostrar la página).

## TikTok

1. Portada → mostrar enlaces de Términos y Privacidad en el pie → «Entrar».
2. Cuentas → «Conectar TikTok» → pantalla de autorización de TikTok con los scopes → aceptar.
   - Rótulo: *user.info.basic: account name and avatar.*
3. Analítica → TikTok: seguidores, seguidos, vídeos; tabla de vídeos públicos con visualizaciones, me gusta, comentarios y compartidos.
   - Rótulo: *user.info.stats: follower counts. video.list: public videos and their metrics. user.info.profile: username used for video links.*
4. Nueva publicación → subir vídeo → marcar TikTok → **mostrar el panel**:
   - avatar y nombre de la cuenta;
   - «¿Quién puede ver este vídeo?» **sin opción preseleccionada** → elegir;
   - permitir comentarios / dúo / stitch;
   - activar «Este vídeo promociona una marca» y enseñar las dos opciones (y que «Solo yo» se bloquea con contenido de marca);
   - texto de consentimiento de música junto al botón «Publicar».
   - Rótulo: *video.publish: Direct Post following the Content Sharing Guidelines.*
5. Publicar → Publicaciones: «Publicando…» → «Publicada» → abrir en TikTok.
6. Cuentas → «Desconectar» (se revoca el acceso).

## Google / YouTube

Requisitos de Google para el vídeo: subido a YouTube como **oculto**, pantalla de consentimiento **en inglés**, se ve el **nombre de la app** y el **client_id en la barra de direcciones** durante el consentimiento.

1. Portada → «Entrar».
2. Cuentas → «Conectar YouTube» → pantalla de consentimiento de Google: pausar para que se lean nombre de la app, scopes (*youtube.readonly*, *yt-analytics.readonly*) y la URL con `client_id=`.
3. Vuelta a Cuentas: canal conectado, estado «Al día».
4. Analítica → YouTube: suscriptores, gráfico de evolución, tabla de vídeos con visualizaciones, me gusta y comentarios.
   - Rótulo: *youtube.readonly: channel, subscribers, videos and statistics. yt-analytics.readonly: daily channel metrics.*
5. Cuentas → «Autorizar publicación en YouTube» → consentimiento incremental mostrando *youtube.upload*.
6. Nueva publicación → subir vídeo → marcar YouTube → «Publicar» → Publicaciones → abrir el vídeo en YouTube.
   - Rótulo: *youtube.upload: upload the video the user uploaded and approved (requested only when publishing).*
7. Cuentas → «Desconectar» → rótulo: *token revoked at Google and YouTube data deleted.*
8. Pie → «Privacidad»: mostrar los enlaces a las Condiciones de YouTube y a la Política de privacidad de Google.
