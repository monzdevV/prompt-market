import { parseJson, withSession } from "@/lib/api";
import { ProfileSchema, saveProfile } from "@/lib/manny/profile";

export const POST = withSession(async (req, s) => {
  saveProfile(s.workspaceId, await parseJson(req, ProfileSchema));
  return Response.json({ ok: true });
});
