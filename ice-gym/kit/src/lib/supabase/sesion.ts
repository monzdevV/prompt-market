import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refresca la sesión de Supabase y devuelve la respuesta con las cookies ya
 * actualizadas, junto al usuario, para que el proxy decida a dónde va la petición.
 */
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getClaims valida el JWT en local (claves asimétricas) y solo llama a Auth
  // cuando hay que refrescar el token; getUser iba a la red en cada petición.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  return { response, user };
}

/** Traslada las cookies ya refrescadas a otra respuesta (redirección o rewrite). */
export function conCookies(origen: NextResponse, destino: NextResponse) {
  origen.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
  return destino;
}
