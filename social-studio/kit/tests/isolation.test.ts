import { beforeAll, describe, expect, it } from "vitest";
import { disconnectAccount, getAccountWithTokens, listAccounts } from "@/lib/accounts";
import { db } from "@/lib/db";
import { getMedia, requestRegenerate } from "@/lib/media";
import { consumeOAuthState, createOAuthState } from "@/lib/oauth";
import { createPost, deletePost, listPosts, publishNow, resolveReview, retryFailed } from "@/lib/posts";
import { getSettings, saveSettings } from "@/lib/settings";
import { makeAccount, makeMedia, makeUser } from "./helpers";

/** Dos clientes en la misma instalación: B nunca puede ver ni tocar nada de A. */
describe("aislamiento entre espacios de trabajo", () => {
  let a: { userId: string; workspaceId: string };
  let b: { userId: string; workspaceId: string };
  let mediaA: string;
  let accountA: number;
  let postA: number;

  beforeAll(async () => {
    a = await makeUser();
    b = await makeUser();
    mediaA = makeMedia(a.workspaceId);
    accountA = makeAccount(a.workspaceId);
    postA = createPost(a.workspaceId, a.userId, {
      mediaId: mediaA,
      title: "",
      description: "desc",
      hashtags: [],
      targets: [{ accountId: accountA }],
      scheduledAt: Date.now() + 3600_000,
    });
  });

  it("lecturas: B no ve vídeos, cuentas, publicaciones ni ajustes de A", () => {
    saveSettings(a.workspaceId, { sector: "hockey", audience: "", language: "", tone: "", extraKeywords: "" });
    expect(getMedia(b.workspaceId, mediaA)).toBeUndefined();
    expect(listAccounts(b.workspaceId)).toEqual([]);
    expect(listPosts(b.workspaceId)).toEqual([]);
    expect(getSettings(b.workspaceId).sector).toBe("");
    expect(listPosts(a.workspaceId)).toHaveLength(1);
  });

  it("escrituras: B no puede publicar con el vídeo ni con la cuenta de A", () => {
    const mediaB = makeMedia(b.workspaceId);
    const base = { title: "", description: "x", hashtags: [], scheduledAt: null };
    expect(() => createPost(b.workspaceId, b.userId, { ...base, mediaId: mediaA, targets: [{ accountId: makeAccount(b.workspaceId) }] })).toThrow(
      /no existe/,
    );
    expect(() => createPost(b.workspaceId, b.userId, { ...base, mediaId: mediaB, targets: [{ accountId: accountA }] })).toThrow(
      /ya no está conectada/,
    );
  });

  it("acciones por id: B recibe 'no existe' sobre recursos de A", () => {
    expect(() => deletePost(b.workspaceId, postA)).toThrow(/no existe/);
    expect(() => publishNow(b.workspaceId, postA)).toThrow(/no existe/);
    expect(() => retryFailed(b.workspaceId, postA)).toThrow(/no existe/);
    const targetA = (db.prepare("SELECT id FROM post_targets WHERE post_id = ?").get(postA) as { id: number }).id;
    db.prepare("UPDATE post_targets SET status = 'needs_review' WHERE id = ?").run(targetA);
    expect(() => resolveReview(b.workspaceId, targetA, "published")).toThrow(/no existe/);
    expect(requestRegenerate(b.workspaceId, mediaA)).toBeNull();
    expect(disconnectAccount(b.workspaceId, accountA)).toBeNull();
    expect(getAccountWithTokens(accountA)?.status).toBe("active");
    expect(listPosts(a.workspaceId)).toHaveLength(1);
  });

  it("OAuth: el estado solo vale una vez, para su red y para quien lo creó", () => {
    const s1 = createOAuthState({ workspaceId: a.workspaceId, userId: a.userId, connector: "youtube", pkce: true });
    expect(s1.codeChallenge).toBeTruthy();
    expect(consumeOAuthState(s1.state, "youtube", b.userId)).toBeNull();

    const s2 = createOAuthState({ workspaceId: a.workspaceId, userId: a.userId, connector: "youtube", pkce: false });
    expect(consumeOAuthState(s2.state, "tiktok", a.userId)).toBeNull();

    const s3 = createOAuthState({ workspaceId: a.workspaceId, userId: a.userId, connector: "meta", pkce: false });
    expect(consumeOAuthState(s3.state, "meta", a.userId)).toMatchObject({ workspaceId: a.workspaceId });
    expect(consumeOAuthState(s3.state, "meta", a.userId)).toBeNull();
  });

  it("los tokens se guardan cifrados y se descifran solo en el servidor", () => {
    const raw = db.prepare("SELECT access_token, refresh_token FROM account_tokens WHERE account_id = ?").get(accountA) as {
      access_token: string;
      refresh_token: string;
    };
    expect(raw.access_token).not.toContain("access-secreto");
    expect(raw.refresh_token).not.toContain("refresh-secreto");
    expect(getAccountWithTokens(accountA)).toMatchObject({ access_token: "access-secreto", refresh_token: "refresh-secreto" });
  });

  it("desconectar borra los tokens pero conserva el historial", () => {
    expect(disconnectAccount(a.workspaceId, accountA)).toEqual([]);
    expect(getAccountWithTokens(accountA)).toBeNull();
    expect(db.prepare("SELECT 1 FROM account_tokens WHERE account_id = ?").get(accountA)).toBeUndefined();
    expect(db.prepare("SELECT COUNT(*) AS n FROM post_targets WHERE account_id = ?").get(accountA)).toMatchObject({ n: 1 });
  });
});
