import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion, conCookies } from "@/lib/supabase/sesion";

/** Ruta de acceso al CRM: es la única bajo /crm que no pide sesión. */
const RUTA_ACCESO = "/crm/acceso";

/**
 * - Refresca la sesión de Supabase en cada petición.
 * - Protege todo lo que cuelga de /crm salvo la pantalla de acceso.
 * - Si el dominio empieza por "crm-", la raíz sirve el CRM directamente.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await actualizarSesion(request);

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const esDominioCrm = host.startsWith("crm-");
  const { pathname, search } = request.nextUrl;

  // En el dominio del CRM, "/" muestra el panel sin cambiar la URL del navegador.
  const reescribirACrm = esDominioCrm && pathname === "/";
  const rutaEfectiva = reescribirACrm ? "/crm" : pathname;

  if (rutaEfectiva.startsWith("/crm")) {
    const esAcceso = rutaEfectiva === RUTA_ACCESO;

    if (!user && !esAcceso) {
      const destino = request.nextUrl.clone();
      destino.pathname = RUTA_ACCESO;
      destino.search = "";
      if (!reescribirACrm && rutaEfectiva !== "/crm") {
        destino.searchParams.set("siguiente", pathname + search);
      }
      return conCookies(response, NextResponse.redirect(destino));
    }

    if (user && esAcceso) {
      const destino = request.nextUrl.clone();
      destino.pathname = "/crm";
      destino.search = "";
      return conCookies(response, NextResponse.redirect(destino));
    }
  }

  if (reescribirACrm) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/crm";
    return conCookies(response, NextResponse.rewrite(destino));
  }

  return response;
}

export const config = {
  matcher: [
    // Todo menos los estáticos de Next y los archivos con extensión.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff2?)$).*)",
  ],
};
