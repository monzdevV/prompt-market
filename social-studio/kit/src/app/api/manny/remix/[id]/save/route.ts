import { z } from "zod";
import { parseJson, withSession } from "@/lib/api";
import { saveVersionAsScript } from "@/lib/manny/remix";

const Body = z.object({ index: z.number().int().min(0).max(2) });

/** Guarda una de las versiones como guion en «Guiones». */
export const POST = withSession(async (req, s, ctx: RouteContext<"/api/manny/remix/[id]/save">) => {
  const { index } = await parseJson(req, Body);
  const id = saveVersionAsScript(s.workspaceId, (await ctx.params).id, index);
  return Response.json({ id });
});
