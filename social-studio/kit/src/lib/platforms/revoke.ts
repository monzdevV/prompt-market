import type { AccountWithTokens } from "../db";
import { form, http } from "./common";
import { TIKTOK_FORM_HEADERS } from "./tiktok";
import { isRelayed } from "./uploadpost";

/**
 * Retira en la red el acceso que nos dio el usuario al desconectar (no solo borramos nuestra copia).
 *  - Google: POST https://oauth2.googleapis.com/revoke (obligatorio por las políticas de YouTube, III.D.2.1)
 *    developers.google.com/youtube/v3/guides/auth/server-side-web-apps
 *  - TikTok: POST /v2/oauth/revoke/  developers.tiktok.com/doc/oauth-user-access-token-management
 *  - Meta: solo guardamos tokens de Página (no el de usuario), así que no se puede revocar el permiso de la app
 *    desde aquí; el usuario puede quitarlo en Facebook > Configuración > Integraciones empresariales.
 * Devuelve si se revocó en la red.
 */
export async function revokeAtProvider(account: AccountWithTokens): Promise<boolean> {
  // Conectada a través de Upload-Post: el permiso es suyo; se retira borrando el perfil o desde su página de conexión
  if (isRelayed(account)) return false;
  switch (account.platform) {
    case "youtube":
      await http("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        body: form({ token: account.refresh_token ?? account.access_token }),
      });
      return true;
    case "tiktok":
      await http("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: TIKTOK_FORM_HEADERS,
        body: form({
          client_key: process.env.TIKTOK_CLIENT_KEY ?? "",
          client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "",
          token: account.access_token,
        }),
      });
      return true;
    default:
      return false;
  }
}
