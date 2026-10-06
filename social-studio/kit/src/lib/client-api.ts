/** fetch para el navegador: devuelve el JSON o lanza un Error con el mensaje que da la API. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new Error("Sin conexión con el servidor. Revisa tu internet.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Respuesta sin JSON
  }
  if (!res.ok) {
    // Sesión caducada: recarga completa para limpiar el estado de la app (fuera de React, sin router)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (res.status === 401 && (data as { code?: string } | null)?.code === "unauthorized" && typeof window !== "undefined") window.location.href = "/entrar";
    const msg = (data as { error?: string } | null)?.error;
    throw new Error(msg || `Error ${res.status}`);
  }
  return data as T;
}
