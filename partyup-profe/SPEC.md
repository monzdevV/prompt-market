# SPEC · PartyUp (app móvil de fiestas y previas)

Especificación para reconstruir la app **sin el kit** (modo C). Si tienes `kit/`, manda el código y no este documento.

## 1 · Producto

App social para iOS y Android que convierte una previa o una noche de fiesta en una sala compartida. Un usuario crea una **fiesta** con un código de 6 caracteres y sus amigos se unen con él. Dentro de la fiesta:
- cuentan bebidas en un marcador compartido;
- comparten una foto y una nota por persona;
- reaccionan con stickers;
- responden **retos** con tiempo límite que lanza el creador (o un local);
- canjean **tickets de oferta** que publican las discotecas.

Además tiene:
- **6 juegos de fiesta** que se juegan sin conexión;
- un **archivo** de fiestas pasadas con calendario;
- un buscador de **discotecas cercanas**;
- un **panel para locales** con estadísticas, retos y ofertas;
- suscripción **Pro** con RevenueCat.

Interfaz en 5 idiomas (es, en, fr, de, it). Solo tema oscuro y orientación vertical. En iOS no se admite iPad (`supportsTablet: false`).

**Plataformas:** iOS y Android. **La web no está soportada** (`expo export --platform web` falla porque `@invertase/react-native-apple-authentication` no tiene versión web). **No funciona en Expo Go**: usa módulos nativos (Google/Apple Sign-In, RevenueCat), así que hace falta un *development build*.

## 2 · Stack exacto

| Paquete | Versión |
|---|---|
| expo | 54.0.31 (SDK 54, New Architecture activada, `reactCompiler` y `typedRoutes` en `experiments`) |
| react / react-native | 19.1.0 / 0.81.5 |
| expo-router | 6.0.21 (rutas por archivos, `NativeTabs` de `expo-router/unstable-native-tabs`) |
| react-native-reanimated / react-native-worklets | 4.1.6 / 0.5.1 |
| react-native-gesture-handler | 2.28.0 |
| @shopify/react-native-skia | 2.2.12 |
| expo-mesh-gradient · expo-glass-effect · expo-blur · expo-linear-gradient | 0.4.8 · 0.1.8 · 15 · 15 |
| expo-image · expo-video · expo-av (solo el vídeo del login) | 3.0.11 · 3.0.16 · 16.0.8 |
| expo-camera · expo-image-picker · expo-media-library | 17 · 17 · 18 |
| expo-location · expo-notifications · expo-haptics · expo-clipboard · expo-sharing | 19 · 0.32.16 · 15 · 8 · 14 |
| @supabase/supabase-js (+ AsyncStorage, react-native-url-polyfill) | 2.95.3 |
| @react-native-google-signin/google-signin · @invertase/react-native-apple-authentication | 16.1.1 · 2.5.1 |
| react-native-purchases / -ui (RevenueCat) | 9.7.6 |
| i18next / react-i18next / expo-localization / intl-pluralrules | 25.8.6 / 16.5.4 / 17 / 2 |
| react-native-heroicons · date-fns · react-native-view-shot · @react-native-community/netinfo | 4.0.0 · 4.1.0 · 4.0.3 · 11.4.1 |
| TypeScript | 5.9 (strict, alias `@/*` a la raíz) |

