import { NextResponse, type NextRequest } from "next/server";
import { upsertAccount, type NewAccount } from "@/lib/accounts";
import { AuthError, createSession, primaryWorkspace } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { legalInfo } from "@/lib/legal";
import { log } from "@/lib/log";
import { consumeOAuthState } from "@/lib/oauth";
import { getConnector } from "@/lib/platforms";
import { getSession, sessionCookieName, sessionCookieOptions } from "@/lib/session";
import { consumeLoginState, LOGIN_COOKIE, signInWithIdentity } from "@/lib/social-auth";
import { requestSync } from "@/lib/sync";

/** Conecta las cuentas que caben en el plan; devuelve las conectadas y cuántas no cupieron. */
function connectAccounts(workspaceId: string, accounts: NewAccount[]) {
  const ids: number[] = [];
  let overLimit = 0;
  for (const a of accounts) {
    try {
      ids.push(upsertAccount(workspaceId, a));
    } catch (e) {
      // Límite de cuentas del plan: se conectan las que caben y se avisa del resto
      if (e instanceof ApiError && e.code === "plan_limit") overLimit++;
      else throw e;
    }
  }
  if (ids.length) requestSync(workspaceId, ids);
  return { ids, overLimit };
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/oauth/[connector]/callback">) {
  // Solo códigos y el id de la red: las páginas traducen a texto (nadie puede inyectar mensajes por la URL)
  const connector = getConnector((await ctx.params).connector);
  const back = (key: "ok" | "error", code: string, n?: number) =>
    NextResponse.redirect(new URL(`/cuentas?${key}=${code}&red=${connector?.id ?? ""}${n ? `&n=${n}` : ""}`, request.url));
  if (!connector) return back("error", "unknown");

  const p = request.nextUrl.searchParams;
  const state = p.get("state");
  const code = p.get("code");

  // ── «Entrar con Google/TikTok»: el state es de un inicio de sesión (no hace falta sesión previa) ──
  const login = state ? consumeLoginState(state, connector.id) : null;
  if (login) {
    const toLogin = (err: string) => {
      const r = NextResponse.redirect(new URL(`/entrar?error=${err}`, request.url));
      r.cookies.delete({ name: LOGIN_COOKIE, path: "/api/oauth" });
      return r;
    };
    // El login tiene que volver al mismo navegador que lo empezó (evita el CSRF de login)
    if (request.cookies.get(LOGIN_COOKIE)?.value !== state) return toLogin("social_failed");
    if (p.get("error") || !code) return toLogin("social_denied");
    try {
      const { accounts, identity } = await connector.callback(code, login.codeVerifier);
      if (!identity) return toLogin("social_failed");
      const { userId, created } = signInWithIdentity(identity, legalInfo().updated);
      const workspaceId = primaryWorkspace(userId);
      // La misma autorización deja conectada la red (canal de YouTube o cuenta de TikTok)
      const { ids } = connectAccounts(workspaceId, accounts);
      const { token, expiresAt } = createSession(userId, workspaceId);
      log.info("auth.social_login", { provider: identity.provider, created, accounts: ids.length });
      const res = NextResponse.redirect(new URL(created ? "/panel?bienvenida=1" : login.next, request.url));
      res.cookies.set(sessionCookieName(), token, sessionCookieOptions(expiresAt));
      res.cookies.delete({ name: LOGIN_COOKIE, path: "/api/oauth" });
      return res;
    } catch (e) {
      if (e instanceof AuthError && e.code === "invite_required") return toLogin("social_invite");
      log.warn("auth.social_login_failed", { connector: connector.id, err: e });
      return toLogin("social_failed");
    }
  }

  // ── Conectar una red a la cuenta con la que ya se ha entrado ──
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/entrar", request.url));
  const stored = state ? consumeOAuthState(state, connector.id, session.userId) : null;
  // Cancelado o denegado en la red: mensaje fijo (no reflejamos texto que viene en la URL)
  if (p.get("error")) return back("error", "denied");
  if (!stored || !code) return back("error", "expired");

  try {
    const { accounts } = await connector.callback(code, stored.codeVerifier);
    if (!accounts.length) {
      return back("error", "no_accounts");
    }
    const { ids, overLimit } = connectAccounts(stored.workspaceId, accounts);
    if (!ids.length && overLimit) return back("error", "plan_limit");
    // Meta: conectó Páginas pero ningún Instagram profesional (el caso más común de confusión)
    const noInstagram = connector.id === "meta" && !accounts.some((a) => a.platform === "instagram");
    log.info("oauth.connected", { connector: connector.id, workspaceId: stored.workspaceId, accounts: ids.length });
    const extra = `${overLimit ? `&fuera=${overLimit}` : ""}${noInstagram ? "&sin_ig=1" : ""}`;
    return NextResponse.redirect(new URL(`/cuentas?ok=connected&red=${connector.id}&n=${ids.length}${extra}`, request.url));
  } catch (e) {
    log.warn("oauth.callback_failed", { connector: connector.id, err: e });
    return back("error", "failed");
  }
}
