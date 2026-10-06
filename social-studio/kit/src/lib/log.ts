/**
 * Logs estructurados en una línea JSON (fáciles de filtrar con grep/jq o de enviar a un agregador).
 * Nunca registres tokens, contraseñas ni el contenido de cookies.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown> & { err?: unknown };

const SECRET_KEYS = /token|secret|password|authorization|cookie|code_verifier|signed_request/i;
// Secretos incrustados en textos (p. ej. una URL con ?access_token=… dentro del mensaje de un error)
const SECRET_IN_TEXT = /((?:access_token|refresh_token|client_secret|code|token|key)=)[^&\s"']+/gi;
const BEARER = /(Bearer|OAuth)\s+[A-Za-z0-9._\-~+/=]+/g;

export function scrub(text: string) {
  return text.replace(SECRET_IN_TEXT, "$1[oculto]").replace(BEARER, "$1 [oculto]");
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (typeof value === "string") return scrub(value);
  if (value instanceof Error) return { message: scrub(value.message), name: value.name, stack: value.stack && scrub(value.stack) };
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEYS.test(k) ? "[oculto]" : redact(v, depth + 1);
    return out;
  }
  return value;
}

function serialize(fields: Fields) {
  return redact(fields) as Record<string, unknown>;
}

function write(level: Level, msg: string, fields: Fields = {}) {
  if (level === "debug" && process.env.LOG_LEVEL !== "debug") return;
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...serialize(fields) });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, f?: Fields) => write("debug", msg, f),
  info: (msg: string, f?: Fields) => write("info", msg, f),
  warn: (msg: string, f?: Fields) => write("warn", msg, f),
  error: (msg: string, f?: Fields) => write("error", msg, f),
};
