import { z } from "zod";
import { createInvite } from "@/lib/auth";
import { ApiError, parseJson, withSession } from "@/lib/api";

const Body = z.object({ note: z.string().trim().max(200).default("") });

export const POST = withSession(async (req, s) => {
  if (!s.isAdmin) throw new ApiError(403, "forbidden", "Solo para administradores");
  const { note } = await parseJson(req, Body);
  return Response.json({ code: createInvite(s.userId, note) });
});
