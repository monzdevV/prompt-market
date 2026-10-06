import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { createOAuthState } from "@/lib/oauth";
import { makeAccount, makeMedia, makeUser } from "./helpers";

/**
 * Tests de las rutas HTTP reales (handlers de Next) con una cookie de sesión simulada y la base real.
 * Comprueban lo que un atacante vería desde fuera: 401, 403, 404 y que nunca se filtren datos de otro espacio.
 */
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: () => undefined,
    delete: () => undefined,
  }),
}));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));

const asUser = (ws: { userId: string; workspaceId: string } | null) => {
  jar.clear();
  if (ws) jar.set("ss_session", createSession(ws.userId, ws.workspaceId).token);
};
type Init = ConstructorParameters<typeof NextRequest>[1];
const req = (url: string, init?: Init) => new NextRequest(new URL(url, "http://localhost:3000"), init);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada ruta tipa sus params; aquí basta con la forma
const ctx = (params: Record<string, string>): any => ({ params: Promise.resolve(params) });

let a: { userId: string; workspaceId: string };
let b: { userId: string; workspaceId: string };
let mediaA: string;
let accountA: number;

beforeAll(async () => {
  a = await makeUser();
  b = await makeUser();
  mediaA = makeMedia(a.workspaceId);
  accountA = makeAccount(a.workspaceId);
});

describe("proxy (comprobaciones rápidas)", () => {
  it("sin cookie: páginas redirigen a /entrar y la API responde 401; lo público pasa", async () => {
    const { proxy } = await import("@/proxy");
    const page = proxy(req("/panel"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toContain("/entrar?next=%2Fpanel");
    expect(proxy(req("/api/posts", { method: "POST" })).status).toBe(401);
    expect(proxy(req("/privacidad")).status).toBe(200);
    expect(proxy(req("/api/health")).status).toBe(200);
  });

  it("peticiones que cambian datos desde otra web: 403", async () => {
    const { proxy } = await import("@/proxy");
    const r = proxy(req("/api/settings", { method: "POST", headers: { origin: "https://evil.example", cookie: "ss_session=x" } }));
    expect(r.status).toBe(403);
    // Los webhooks firmados no llevan nuestro Origin y no deben bloquearse
    expect(proxy(req("/api/meta/data-deletion", { method: "POST", headers: { origin: "https://facebook.com" } })).status).toBe(200);
  });
});

describe("rutas de la API", () => {
  it("sin sesión todo devuelve 401 con un JSON coherente", async () => {
    asUser(null);
    const { GET } = await import("@/app/api/media/[id]/route");
    const r = await GET(req(`/api/media/${mediaA}`), ctx({ id: mediaA }));
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ code: "unauthorized" });
  });

  it("B recibe 404 (no 403) sobre vídeo, fichero, cuenta y sincronización de A", async () => {
    asUser(b);
    const media = await import("@/app/api/media/[id]/route");
    const file = await import("@/app/api/media/[id]/file/route");
    const account = await import("@/app/api/accounts/[id]/route");
    const sync = await import("@/app/api/accounts/[id]/sync/route");
    expect((await media.GET(req("/x"), ctx({ id: mediaA }))).status).toBe(404);
    expect((await media.POST(req("/x", { method: "POST" }), ctx({ id: mediaA }))).status).toBe(404);
    expect((await file.GET(req("/x"), ctx({ id: mediaA }))).status).toBe(404);
    expect((await account.DELETE(req("/x", { method: "DELETE" }), ctx({ id: String(accountA) }))).status).toBe(404);
    expect((await sync.POST(req("/x", { method: "POST" }), ctx({ id: String(accountA) }))).status).toBe(404);
  });

  it("ids con formato raro son 404, no errores internos", async () => {
    asUser(a);
    const { DELETE } = await import("@/app/api/posts/[id]/route");
    for (const id of ["abc", "-1", "1e9999", "0"]) {
      expect((await DELETE(req("/x", { method: "DELETE" }), ctx({ id }))).status).toBe(404);
    }
  });

  it("JSON inválido y datos inválidos: 400 con mensaje en español", async () => {
    asUser(a);
    const { POST } = await import("@/app/api/posts/route");
    const bad = await POST(req("/api/posts", { method: "POST", body: "{no-es-json", headers: { "content-type": "application/json" } }), ctx({}));
    expect(bad.status).toBe(400);
    const invalid = await POST(req("/api/posts", { method: "POST", body: JSON.stringify({ mediaId: mediaA, description: "", targets: [] }) }), ctx({}));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toMatch(/descripción|red/);
  });

  it("el admin de invitaciones solo lo usa un administrador", async () => {
    asUser(b);
    const { POST } = await import("@/app/api/admin/invites/route");
    expect((await POST(req("/x", { method: "POST", body: "{}" }), ctx({}))).status).toBe(403);
  });
});

