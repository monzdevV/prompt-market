import { afterEach, describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { assertHost } from "@/lib/platforms/common";
import { clientIp, peekRateLimit, rateLimit } from "@/lib/rate-limit";

const PW = "contraseña-segura-123";

describe("arranque de la instalación", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
  });

  it("con ADMIN_EMAIL, solo ese email puede ser el primer usuario (administrador)", async () => {
    process.env.ADMIN_EMAIL = "dueño@test.dev";
    await expect(createUser({ email: "intruso@test.dev", password: PW, name: "X" })).rejects.toMatchObject({ code: "invite_required" });
    await expect(createUser({ email: "DUEÑO@test.dev", password: PW, name: "Dueño" })).resolves.toBeTruthy();
  });

  it("sin invitación no se puede averiguar si un email ya está registrado", async () => {
    await expect(createUser({ email: "dueño@test.dev", password: PW, name: "Otro" })).rejects.toMatchObject({ code: "invite_required" });
    await expect(createUser({ email: "dueño@test.dev", password: PW, name: "Otro", inviteCode: "x" })).rejects.toMatchObject({
      code: "invite_invalid",
    });
  });
});

describe("límites de peticiones", () => {
  afterEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it("solo cree las cabeceras del proxy configurado", () => {
    const req = new Request("http://x", { headers: { "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" } });
    expect(clientIp(req)).toBe("1.1.1.1");
    process.env.TRUST_PROXY = "forwarded";
    expect(clientIp(req)).toBe("2.2.2.2");
    process.env.TRUST_PROXY = "none";
    expect(clientIp(req)).toBe("local");
  });

  it("consultar el límite no gasta intentos", () => {
    for (let i = 0; i < 5; i++) expect(peekRateLimit("k-peek", 2, 60_000).ok).toBe(true);
    rateLimit("k-peek", 2, 60_000);
    rateLimit("k-peek", 2, 60_000);
    expect(peekRateLimit("k-peek", 2, 60_000).ok).toBe(false);
  });
});

describe("URLs de subida guardadas", () => {
  it("solo acepta https y hosts del proveedor", () => {
    const google = /(^|\.)googleapis\.com$/;
    expect(assertHost("https://www.googleapis.com/upload/x", google)).toContain("googleapis");
    expect(() => assertHost("http://www.googleapis.com/upload", google)).toThrow();
    expect(() => assertHost("https://googleapis.com.evil.dev/x", google)).toThrow();
    expect(() => assertHost("https://evilgoogleapis.com/x", google)).toThrow();
    expect(() => assertHost("no-es-url", google)).toThrow();
  });
});

describe("interruptores de publicación", () => {
  afterEach(() => {
    delete process.env.PUBLISH_TIKTOK;
    delete process.env.TIKTOK_AUDITED;
  });

  it("publicar en una red se puede apagar por entorno", async () => {
    const { publishingEnabled } = await import("@/lib/features");
    expect(publishingEnabled("tiktok")).toBe(true);
    process.env.PUBLISH_TIKTOK = "false";
    expect(publishingEnabled("tiktok")).toBe(false);
    expect(publishingEnabled("linkedin")).toBe(false);
  });
});

describe("callback de eliminación de datos de Meta", () => {
  it("solo acepta signed_request firmados con el App Secret", async () => {
    const { createHmac } = await import("node:crypto");
    const { parseSignedRequest } = await import("@/lib/meta-deletion");
    const signed = (data: object) => {
      const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
      return `${createHmac("sha256", "secreto").update(payload).digest("base64url")}.${payload}`;
    };
    const now = Math.floor(Date.now() / 1000);
    const ok = signed({ algorithm: "HMAC-SHA256", user_id: "123", issued_at: now });
    expect(parseSignedRequest(ok, "secreto")).toMatchObject({ user_id: "123" });
    expect(parseSignedRequest(ok, "otro")).toBeNull();
    expect(parseSignedRequest(`AAAA.${ok.split(".")[1]}`, "secreto")).toBeNull();
    expect(parseSignedRequest("basura", "secreto")).toBeNull();
    // Sin algoritmo declarado, o una petición capturada y reenviada horas después: rechazadas
    expect(parseSignedRequest(signed({ user_id: "123", issued_at: now }), "secreto")).toBeNull();
    expect(parseSignedRequest(signed({ algorithm: "HMAC-SHA256", user_id: "123", issued_at: now - 3 * 3600 }), "secreto")).toBeNull();
  });

  it("borra tokens y datos de Instagram/Facebook de ese usuario de Facebook y da un código", async () => {
    const { deleteMetaUserData, deletionStatus } = await import("@/lib/meta-deletion");
    const { upsertAccount } = await import("@/lib/accounts");
    const { db } = await import("@/lib/db");
    const { makeUser } = await import("./helpers");
    const u = await makeUser();
    const id = upsertAccount(u.workspaceId, { platform: "instagram", external_id: "ig9", name: "@x", access_token: "t", meta: { fb_user_id: "fb42" } });
    const other = upsertAccount(u.workspaceId, { platform: "instagram", external_id: "ig10", name: "@y", access_token: "t", meta: { fb_user_id: "fb43" } });
    const { code, accounts } = deleteMetaUserData("fb42");
    expect(accounts).toBe(1);
    expect(db.prepare("SELECT status FROM accounts WHERE id = ?").get(id)).toMatchObject({ status: "disconnected" });
    expect(db.prepare("SELECT 1 FROM account_tokens WHERE account_id = ?").get(id)).toBeUndefined();
    expect(db.prepare("SELECT status FROM accounts WHERE id = ?").get(other)).toMatchObject({ status: "active" });
    expect(deletionStatus(code)).toMatchObject({ accounts: 1 });
  });
});

describe("fugas de tokens (canario)", () => {
  it("ningún listado, log ni error deja ver un token", async () => {
    const { upsertAccount, listAccounts, getAccountWithTokens } = await import("@/lib/accounts");
    const { accountsOverview } = await import("@/lib/analytics");
    const { listPosts } = await import("@/lib/posts");
    const { scrub, log } = await import("@/lib/log");
    const { makeUser } = await import("./helpers");
    const u = await makeUser();
    const CANARY = "CANARY_TOKEN_7f3a9";
    const id = upsertAccount(u.workspaceId, { platform: "tiktok", external_id: "canary", name: "c", access_token: CANARY, refresh_token: CANARY });

    const outputs = [JSON.stringify(listAccounts(u.workspaceId)), JSON.stringify(accountsOverview(u.workspaceId)), JSON.stringify(listPosts(u.workspaceId))];
    for (const o of outputs) {
      expect(o).not.toContain(CANARY);
      expect(o).not.toContain("enc_access");
    }

    const lines: string[] = [];
    const orig = console.error;
    console.error = (l: string) => lines.push(l);
    try {
      log.error("prueba", { account: getAccountWithTokens(id), err: new Error(`fallo en https://x.dev/cb?access_token=${CANARY}&code=abc`) });
    } finally {
      console.error = orig;
    }
    expect(lines.join("\n")).not.toContain(CANARY);
    expect(scrub(`Authorization: Bearer ${CANARY}`)).not.toContain(CANARY);
  });
});
