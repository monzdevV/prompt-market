import { parseJson, withSession } from "@/lib/api";
import { saveSettings, SettingsSchema } from "@/lib/settings";

export const POST = withSession(async (req, s) => {
  saveSettings(s.workspaceId, await parseJson(req, SettingsSchema));
  return Response.json({ ok: true });
});
