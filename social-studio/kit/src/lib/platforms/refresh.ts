import type { AccountWithTokens } from "../db";
import { getAccountWithTokens, markNeedsReauth, needsRefresh, updateTokens, withRefreshLock } from "../accounts";
import { HttpError } from "./common";
import { PLATFORM_LABEL } from "./labels";

type NewTokens = { access: string; refresh: string | null; expiresInS?: number };

/**
 * Renueva el token si caduca en menos de 10 min. Serializado por cuenta y releyendo de la base
 * dentro del lock: si otra renovación acaba de terminar, se usa su resultado (refresh tokens rotativos).
 */
export async function refreshIfNeeded(account: AccountWithTokens, doRefresh: (a: AccountWithTokens) => Promise<NewTokens>) {
  if (!needsRefresh(account) || !account.refresh_token) return account;
  return withRefreshLock(account.id, async () => {
    const fresh = getAccountWithTokens(account.id);
    if (!fresh) throw new Error("La cuenta ya no está conectada");
    if (!needsRefresh(fresh) || !fresh.refresh_token) return fresh;
    try {
      const t = await doRefresh(fresh);
      return updateTokens(fresh, t.access, t.refresh, t.expiresInS);
    } catch (e) {
      if (e instanceof HttpError && (e.status === 400 || e.status === 401)) {
        markNeedsReauth(account.id);
        throw new Error(`La conexión con ${PLATFORM_LABEL[account.platform]} caducó: vuelve a conectar la cuenta en Cuentas`);
      }
      throw e;
    }
  });
}
