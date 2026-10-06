import type { z } from "zod";
import type { SessionInfo } from "./auth";
import { getSession } from "./session";
import { log } from "./log";
import { ApiError, badRequest, notFound, unauthorized } from "./errors";

export { ApiError, badRequest, conflict, notFound, unauthorized } from "./errors";

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
  const id = crypto.randomUUID();
  log.error("api.unhandled", { errorId: id, err: e });
  // Nunca se devuelve el mensaje interno: puede contener rutas, SQL o respuestas de terceros
  return Response.json({ error: "Error inesperado. Si se repite, avísanos con este código: " + id.slice(0, 8), code: "internal" }, { status: 500 });
}

/**
 * Envuelve un handler de API: exige sesión y convierte errores en respuestas JSON coherentes.
 * La autorización real se hace en cada consulta filtrando por session.workspaceId.
 */
export function withSession<Ctx>(handler: (req: Request, session: SessionInfo, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const session = await getSession();
      if (!session) throw unauthorized();
      return await handler(req, session, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("El cuerpo de la petición no es JSON válido");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Los esquemas llevan mensajes en español; los mensajes por defecto de zod (en inglés) no se muestran
    const msg = parsed.error.issues[0]?.message ?? "";
    throw badRequest(msg && !/^(Invalid|Too |Unrecognized|Expected)/.test(msg) ? msg : "Datos no válidos");
  }
  return parsed.data;
}

/** Id numérico de la ruta; cualquier otra cosa es 404 (no 500). */
export function intParam(value: string) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw notFound();
  return n;
}

/** Rechaza peticiones que cambian datos lanzadas desde otra web (para rutas fuera del proxy). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const own = new URL(req.url).origin;
  if (origin !== own && origin !== process.env.APP_URL?.replace(/\/$/, "")) {
    throw new ApiError(403, "forbidden", "Origen no permitido");
  }
}
