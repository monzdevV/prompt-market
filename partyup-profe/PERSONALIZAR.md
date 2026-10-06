# PERSONALIZAR · mapa exacto de cambios

Las rutas son relativas a `kit/` y los datos salen de `negocio.json`. Ve en orden. Los números de línea son orientativos: busca siempre el texto literal.

> **Qué no se toca:** la navegación (`app/`), las animaciones, los componentes de `src/components`, la lógica de `src/services` y `src/store`, las políticas RLS ni las funciones SQL. Tampoco los límites de negocio (5/15 miembros, 50 bebidas, 3 retos), salvo que el comprador lo pida expresamente. En ese caso cambia **a la vez** la constante del cliente y la función SQL.

---

## 1 · Identidad de la app (obligatorio)

### `app.json`

| Campo | Valor actual | Qué cambiar |
|---|---|---|
| `expo.name` | `"PartyUp"` | nombre visible bajo el icono (12 caracteres como mucho para que no se corte) |
| `expo.slug` | `"previasplus"` | slug del comprador, en minúsculas y con guiones (`mi-app`) |
| `expo.scheme` | `"previasplus"` | slug sin guiones (`miapp`). Es el esquema de los deep links |
| `expo.version` | `"1.0.0"` | se deja |
| `ios.bundleIdentifier` | `"com.previasplus.app"` | `com.<dominio-invertido>.<app>`, único en el App Store. **No se puede cambiar después de publicar** |
| `android.package` | `"com.previasplus.app"` | el mismo identificador (solo letras, números, puntos y `_`). **Tampoco se puede cambiar después de publicar** |
| `ios.infoPlist.NS*UsageDescription` (×5) y los textos de permisos de los plugins `expo-camera`, `expo-media-library` y `expo-location` (×6) | «PartyUp needs…» | el nombre nuevo. Apple revisa estos textos: escríbelos en el idioma principal de la ficha y explica el porqué real |
| `ios.associatedDomains` | `applinks:previasplus.app`, `applinks:www.previasplus.app` | el dominio del comprador o **quita la clave entera** si no tiene web con `apple-app-site-association`. La app no usa universal links en el código |
| `android.adaptiveIcon.backgroundColor` | `"#E6F4FE"` | color de fondo del icono adaptativo (normalmente el de la marca o `#0A0A0B`) |
| plugin `expo-notifications` → `color` | `"#BFFF00"` | color de acento (Android tiñe el icono de la notificación) |
| plugin `@react-native-google-signin/google-signin` → `iosUrlScheme` | `com.googleusercontent.apps.211379568936-…` | **el del comprador**: el «iOS URL scheme» de su cliente OAuth de iOS en Google Cloud. Con el del original, el login de Google no funciona |
| `extra.eas.projectId` | `cef320e2-5107-4855-bab3-51970840107d` | **bórralo** y ejecuta `eas init`, que escribe el del comprador |

### Resto de identidad

| Archivo | Qué hay | Qué cambiar |
|---|---|---|
| `package.json` | `"name": "previasplus"` | slug |
| `src/services/notificationService.ts` ~62 | `projectId: 'cef320e2-…'` escrito a mano | el mismo `projectId` que deja `eas init` en `app.json`. Si no coincide, los avisos push no llegan |
| `eas.json` → `submit.production.ios` | `TU_APPLE_ID@ejemplo.com`, `TU_ASC_APP_ID`, `TU_TEAM_ID` | Apple ID, el App ID numérico de App Store Connect y el Team ID del comprador (solo para `eas submit`) |
| `src/components/ui/BrandName.tsx` ~25-26 | logotipo de texto `Party` (blanco) + `Up` (lima) | las dos partes del nombre. Por ejemplo, «Previa» + «Club». Lo usan Login y Home |
| `src/screens/onboarding/OnboardingScreen.tsx` ~522 | `PARTYUP` en la notificación de ejemplo | nombre en mayúsculas |
| `src/screens/profile/ProfileScreen.tsx` ~569 | `PartyUp v{versión}` | nombre |
| `src/components/party/TearTicket.tsx` ~157 | `subtitle = 'Admit One - PartyUp'` | `'Admit One - <Nombre>'` |
| `src/i18n/locales/{es,en,fr,de,it}.json` → `party.shareMessage` (línea ~114) | «…en PartyUp!» | nombre, en los 5 idiomas |
| `supabase/functions/notify-*/index.ts` (×4) | `title: 'PartyUp'` | nombre (es el título de los avisos push) |
| `src/services/instagramService.ts` ~18, ~31 | `source_application=partyup` | slug |
| `app/_layout.tsx` ~48 | `const PreviasDarkTheme` | opcional, es interno |

### Claves internas

