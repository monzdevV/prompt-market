# PartyUp · App móvil de fiestas y previas (iOS + Android)

**Una app social para que tus amigos conviertan cada previa en una sala compartida, con contador de bebidas, fotos, retos, tickets de oferta y 6 juegos de fiesta. Tu propia IA la instala con tu marca.**

Pegas un prompt, contestas unas 25 preguntas (nombre, icono, color, identificadores y cuentas) y la IA instala, personaliza, monta el backend en Supabase y prepara los builds para las tiendas. Tienes la app de la demo con tu nombre y tu icono, lista para publicar en Google Play y en el App Store.

## Qué incluye

**Fiestas**
- Crear una fiesta con un código de 6 letras o unirse a una. Fiestas de 5 personas, o de 15 con Pro.
- Contador de bebidas compartido en tiempo real, con partículas y háptica.
- Una foto y una nota por persona, con visor a pantalla completa y reacciones con stickers animados.
- Retos con cuenta atrás de 15 min (foto, nota o «hecho»), con revelado deslizando y pantalla de resultados.
- Tickets de oferta (2x1, 3x2…) que se rompen deslizando, con confeti.
- Archivo de fiestas pasadas en rejilla o calendario, con «Un día como hoy, hace un año».

**Juegos (sin conexión)**
- Impostor, Verdad o reto, La Oca (tablero en espiral con dado animado), Prefieres, Yo nunca y Quién es más probable.
- Cartas que se descartan deslizando, categorías chill, party y hot, y jugadores guardados.

**Locales**
- Pestaña «Clubs» con bares y discotecas cercanos: incluye los 18.112 locales de España de OpenStreetMap y un script para importarlos.
- Panel para discotecas asociadas: estadísticas y envío de retos y ofertas a las fiestas activas en el local.

**Cuenta y negocio**
- Login con Apple y Google, nombre de usuario y avatar.
- Estadísticas en el perfil y borrado de cuenta con anonimización.
- Suscripción Pro con RevenueCat (paywall, restaurar compras y webhook que sincroniza el estado Pro).
- Avisos push cuando alguien se une, cuando hay un reto nuevo o terminado y cuando llega una oferta.
- Interfaz en 5 idiomas: español, inglés, francés, alemán e italiano.

**Técnico:** Expo SDK 54, React Native 0.81, expo-router 6, Reanimated 4, Skia y Supabase (Postgres con RLS, Realtime, Storage, Edge Functions, pg_cron y PostGIS). Builds con EAS. Unas 47.000 líneas de TypeScript.

## Qué necesitas

- Una IA. Lo ideal es un agente que toque archivos (Claude Code, Cursor, Windsurf, Codex). En modo chat también se puede, pero hay muchos pasos en paneles externos.
- Node.js 20 o superior y un móvil, Android o iPhone.
- Cuentas gratis: **Expo**, **Supabase**, **Google Cloud** (para el login con Google) y, si quieres cobrar, **RevenueCat**.
- Para publicar:
  - **Google Play: 25 $, pago único.** Las cuentas personales nuevas tienen que hacer antes una prueba cerrada con 12 testers durante 14 días.
  - **Apple Developer Program: 99 $ al año.** También hace falta para probar en un iPhone físico.
- Una **política de privacidad** publicada en una URL. Las dos tiendas la exigen.

## Cómo se usa

1. Descomprime el paquete.
2. Abre tu IA en esa carpeta.
3. Pega el contenido de `PROMPT.md`.
4. Responde a las preguntas.

Tiempo estimado:
- De 2 a 4 horas con un agente, hasta tenerla en tu móvil Android.
- De 1 a 2 días hasta enviarla a revisión, sobre todo por las cuentas, las credenciales de login y las fichas de las tiendas.
- Más del doble en modo chat.

## Contenido del paquete

| Archivo | Para qué |
|---|---|
| `PROMPT.md` | El prompt maestro que pegas en tu IA |
| `PERSONALIZAR.md` | El mapa de cambios que sigue la IA |
| `SPEC.md` | La especificación completa, por si quieres reconstruirla sin el kit |
| `kit/` | El código fuente completo y verificado: `tsc` sin errores, `expo-doctor` sin errores de dependencias y `expo export` para Android e iOS correcto |
| `kit/supabase/00_schema.sql` | La base de datos entera en un solo script, probada en una base limpia |

## Avisos (léelos antes de comprar)

- **No funciona en Expo Go ni en web.** Usa módulos nativos (login con Apple y Google, compras), así que se prueba con un *development build* que se instala en el móvil. El prompt te guía.
- **El contenido de los juegos está en inglés** (unas 300 frases). La interfaz sí está traducida. La IA te lo traduce si se lo pides. También vienen unas 1.100 frases de «Yo nunca» en 8 idiomas en CSV, sin conectar todavía.
- **Los vídeos y los GIF son de ejemplo.** Proceden de GIPHY o de stock y su licencia no está documentada. Sustitúyelos por material propio o con licencia antes de publicar. Por derechos, del kit se han **retirado** los GIF de series de TV (Padre de familia, The Office, Broad City, Bob Esponja y los Minions) y las fotos de personas reales del onboarding, que se han cambiado por fondos neutros.
- **Es una app centrada en el alcohol:** las tiendas te pedirán clasificación 18+ y la revisión de Apple puede ser más exigente.
- **No incluye web ni panel de administración.** La gestión se hace desde el panel de Supabase, y el alta de locales asociados con una consulta SQL que viene en el prompt.
- Detalles conocidos del original, documentados en `SPEC.md` §8:
  - el contador de bebidas suma siempre «cerveza»;
  - el tablero Pro de la Oca no está bloqueado;
  - los enlaces legales están por conectar (el prompt lo hace).
