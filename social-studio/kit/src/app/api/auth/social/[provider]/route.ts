import { NextResponse } from "next/server";
import { getConnector } from "@/lib/platforms";
import { configured } from "@/lib/platforms/common";
import { uploadPostEnabled } from "@/lib/platforms/uploadpost";
import { tiktokAudited } from "@/lib/features";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { cookieSecure } from "@/lib/session";
import { createLoginState, isSocialProvider, LOGIN_COOKIE, loginCookieOptions, SOCIAL_PROVIDERS } from "@/lib/social-auth";

/**
 * «Entrar con Google (YouTube)» / «Entrar con TikTok»: lleva a la pantalla de autorización de la red.
 * La vuelta llega al mismo callback que «Conectar cuenta» (/api/oauth/<red>/callback), así que no
 * hay que registrar otra URL de redirección en Google ni en TikTok.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/auth/social/[provider]">) {
  const provider = (await ctx.params).provider;
  const toLogin = (err: string) => NextResponse.redirect(new URL(`/entrar?error=${err}`, request.url));
  if (!isSocialProvider(provider)) return toLogin("social_failed");
  if (!rateLimit(`social-start:${clientIp(request)}`, 20, 15 * 60_000).ok) return toLogin("social_rate");

  const connector = getConnector(SOCIAL_PROVIDERS[provider]);
  if (!connector || !configured(connector.envVars) || !process.env.TOKEN_ENC_KEY) return toLogin("social_unavailable");
  // Hasta que TikTok apruebe la app, su inicio de sesión solo funcionaría con cuentas de prueba
  if (provider === "tiktok" && !tiktokAudited()) return toLogin("social_unavailable");
  const next = new URL(request.url).searchParams.get("next");
  const { state, codeChallenge } = createLoginState(connector.id, !!connector.pkce, next);
  // Con Upload-Post, YouTube se conecta allí: Google solo identifica a la persona
  const res = NextResponse.redirect(connector.authUrl(state, codeChallenge, { loginOnly: provider === "google" && uploadPostEnabled() }));
  res.cookies.set(LOGIN_COOKIE, state, loginCookieOptions(cookieSecure()));
  return res;
}