- **Claves de AsyncStorage** `@beparty/…` (en `src/hooks/useLocation.ts`, `src/i18n/index.ts`, `src/screens/calendar/CalendarScreen.tsx` ×2 y `src/services/prefetchService.ts`) y `@previasplus_players` (en `src/store/gameStore.ts`): cámbialas a `@<slug>/…`. Es opcional en una app nueva, porque nadie tiene datos antiguos.
- **Entitlement de RevenueCat** `'PartyUp Pro'`: está en `src/services/subscriptionService.ts` ~21 y en `supabase/functions/sync-subscription/index.ts` ~26. Tiene que coincidir **exactamente** con el *identifier* del entitlement que el comprador cree en RevenueCat. Si se cambia, cámbialo en los dos sitios.

## 2 · Iconos y splash (`assets/images/`)

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon-ios.png` | 1024×1024, sin transparencia | icono de iOS (`expo.icon` e `ios.icon`) |
| `icon.png` | 1024×1024 | icono de la notificación en Android y origen de `splash-icon.png` |
| `icon-splash.png` | 1024×1024, PNG con transparencia | splash nativo (a 80 px de ancho sobre `#0A0A0B`) **y** pantalla de carga de `app/_layout.tsx` |
| `android-icon-foreground.png` / `-background.png` / `-monochrome.png` | 512×512 / 512×512 / 432×432 | icono adaptativo de Android. El logo tiene que caber en el 66 % central |
| `favicon.png` | 48×48 | solo web (la web no está soportada, ver SPEC) |
| `splash-icon.png` | 1024×1024 | lo genera `node scripts/generate-splash.js` a partir de `icon.png`. No lo usa la app |

Si el comprador solo da un logo cuadrado de 1024 px, genera todos los tamaños con `sharp` (ya viene en las devDependencies). Mantén los mismos nombres de archivo y comprueba que el fondo del icono de iOS es opaco.

## 3 · Color (solo si el comprador lo cambia)

El lima `#BFFF00` es la firma de la app y sale en dos sitios:

1. **`src/constants/theme.ts`**: `Colors.primary` (`main`, `light`, `dark`, `muted` = rgba al 15 %, `glow` = rgba al 40 %, `gradient`), `Colors.border.accent`, `Colors.text.link`, `Colors.text.accent` y `Colors.gradients.lime`, `limeToBlue` y `glow`.
2. **Escrito a mano** como `#BFFF00` o `rgba(191, 255, 0, …)` en 12 archivos: `theme.ts`, `AvatarSetupScreen.tsx`, `UsernameSetupScreen.tsx`, `CalendarScreen.tsx`, `ClubDetailSheet.tsx`, `OnboardingScreen.tsx`, `CreatePartyScreen.tsx`, `JoinPartyScreen.tsx`, `app/note-sheet.tsx`, `app/party/challenge-question.tsx`, `app/photo-sheet.tsx` y `app/venue/challenge-question.tsx`. Sustituye cada uno conservando su opacidad.

Además, `app.json` → `expo-notifications.color`.

Reglas:
- El acento va siempre sobre negro `#0A0A0B`. Encima del acento, el texto va en negro (`Colors.text.inverse`). Comprueba un contraste ≥ 4,5:1 calculándolo. Los colores muy oscuros (azul marino, granate) no funcionan como acento en esta app.
- No toques los degradados de cada juego, los colores de los tipos de reto (naranja, morado, verde) ni los de las casillas de la Oca: son parte del diseño.

## 4 · Textos e idioma

- **Interfaz:** `src/i18n/locales/es.json` (y en, fr, de, it). El idioma se elige automáticamente según el del móvil, y si no está entre esos cinco usa inglés (`FALLBACK_LANGUAGE` en `src/i18n/index.ts`). Si el comprador solo quiere español, cambia `FALLBACK_LANGUAGE` a `'es'`. No borres los demás idiomas.
- **Contenido de los juegos (EN INGLÉS, escrito a mano en el código):**
  - `src/screens/games/NeverHaveIEverGame.tsx`: 30 frases «I have never ever…»
  - `MostLikelyToGame.tsx`: 35
  - `WouldYouRatherGame.tsx`: 35
  - `TruthOrDareGame.tsx`: ~90 verdades y retos
  - `ImpostorGame.tsx`: 48 palabras
  - `LaOcaGame.tsx`: ~65 retos de casilla y las etiquetas de `SQUARE_TYPES`

  Si el público es hispanohablante, **traduce estos arrays al español** manteniendo su estructura y el mismo número de elementos. Es la mejora de mayor impacto.
