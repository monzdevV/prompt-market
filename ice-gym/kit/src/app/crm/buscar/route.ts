import { buscarGlobal } from "@/lib/datos/buscar";

/**
 * Búsqueda de la paleta como GET y no como server action: las acciones se
 * ejecutan en cola y bloquean la navegación hasta que terminan; un fetch
 * se puede cancelar y no retiene al router.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await buscarGlobal(q), { headers: { "Cache-Control": "private, no-store" } });
}
