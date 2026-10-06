import fs from "node:fs";
import { Readable } from "node:stream";
import { errorResponse, notFound, unauthorized } from "@/lib/api";
import { getMedia, mediaFilePath } from "@/lib/media";
import { getSession } from "@/lib/session";
import { parseRange } from "@/lib/core/range";

/** Sirve el vídeo (solo al espacio de trabajo dueño) con soporte de Range para previsualizarlo. */
export async function GET(request: Request, ctx: RouteContext<"/api/media/[id]/file">) {
  try {
    const session = await getSession();
    if (!session) throw unauthorized();
    const media = getMedia(session.workspaceId, (await ctx.params).id);
    if (!media) throw notFound("El vídeo");
    const file = mediaFilePath(media);
    let size: number;
    try {
      size = fs.statSync(file).size;
    } catch {
      throw notFound("El archivo del vídeo");
    }
    const headers = { "Content-Type": media.mime, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      const range = parseRange(rangeHeader, size);
      if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      const stream = Readable.toWeb(fs.createReadStream(file, range)) as ReadableStream;
      return new Response(stream, {
        status: 206,
        headers: {
          ...headers,
          "Content-Length": String(range.end - range.start + 1),
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
        },
      });
    }
    const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
    return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
  } catch (e) {
    return errorResponse(e);
  }
}
