import { z } from "zod";
import { parseJson, withSession } from "@/lib/api";
import { deleteMannyScript, setScriptStatus } from "@/lib/manny/scripts";
import { SCRIPT_STATUSES } from "@/lib/manny/types";

const Body = z.object({ status: z.enum(SCRIPT_STATUSES, "Estado no válido") });

export const POST = withSession(async (req, s, ctx: RouteContext<"/api/manny/scripts/[id]">) => {
  const { id } = await ctx.params;
  const { status } = await parseJson(req, Body);
  setScriptStatus(s.workspaceId, id, status);
  return Response.json({ ok: true });
});

export const DELETE = withSession(async (_req, s, ctx: RouteContext<"/api/manny/scripts/[id]">) => {
  deleteMannyScript(s.workspaceId, (await ctx.params).id);
  return Response.json({ ok: true });
});
