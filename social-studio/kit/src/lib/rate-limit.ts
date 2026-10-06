/**
 * Limitador en memoria (ventana deslizante). Suficiente mientras la app sea un único proceso;
 * al escalar a varias instancias hay que moverlo a Redis/Postgres.
 */
// Cada clave guarda su propia ventana: la limpieza nunca borra antes de tiempo un contador de ventana larga
const hits = new Map<string, { windowMs: number; t: number[] }>();
const MAX_KEYS = 50_000;

function prune(now: number) {
  for (const [k, v] of hits) if (!v.t.some((t) => now - t < v.windowMs)) hits.delete(k);
  // Tope duro de memoria: si aun así hay demasiadas claves, fuera las más antiguas (orden de inserción)
  // (se deja un 10 % de margen para no recorrer el mapa entero en cada petición)
  for (const k of hits.keys()) {
    if (hits.size <= MAX_KEYS * 0.9) break;
    hits.delete(k);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key)?.t ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.delete(key); // reinsertar = pasa al final: el orden del mapa es «usado más recientemente»
    hits.set(key, { windowMs, t: recent });
    return { ok: false as const, retryAfterS: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.delete(key);
  hits.set(key, { windowMs, t: recent });
  if (hits.size > MAX_KEYS) prune(now);
  return { ok: true as const };
}

/** Consulta sin sumar un intento (para contar solo los fallos). */
export function peekRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key)?.t ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return { ok: false as const, retryAfterS: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  return { ok: true as const };
}

/** Olvida un contador (p. ej. los fallos de inicio de sesión tras restablecer la contraseña). */
export function clearRateLimit(key: string) {
  hits.delete(key);
}

/**
 * IP del cliente según el proxy de confianza (TRUST_PROXY):
 *  - "cloudflare" (por defecto): cf-connecting-ip, que Cloudflare siempre sobrescribe. Para que nadie
 *    pueda inventarla, el servidor debe escuchar solo en 127.0.0.1 y recibir tráfico solo del túnel.
 *  - "forwarded": primer valor de x-forwarded-for (detrás de Nginx/Caddy configurados para fijarlo).
 *  - "none": no se usa ninguna cabecera (todas las peticiones comparten el límite por IP).
 */
export function clientIp(req: Request) {
  const trust = process.env.TRUST_PROXY ?? "cloudflare";
  if (trust === "cloudflare") return req.headers.get("cf-connecting-ip") ?? "local";
  if (trust === "forwarded") return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return "local";
}
