import { getAccountWithTokens } from "@/lib/accounts";
import { ApiError, intParam, notFound, withSession } from "@/lib/api";
import { tiktokAudited } from "@/lib/features";
import { log } from "@/lib/log";
import { publishers } from "@/lib/platforms";
import { creatorInfo } from "@/lib/platforms/tiktok";
import { isRelayed, relayedTiktokSettings } from "@/lib/platforms/uploadpost";

/** Opciones de la cuenta de TikTok que hay que mostrar antes de publicar (exigido por TikTok). */
export const GET = withSession(async (_req, s, ctx: RouteContext<"/api/accounts/[id]/tiktok-creator">) => {
  const stored = getAccountWithTokens(intParam((await ctx.params).id));
  if (!stored || stored.workspace_id !== s.workspaceId || stored.platform !== "tiktok") throw notFound("La cuenta de TikTok");
  try {
    // A través de Upload-Post: su app ya está auditada por TikTok, así que valen todas las opciones de la cuenta
    if (isRelayed(stored)) {
      const info = await relayedTiktokSettings(stored);
      const meta = JSON.parse(stored.meta || "{}") as { handle?: string | null };
      return Response.json({
        avatarUrl: stored.avatar,
        username: meta.handle ?? null,
        nickname: stored.name,
        privacyOptions: info.privacy_level_options,
        audited: true,
        commentDisabled: !!info.comment_disabled,
        duetDisabled: !!info.duet_disabled,
        stitchDisabled: !!info.stitch_disabled,
        maxDurationS: info.max_video_post_duration_sec ?? null,
      });
    }
    const account = await publishers.tiktok.refresh!(stored);
    const info = await creatorInfo(account);
    return Response.json({
      avatarUrl: info.creator_avatar_url ?? null,
      username: info.creator_username ?? null,
      nickname: info.creator_nickname ?? stored.name,
      // Sin auditoría, TikTok solo acepta publicaciones privadas: no ofrecemos opciones que fallarían
      privacyOptions: tiktokAudited() ? info.privacy_level_options : info.privacy_level_options.filter((p) => p === "SELF_ONLY"),
      audited: tiktokAudited(),
      commentDisabled: !!info.comment_disabled,
      duetDisabled: !!info.duet_disabled,
      stitchDisabled: !!info.stitch_disabled,
      maxDurationS: info.max_video_post_duration_sec ?? null,
    });
  } catch (e) {
    log.warn("tiktok.creator_info_failed", { accountId: stored.id, err: e });
    throw new ApiError(502, "upstream", "TikTok no responde ahora mismo o la cuenta necesita reconectarse");
  }
});
