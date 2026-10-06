import { z } from "zod";
import { badRequest, parseJson, withSession } from "@/lib/api";
import { getProfile } from "@/lib/manny/profile";
import { addStarterAccounts, addTracked } from "@/lib/manny/radar";
import { parseAccount } from "@/lib/manny/social";

const Body = z.union([
  z.object({ starter: z.literal(true) }),
  z.object({
    account: z.string().trim().min(1, "Escribe el usuario o pega el enlace del perfil").max(200, "Demasiado largo"),
    platform: z.enum(["tt", "yt"]).default("tt"),
    kind: z.enum(["ref", "own"]).default("ref"),
    grupo: z.string().trim().max(40, "El grupo admite hasta 40 caracteres").default(""),
  }),
]);

/** Añade una cuenta al radar (o las de partida). Después el navegador la sincroniza. */
export const POST = withSession(async (req, s) => {
  const body = await parseJson(req, Body);
  if ("starter" in body) {
    const own = getProfile(s.workspaceId).tiktok.match(/@([A-Za-z0-9._]+)/)?.[1]?.toLowerCase() ?? null;
    return Response.json({ added: addStarterAccounts(s.workspaceId, own) });
  }
  const handle = parseAccount(body.account, body.platform);
  if (!handle) {
    throw badRequest(body.platform === "tt" ? "Eso no parece un usuario de TikTok. Escribe @usuario o pega el enlace de su perfil." : "Eso no parece un canal de YouTube. Escribe @canal o pega su enlace.");
  }
  return Response.json({ id: addTracked(s.workspaceId, { platform: body.platform, handle, kind: body.kind, grupo: body.grupo }) });
});
