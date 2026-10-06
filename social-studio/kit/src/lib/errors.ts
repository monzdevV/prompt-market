/** Error esperado que el frontend puede mostrar tal cual (sin dependencias de Next: usable en tests y trabajos). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "unauthorized", "Tu sesión ha caducado, vuelve a entrar");
export const notFound = (what = "El recurso") => new ApiError(404, "not_found", `${what} no existe`);
export const badRequest = (msg: string) => new ApiError(400, "bad_request", msg);
export const conflict = (msg: string) => new ApiError(409, "conflict", msg);
