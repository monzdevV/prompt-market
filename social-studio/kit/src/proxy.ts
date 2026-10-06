import { NextResponse, type NextRequest } from "next/server";

// Nombre de la cookie de sesión: con HTTPS lleva el prefijo __Host- (ver lib/session.ts)
const SESSION_COOKIES = ["ss_session", "__Host-ss_session"];
const PUBLIC_PAGES = new Set(["/", "/entrar", "/registro", "/recuperar", "/restablecer", "/verificar", "/precios", "/privacidad", "/terminos", "/eliminar-datos", "/eliminar-datos/estado", "/contacto", "/seguridad", "/aviso-legal", "/cookies"]);
// El callback de Meta no lleva cookie ni Origin propio: se autentica con la firma HMAC del signed_request
const PUBLIC_API = ["/api/auth/", "/api/health", "/api/meta/data-deletion", "/api/billing/webhook"];
// Ficheros de verificación de dominio de las redes (TikTok «URL prefix», Google Search Console), servidos desde public/
const VERIFICATION_FILE = /^\/(tiktok[A-Za-z0-9]{16,64}\.txt|google[0-9a-f]{16}\.html)$/;
// Imágenes de marca (public/brand): las cargan páginas de fuera, como la de conexión de Upload-Post
const BRAND_ASSET = /^\/brand\/[a-z0-9-]+\.(png|svg|jpg)$/;

/**
 * Comprobaciones rápidas antes de cada petición. NO es la autorización real (esa se hace en cada
 * página y ruta con la sesión de la base de datos); aquí solo:
 *  - redirigimos a /entrar si ni siquiera hay cookie de sesión,
 *  - bloqueamos peticiones que cambian datos desde otro origen (defensa CSRF extra a SameSite=Lax).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  const signedWebhook = pathname === "/api/meta/data-deletion" || pathname === "/api/billing/webhook";
  if (isApi && !signedWebhook && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin && origin !== process.env.APP_URL?.replace(/\/$/, "")) {
      return NextResponse.json({ error: "Origen no permitido", code: "forbidden" }, { status: 403 });
    }
  }

  const isPublic = isApi ? PUBLIC_API.some((p) => pathname.startsWith(p)) : PUBLIC_PAGES.has(pathname) || VERIFICATION_FILE.test(pathname) || BRAND_ASSET.test(pathname);
  if (isPublic || SESSION_COOKIES.some((c) => request.cookies.has(c))) return NextResponse.next();

  if (isApi) return NextResponse.json({ error: "Tu sesión ha caducado, vuelve a entrar", code: "unauthorized" }, { status: 401 });
  const url = new URL("/entrar", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // /api/upload queda fuera para que el proxy no cargue vídeos enteros en memoria; comprueba sesión y origen por su cuenta
  matcher: ["/((?!api/upload$|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
