import { disconnectAccount, getAccountWithTokens } from "@/lib/accounts";
import { intParam, notFound, withSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { log } from "@/lib/log";
import { revokeAtProvider } from "@/lib/platforms/revoke";
import { refreshPostStatus } from "@/lib/posts";
import { deleteProviderData } from "@/lib/sync";

/**
 * Desconecta la cuenta:
 *  1. retira el acceso en la red (Google y TikTok lo permiten),
 *  2. borra nuestros tokens y cancela lo pendiente,
 *  3. YouTube: borra además los datos leídos de su API (sus políticas exigen hacerlo en ≤ 7 días).
 * El historial de lo publicado desde la app se conserva.
 */
export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/accounts/[id]">) => {
  const id = intParam((await ctx.params).id);
  const account = getAccountWithTokens(id);
  if (!account || account.workspace_id !== s.workspaceId) throw notFound("La cuenta");

  let revoked = false;
  try {
    revoked = await revokeAtProvider(account);
  } catch (e) {
    // Si la red no responde, desconectamos igualmente: nuestros tokens se borran y el usuario puede retirar el acceso desde la red
    log.warn("account.revoke_failed", { accountId: id, platform: account.platform, err: e });
  }
  const affected = disconnectAccount(s.workspaceId, id);
  if (affected === null) throw notFound("La cuenta");
  for (const postId of affected) refreshPostStatus(postId);
  if (account.platform === "youtube") deleteProviderData(id);
  audit({ workspaceId: s.workspaceId, actorUserId: s.userId, action: "account.disconnect", targetType: "account", targetId: id, meta: { platform: account.platform, revoked } });
  return Response.json({ ok: true, revoked });
});