- **Banco de preguntas sin conectar:** `assets/preguntas/*.csv` trae unas 1.100 frases de «Yo nunca» (chill, hot y party) en 8 idiomas, español incluido, pero el código no las lee. Conectarlas es una mejora opcional y **no** forma parte de la personalización: proponla y hazla solo si el comprador la pide.
- **Textos sueltos en inglés:**
  - `PlayerSetup.tsx` (~194, ~214, ~256)
  - `note-editor.tsx` ~121 («Note not saved»)
  - `ProfileScreen.tsx` ~436 («Not set»)
  - `ClubDetailSheet.tsx` ~149 («Nightclub/Pub»)
  - avisos push de `supabase/functions/notify-*` (body)

  Tradúcelos si la app va a salir solo en español.
- **Enlaces legales:** «Términos de Servicio» y «Política de Privacidad» no hacen nada (en Login, Perfil y Paywall). **Apple y Google exigen una política de privacidad** para publicar una app con login, fotos y ubicación. Pide las URLs al comprador y enlázalas con `Linking.openURL` en esos tres sitios. Busca `handleTermsPress` y `handlePrivacyPress` en `LoginScreen.tsx`, `privacyPolicy` y `termsOfService` en `ProfileScreen.tsx`, y el aviso legal al pie de `PaywallScreen.tsx`. Los tres enlaces de «Soporte» del perfil están vacíos: pon el email de soporte o quítalos.

## 5 · Datos de ejemplo

- `src/screens/calendar/CalendarScreen.tsx` ~588-596: si no hay recuerdo de hace un año, se muestra una fiesta **falsa** «Friday Vibes» (`id: 'mock-memory'`) que lleva a una ficha inexistente. Antes de publicar, quita ese bloque `else { … }` para que no aparezca la tarjeta. Es un dato inventado.
- `src/screens/recap/RecapScreen.tsx`: pantalla oculta con datos de ejemplo («Previa en casa de Juan»). No tiene acceso desde la interfaz, así que se deja.
- `OnboardingScreen.tsx`: la notificación de ejemplo «Laura te ha invitado a…» es ilustrativa. Se puede dejar.

## 6 · Imágenes, GIF y vídeos

- `assets/onboarding/fondo-1..3.jpg`: fondos neutros del onboarding. Sustituye por fotos propias en vertical, de 1080×1920 como mucho, **con permiso de las personas que salgan**.
- `assets/boarding/*.mp4`, `assets/games_preview/*.mp4` y `assets/videos/login_video.mov`: vídeos del onboarding, de los juegos y del login. Su licencia no está documentada en el original. Recomienda al comprador sustituirlos por vídeos propios o de stock con licencia antes de publicar.
- `assets/gifs/` y `assets/party_gifs/`: stickers y fondos animados sacados de GIPHY. Los de series de TV se han quitado del kit (ver README). Los demás llevan marcas de terceros en el nombre del archivo; para una app comercial, lo más seguro es sustituirlos por GIF propios o con licencia. Si sustituyes un archivo, mantén el nombre o actualiza su `require()` en:
  - `src/constants/partyBackgrounds.ts`
  - `src/screens/home/HomeScreen.tsx`
  - `src/components/ui/SwipeToCreateButton.tsx`
  - `src/screens/party/CreatePartyScreen.tsx`
  - `src/types/index.ts` (`REACTION_STICKERS`)
  - los juegos
- `assets/emojis/*.png`: emojis 3D. Si son Microsoft Fluent Emoji, la licencia es MIT. Confírmalo con el comprador.

## 7 · Base de datos y servicios

- `supabase/00_schema.sql` se ejecuta tal cual. No hay seeds de demo: los datos los crean los usuarios.
- **Locales (pestaña Clubs):** se cargan con `scripts/import-venues.ts` desde `assets/discotecas/discotecas.geojson`. Son 18.112 bares y discotecas de toda España sacados de OpenStreetMap, con licencia ODbL, que **obliga a citar «© colaboradores de OpenStreetMap»** en la app o en la ficha. Para otro país, exporta un GeoJSON nuevo con overpass-turbo (`amenity=nightclub` y `amenity=pub`) con el mismo formato.
- **Cuenta de local (panel de discoteca):** no hay alta desde la app. Se crea a mano en SQL:
  1. Pon `users.account_type='venue'` y `is_verified=true`.
  2. Pon `venues.linked_user_id = <id del usuario>` y `venues.is_verified=true`.

  El SQL exacto está en `PROMPT.md`, fase 5.

## 8 · Comprobación final

```
grep -rniE "partyup|previasplus|beparty|211379568936|cef320e2|alvaro" app src scripts supabase/functions app.json package.json eas.json
```

No debería salir nada, salvo que el comprador mantenga el nombre. Excepciones aceptables: `onPartyUpdate` (es un nombre de función) y los comentarios `PARTYUP …` de cabecera de archivo, que no se ven.

Después:

```
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```