describe("subida de vídeos", () => {
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(64)]);

  it("sin sesión 401; desde otro origen 403; no-vídeo 400; vídeo válido crea y encola", async () => {
    const { POST } = await import("@/app/api/upload/route");
    asUser(null);
    expect((await POST(req("/api/upload", { method: "POST", body: mp4, headers: { "x-filename": "a.mp4" } }))).status).toBe(401);
    asUser(a);
    expect((await POST(req("/api/upload", { method: "POST", body: mp4, headers: { "x-filename": "a.mp4", origin: "https://evil.example" } }))).status).toBe(403);
    expect((await POST(req("/api/upload", { method: "POST", body: Buffer.from("<html>"), headers: { "x-filename": "a.mp4" } }))).status).toBe(400);
    expect((await POST(req("/api/upload", { method: "POST", body: mp4, headers: { "x-filename": "a.exe" } }))).status).toBe(400);
    const ok = await POST(req("/api/upload", { method: "POST", body: mp4, headers: { "x-filename": "clase.mp4" } }));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: expect.any(String) });
  });

  it("un tamaño declarado mayor que el máximo se rechaza antes de recibir nada (413)", async () => {
    const { POST } = await import("@/app/api/upload/route");
    asUser(a);
    const r = await POST(req("/api/upload", { method: "POST", body: mp4, headers: { "x-filename": "a.mp4", "content-length": String(10 * 1024 ** 3) } }));
    expect(r.status).toBe(413);
  });
});

describe("OAuth callback", () => {
  it("rechaza estados inventados, reutilizados o de otra persona, y redirige con códigos fijos", async () => {
    const { GET } = await import("@/app/api/oauth/[connector]/callback/route");
    asUser(a);
    const bad = await GET(req("/api/oauth/youtube/callback?state=inventado&code=x"), ctx({ connector: "youtube" }));
    expect(bad.headers.get("location")).toContain("/cuentas?error=expired");

    const { state } = createOAuthState({ workspaceId: b.workspaceId, userId: b.userId, connector: "youtube", pkce: true });
    const cross = await GET(req(`/api/oauth/youtube/callback?state=${state}&code=x`), ctx({ connector: "youtube" }));
    expect(cross.headers.get("location")).toContain("error=expired");

    const denied = await GET(req("/api/oauth/youtube/callback?error=access_denied&error_description=<script>"), ctx({ connector: "youtube" }));
    expect(denied.headers.get("location")).toContain("error=denied");
    expect(denied.headers.get("location")).not.toContain("script");
  });
});

describe("borrar la cuenta (/api/me)", () => {
  it("quien entró con TikTok (sin contraseña) puede borrarla escribiendo BORRAR; sin esa confirmación, no", async () => {
    const { signInWithIdentity } = await import("@/lib/social-auth");
    const { primaryWorkspace } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const prev = process.env.SIGNUP_MODE;
    process.env.SIGNUP_MODE = "open";
    const { userId } = signInWithIdentity({ provider: "tiktok", subject: `borrar-${Date.now()}`, email: null, emailVerified: false, name: "T" }, "v1");
    process.env.SIGNUP_MODE = prev;
    asUser({ userId, workspaceId: primaryWorkspace(userId) });
    const { DELETE } = await import("@/app/api/me/route");
    const body = (b: object) => ({ method: "DELETE", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
    expect((await DELETE(req("/api/me", body({ confirm: "no" })), ctx({}))).status).toBe(400);
    expect((await DELETE(req("/api/me", body({ password: "!social" })), ctx({}))).status).toBe(400);
    expect((await DELETE(req("/api/me", body({ confirm: "BORRAR" })), ctx({}))).status).toBe(200);
    expect(db.prepare("SELECT 1 FROM users WHERE id = ?").get(userId)).toBeUndefined();
  });

  it("con contraseña: la contraseña es obligatoria y tiene que ser la correcta", async () => {
    const u = await makeUser();
    asUser(u);
    const { DELETE } = await import("@/app/api/me/route");
    const body = (b: object) => ({ method: "DELETE", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
    expect((await DELETE(req("/api/me", body({ confirm: "BORRAR" })), ctx({}))).status).toBe(400);
    expect((await DELETE(req("/api/me", body({ password: "mala" })), ctx({}))).status).toBe(403);
  });
});

describe("Entrar con TikTok/Google: CSRF de login", () => {
  it("la vuelta solo se acepta en el navegador que empezó el login (cookie con el mismo state)", async () => {
    const { createLoginState, LOGIN_COOKIE } = await import("@/lib/social-auth");
    const { tiktokConnector } = await import("@/lib/platforms/tiktok");
    const { GET } = await import("@/app/api/oauth/[connector]/callback/route");
    const original = tiktokConnector.callback;
    const prev = process.env.SIGNUP_MODE;
    process.env.SIGNUP_MODE = "open";
    tiktokConnector.callback = async () => ({
      accounts: [],
      identity: { provider: "tiktok", subject: `csrf-${Date.now()}`, email: null, emailVerified: false, name: "Atacante" },
    });
    try {
      asUser(null);
      // Enlace de vuelta de otra persona: sin la cookie de este navegador → rechazado, sin iniciar sesión
      const { state: s1 } = createLoginState("tiktok", false, "/panel");
      const bad = await GET(req(`/api/oauth/tiktok/callback?state=${s1}&code=x`), ctx({ connector: "tiktok" }));
      expect(bad.headers.get("location")).toContain("/entrar?error=social_failed");
      expect(bad.headers.get("set-cookie") ?? "").not.toMatch(/ss_session=/);

      // Mismo navegador (cookie con el state): entra
      const { state: s2 } = createLoginState("tiktok", false, "/panel");
      const ok = await GET(req(`/api/oauth/tiktok/callback?state=${s2}&code=x`, { headers: { cookie: `${LOGIN_COOKIE}=${s2}` } }), ctx({ connector: "tiktok" }));
      expect(ok.headers.get("location")).not.toContain("/entrar");
      expect(ok.headers.get("set-cookie") ?? "").toMatch(/ss_session=/);
    } finally {
      tiktokConnector.callback = original;
      process.env.SIGNUP_MODE = prev;
    }
  });
});
