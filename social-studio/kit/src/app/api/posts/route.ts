import { parseJson, withSession } from "@/lib/api";
import { createPost, CreatePostSchema } from "@/lib/posts";

export const POST = withSession(async (req, s) => {
  const input = await parseJson(req, CreatePostSchema);
  const id = createPost(s.workspaceId, s.userId, input);
  return Response.json({ id });
});