Variables de entorno (`.env`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y `EXPO_PUBLIC_REVENUECAT_API_KEY`.
Secretos de las Edge Functions: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (los pone Supabase) y `REVENUECAT_WEBHOOK_SECRET`.

```
app/                       Rutas (expo-router). Casi todas reexportan una pantalla de src/screens
├── _layout.tsx            Proveedores + AuthGuard + Stack raíz (modales y formSheets)
├── onboarding.tsx, auth/login.tsx, username-setup.tsx, avatar-setup.tsx
├── (tabs)/                party, games, calendar/ (index + party-detail), clubs, profile, venue-home, [index, recap ocultas]
├── party/                 create, join, [partyId], challenge-type, challenge-question, challenge-reveal
├── venue/                 challenge-type, challenge-question, offer-type, offer-details
├── games/                 impostor, truth-or-dare, la-oca, never-have-i-ever, most-likely-to, would-you-rather
└── *-sheet.tsx, note-editor.tsx
src/
├── config/supabase.ts     Cliente con AsyncStorage, lock no-op y auto-refresh ligado a AppState
├── constants/theme.ts     Tokens (colores, tipografía, spacing, radios, sombras, animación)
├── store/                 index.ts (estado global, Context + useReducer) y gameStore.ts (jugadores)
├── services/              auth, party, media, note, reaction, challenge, venue, venueOffer, venueDashboard, subscription, notification, prefetch, location, instagram
├── screens/ components/ hooks/ i18n/ types/
supabase/                  00_schema.sql + functions/ (6 Edge Functions en Deno)
```

## 3 · Dirección visual

- **Mundo:** noche, neón y pegatinas. Inspiración en BeReal y en el estilo «Bump»: negro profundo, un único color firma, emojis 3D en PNG como pegatinas inclinadas, GIF con transparencia, *liquid glass* de iOS 26 y háptica en casi cada toque.
- **Colores:**
  - Fondo `#0A0A0B` (secundario `#111113`, terciario `#18181B`, elevado `#1C1C1F`); tarjetas `#1A1A1D` y `#242428`.
  - Firma **lima `#BFFF00`** (light `#D4FF4D`, dark `#99CC00`, muted al 15 %, glow al 40 %). Secundario azul `#3B82F6`.
  - Acentos: rosa `#EC4899`, morado `#A855F7`, cian `#22D3EE`, naranja `#F97316`, rojo `#EF4444`, verde `#22C55E` y amarillo `#FACC15`.
  - Texto blanco, y blanco al 70, 55 y 45 % para los niveles secundarios.
  - Bordes blancos al 5-18 %.
- **Tipografía:** la del sistema (SF en iOS, Roboto en Android). En los juegos, `ui-rounded`. Escala 11/13/15/17/20/24/28/34/40/48 y pesos 400-900. Titulares grandes y gruesos con tracking negativo.
- **Formas:** radios de 12 a 32. Los sheets nativos llevan radio 38 y *grabber*. Pastillas `9999`.
- **Movimiento:** Reanimated en el hilo de UI.
  - Pulsaciones: spring a escala 0,95-0,97 (damping 15, stiffness 300) y háptica Light.
  - Entradas: `FadeInDown`/`FadeInUp` escalonadas de 40 a 100 ms, con `springify()`.
  - Constantes de tema: duraciones 100/200/300/500/800 ms; springs gentle (15/100), bouncy (10/150) y stiff (20/200).
- **Prohibido:** modo claro, fuentes de relleno tipo Inter, iconos de colores fuera de los emojis 3D y pantallas sin estado vacío.

## 4 · Navegación y arranque

**Proveedores**, en este orden: GestureHandlerRootView → SafeAreaProvider → AppProvider → GameProvider → AuthGuard → ThemeProvider (oscuro) → Stack sin cabecera con `slide_from_right`.

**Formas de presentación:**
- formSheet con detents: `photo-sheet` 0,75, `note-sheet` 0,65, `paywall-sheet` 0,78, `username-sheet` 0,45, `avatar-sheet` 0,55 y `club-detail-sheet` 0,78.
- fullScreenModal: `username-setup`, `avatar-setup` (sin gesto de cierre), `note-editor`, `challenge-results-sheet` y `games`.
- containedModal: `party`.

**AuthGuard:**
1. Escucha `onAuthStateChange`.
2. Con sesión, carga todos los datos en paralelo con `prefetchAppData`: perfil, fiesta activa, RevenueCat y fiestas terminadas; y, si hay fiesta, sus fotos, notas y reacciones. Reintenta 3 veces con backoff de 1 y 2 s, y corta a los 15 s como máximo.
3. Si falla el perfil por red, muestra `ConnectionErrorScreen` y reintenta solo al recuperar la conexión.
4. Al cerrar sesión limpia RevenueCat, los tokens push, la caché de imágenes y AsyncStorage.
5. Redirige así:
   - sin sesión → `/onboarding`;
   - con sesión pero sin username → `/username-setup?mode=onboarding`;
   - en otro caso → `/(tabs)/party`.

Mientras carga se ve el logo `icon-splash.png` a 80 px sobre negro. Si no hay conexión, aparece arriba la barra roja «Sin conexión a internet».

**Pestañas** (`NativeTabs`, iconos SF Symbols, se minimizan al hacer scroll):
- usuario normal: Fiesta (flame), Juegos (gamecontroller), Archivo (clock.arrow.circlepath), Clubs (sparkles) y Perfil (person);
- cuenta de local: Home (house) y Perfil.

## 5 · Pantallas y flujos

1. **Onboarding:** carrusel paginado de 7 diapositivas. Cada una tiene un vídeo o un héroe animado, un título, un subtítulo y puntos de paginación.
   - Diapositivas:
     1. Crea la fiesta.
     2. Cuenta tragos.
     3. Juegos.
     4. Ofertas 2x1 y tickets.
     5. Retos (cartas animadas).
     6. Notificaciones: pide permiso.
     7. Ubicación: pide permiso.
   - Botón de cristal «Continuar». En las diapositivas de permiso, botón degradado lima con «Quizá luego».
   - Partículas de fuego continuas en el botón.
   - Al terminar → login.
2. **Login:** vídeo de fondo en bucle bajo un degradado, «Bienvenido a» + logotipo de texto en dos colores, botón de Apple (solo iOS) y botón de Google.
   - `signInWithIdToken` en Supabase y *upsert* en `users`.
   - Enlaces legales al pie.
3. **Username:** prefijo «@», `[a-zA-Z0-9_]` de 3 a 20 caracteres. Comprueba la disponibilidad con un debounce de 400 ms (RPC `is_username_available`). Se guarda en minúsculas.
4. **Avatar:** «Hacer foto» o «Galería», recorte 1:1. Se sube a `user-avatars/{uid}.{ext}` con URL firmada. Se puede «Saltar por ahora».
5. **Fiesta, sin fiesta (Home):**
   - Logotipo arriba y una composición aleatoria de stickers GIF que cambia al volver a la pestaña.
   - «No estás en ninguna FIESTA».
   - **Desliza para crear fiesta**: pista de 72 px con un *thumb* de 90 px que lleva un GIF; se completa al 85 %. Al soltar, spring de 15/200 si llega y de 20/300 si no.
     - Durante el arrastre: partículas de fuego y háptica.
     - Fondo: mesh gradient 4×4 animado en ciclos de 28 s bajo cristal.
   - Enlace «Unirse con código».
6. **Crear fiesta:** fondo Skia con 3 círculos difuminados.
   1. Nombre, de 12 caracteres como mucho y con contador; fuego al llegar a 2 o más caracteres.
   2. «¿A dónde vas?»: locales cercanos con `get_nearby_venues` (25 km, de 5 en 5, scroll infinito, búsqueda con debounce de 350 ms). Se puede omitir.
   - Inserta en `parties` y añade al creador como `host`.
   - Solo se permite **una fiesta activa por usuario**.
7. **Unirse:** 6 casillas en mayúsculas y RPC `join_party_by_code`. Si falla, la casilla se sacude (±15/12/8 px) con háptica de error.
8. **Sala de fiesta** (`PartyRoomScreen`), de arriba abajo:
   - Fondo GIF con parallax.
   - Nombre y `#CÓDIGO`, que se desvanecen en los primeros 120 px de scroll.
   - Carruseles de tickets y de retos activos.
   - Tarjeta del local.
   - **Party Drinks:** carrusel de personas y contador −/+.
     - El número se desliza 30 px en 150 ms y salen 12 partículas de emoji.
     - Funciona en optimista con las RPC `increment_drink` y `decrement_drink`, con un máximo de 50.
   - **Party Moments:** 1 foto por persona.
     - Se sube a `party-photos/{party}/{uid}`; puede subir si la fiesta o el usuario son Pro.
     - Rejilla de 2 columnas en 3:4 con visor a pantalla completa: pinch hasta ×3, doble toque ×2 y deslizar hacia abajo para cerrar.
     - Pulsación larga: reaccionar con sticker, guardar o seleccionar varias.
   - **Party Notes:** 1 nota por persona, de 1000 caracteres como mucho, con editor a pantalla completa.
   - Resultados de los retos y tickets canjeados.
   - Pie «Fiesta creada por @user».
   - Encima de todo:
     - confeti que cae cada 12 s;
     - toast;
     - barra flotante con: «+» para crear un reto (solo el creador, en una fiesta Pro, hasta 3 retos), la píldora `#CÓDIGO` con el contador `activos/5|15` (al tocarla copia el código) y el botón de salir (el creador termina la fiesta y el miembro la abandona).
   - Realtime en 8 canales: participantes, fiesta, media, notas, retos, respuestas, reacciones y tickets.
9. **Retos:**
   - **Tipo:** Foto (naranja, «CAPTURA»), Nota (morado, «ESCRIBE») o Hecho (verde, «DEMUESTRA»).
   - **Pregunta:** de 5 a 50 caracteres. Se crea con la RPC `create_challenge` y caduca en **15 min**.
   - **Tarjeta:**
     - degradado según el tipo y cuenta atrás, que late con los últimos 120 s;
     - la carta se descubre deslizando hacia arriba (más de 100 px);
     - según el tipo, se responde con una foto, una nota o «hecho / no hecho»;
     - un cron de 30 s marca los retos caducados.
   - **Resultados:** rejilla con las respuestas. A las no completadas se les pone la cinta «FAILED» y partículas 💩.
10. **Ticket de oferta:** cupón con perforación (130 px + talón de 72 px) y cuenta atrás.
    - Se arrastra en horizontal, con háptica cada 22 px.
    - Al pasar del 80 % el cupón sale volando: 420-450 ms, rota 8° y escala 0,7, con confeti.
    - Se canjea con la RPC `redeem_offer_ticket`.
11. **Archivo:** rejilla de 3 columnas con miniaturas (una foto al azar por fiesta, en caché 24 h) o calendario mensual que se pasa deslizando.
    - Tarjeta «Un día como hoy, hace un año».
    - Ficha de fiesta pasada, en solo lectura.
    - Las fiestas de los últimos 12 meses se cargan con *stale-while-revalidate* desde AsyncStorage.
12. **Clubs:** «Hot Clubs», búsqueda y rejilla de locales en 10 km. Cada tarjeta muestra:
    - foto o GIF del local;
    - distancia;
    - «N hoy · N esta semana»;
    - un 🔥 que rebota en el top 3.

    Ficha en sheet con fiestas de hoy y de la semana, dirección, horario, teléfono, web y redes.
13. **Perfil:**
    - avatar editable, @usuario y check de verificado;
    - estadísticas (fiestas, bebidas, retos) con la RPC `get_user_stats`;
    - banner Pro;
    - usuario, interruptor de notificaciones, idioma (acordeón con 5 idiomas), estado Pro (Customer Center de RevenueCat);
    - cerrar sesión y eliminar cuenta (doble confirmación y Edge Function `delete-account`, que anonimiza los datos).
14. **Paywall:** carrusel con 3 ventajas (retos, fotos, juegos ilimitados), planes Anual (con el precio mensual equivalente) y Mensual sacados de las *offerings* de RevenueCat, y «Restaurar compras».
15. **Panel de local:**
    - Estadísticas de hoy, la semana y el mes, y fiestas activas en el local.
    - «Enviar Reto» y «Enviar Oferta», 5 de cada al día; el día empieza a las 07:30.
    - Ofertas: 2x1, 3x2 o personalizada, con título, descripción, precio y duración (15, 30, 60 o 120 min).
    - Cada oferta crea automáticamente un ticket por participante de las fiestas activas en el local.

## 6 · Juegos

**Catálogo:**
- Una columna de tarjetas de ancho completo con proporción 0,45.
- Cada tarjeta: degradado propio, textura dibujada y pila de emojis 3D.
- Badges: new, popular y premium.
- Los juegos bloqueados llevan blur y un candado de cristal.
- Arriba hay una «píldora» con los jugadores (hasta 12, guardados en AsyncStorage).

**Flujo común:** intro (vídeo, 3 reglas y botón) → jugadores (si faltan) → categoría (las gratis en rejilla y la Pro como banner «Hot» con un degradado Skia animado) → partida.

| Juego | Jugadores | Mecánica |
|---|---|---|
| Impostor (**Pro**) | 3-12 | Palabra secreta para todos menos uno. Cada jugador desliza su carta hacia arriba para verla, luego se debate y se revela. Categorías General (32 palabras) y Plus (16) |
| Verdad o reto | 2-15 | En cada turno el jugador elige verdad o reto. Categorías chill, party y hot (Pro), con 15 + 15 cada una. Mazo infinito |
| La Oca | 2-10 | Tablero en espiral de 59 casillas (8×8) o 90 (10×10). Casillas: bebe, chupito, versus, +3, −3, dorada y meta. Dado de 6 animado y ficha que avanza casilla a casilla cada 160 ms |
| Prefieres | 2-20 | 20 preguntas, más 15 picantes si es Pro |
| Yo nunca | 2-20 | chill, party y hot (Pro), 10 por categoría |
| Quién es más probable | 3-20 | chill 10, party 10 y hot (Pro) 15 |

**Cartas** (Yo nunca, Más probable, Prefieres y Verdad o reto):
- Apiladas de 2 en 2; la de detrás a escala 0,92 y opacidad 0,5.
- Al arrastrar, rotación = x / ancho × 12°.
- Umbral de descarte: 25 % del ancho. Al pasarlo, la carta sale a ±1,5 anchos con rotación de 25° en 150 ms.
- Si no llega al umbral, vuelve con spring 20/300.
- Cada 5 cartas sale una especial con mesh gradient animado, un GIF flotante y háptica Warning.

**El contenido de los juegos está en inglés y escrito a mano en el código.** Al reconstruir, ponlo directamente en el idioma del comprador.

## 7 · Datos (Supabase)

`kit/supabase/00_schema.sql` (requiere las extensiones `pg_cron` y `postgis`; crea `pg_trgm`).

| Tabla | Para qué |
|---|---|
| `users` | Perfil 1:1 con `auth.users`: `display_name`, `username` (único), `avatar_url`, `provider`, `is_premium`, `is_verified` y `account_type` (`user` o `venue`) |
| `parties` | `code` (6 caracteres, único), `name`, `status` (`active` o `ended`), `creator_id`, `creator_is_pro`, `venue_id` y `ended_at` |
| `party_participants` | `role` (`host` o `member`), `drinks` (jsonb por tipo + total) e `is_active`. Solo puede haber una fila activa por usuario |
| `party_media` / `party_notes` | 1 foto o 1 nota por usuario y fiesta |
| `photo_reactions` / `challenge_photo_reactions` | 1 sticker por usuario y foto o respuesta |
| `party_challenges` / `challenge_responses` | Retos (`type`, `question`, `order_number`, `expires_at`, `is_expired`) y sus respuestas |
| `venues` | Locales de OpenStreetMap con `location geography(Point)`, `amenity`, contacto, `is_verified` y `linked_user_id` |
| `venue_offers` / `offer_tickets` | Ofertas del local y tickets por usuario (se canjean una vez) |
| `push_tokens` / `drink_events` | Tokens de Expo Push e historial de bebidas |

**RPC** (`SECURITY DEFINER`):
- Fiesta y bebidas: `join_party_by_code` (límites de 5 o 15 miembros y de una sola fiesta activa), `end_party_by_creator`, `increment_drink` y `decrement_drink` (tope de 50 y solo con la fiesta activa).
- Retos: `create_challenge` y `create_venue_challenge`.
- Locales y ofertas: `create_venue_offer`, `get_venue_offers_for_party`, `get_offer_tickets_for_party`, `redeem_offer_ticket`, `get_nearby_venues` (PostGIS, con filtro por amenity y búsqueda por trigramas) y `get_venue_dashboard_stats`, `get_venue_daily_counts`, `get_active_venue_parties`, `get_user_venue_id`.
- Usuario: `get_user_stats` e `is_username_available`.
- Solo para el servidor: `anonymize_user`, `admin_cleanup_for_deletion`, `admin_sync_premium_status` y `process_expired_challenges` (con un cron cada 30 s).

**Triggers de guarda:** el cliente no puede cambiar `is_premium`, `email`, `provider`, `is_verified`, `account_type`, ni los campos protegidos de `parties` y `party_participants`.

**RLS:** todo está restringido a los participantes de la fiesta mediante `user_party_ids()`.

**Storage:** buckets privados `party-photos` (fotos y `/{party}/challenges/…`) y `user-avatars`, con URLs firmadas de 7 días.

**Realtime:** 10 tablas en `supabase_realtime`.

**Edge Functions:**
- `delete-account`, que llama la app;
- `notify-party-join`, `notify-challenge-created`, `notify-challenge-expired` y `notify-venue-offer`, que se disparan con Database Webhooks y envían por Expo Push;
- `sync-subscription`, que recibe el webhook de RevenueCat y es el único camino para cambiar `is_premium`.

## 8 · Calidad y límites conocidos

- Funciona con mala conexión: datos optimistas con rollback, banner de «sin conexión», pantalla de error con reintento y cachés en AsyncStorage.
- Háptica en todas las acciones. Las animaciones van en el hilo de UI.
- Límites conocidos del original, que se dejan tal cual:
  - el contador solo suma el tipo «beer»;
  - el tablero Pro de la Oca no se bloquea;
  - los canales de reacciones no filtran por fiesta;
  - las URLs firmadas del avatar caducan a los 7 días;
  - la pantalla Recap está oculta y usa datos de ejemplo.
