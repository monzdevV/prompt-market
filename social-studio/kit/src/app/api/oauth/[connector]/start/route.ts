import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/oauth";
import { getConnector } from "@/lib/platforms";
import { configured } from "@/lib/platforms/common";
import { getSession } from "@/lib/session";

export async function GET(request: Request, ctx: RouteContext<"/api/oauth/[connector]/start">) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/entrar", request.url));
  const connector = getConnector((await ctx.params).connector);
  if (!connector) return new Response("Red desconocida", { status: 404 });
  if (!configured(connector.envVars) || !process.env.TOKEN_ENC_KEY) {
    return NextResponse.redirect(new URL(`/cuentas?error=unavailable&red=${connector.id}`, request.url));
  }
  const { state, codeChallenge } = createOAuthState({
    workspaceId: session.workspaceId,
    userId: session.userId,
    connector: connector.id,
    pkce: !!connector.pkce,
  });
  // ?permiso=publicar: pedir también el permiso de publicación (autorización incremental)
  const publish = new URL(request.url).searchParams.get("permiso") === "publicar";
  return NextResponse.redirect(connector.authUrl(state, codeChallenge, { publish }));
}
