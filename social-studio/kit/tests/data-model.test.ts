import { beforeAll, describe, expect, it } from "vitest";
import { createUser, createInvite } from "@/lib/auth";
import { audit, listAudit } from "@/lib/audit";
import { defaultBrandId, listBrands } from "@/lib/brands";
import { db, type Target } from "@/lib/db";
import { createPost, deletePost, listPosts } from "@/lib/posts";
import { makeAccount, makeMedia, makeUser } from "./helpers";

let user: { userId: string; workspaceId: string };

beforeAll(async () => {
  user = await makeUser();
});

describe("modelo de datos SaaS", () => {
  it("cada espacio nace con una marca por defecto y las cuentas y publicaciones cuelgan de ella", () => {
    const brands = listBrands(user.workspaceId);
    expect(brands).toHaveLength(1);
    const brandId = defaultBrandId(user.workspaceId);
    const accountId = makeAccount(user.workspaceId);
    expect(db.prepare("SELECT brand_id FROM accounts WHERE id = ?").get(accountId)).toMatchObject({ brand_id: brandId });
    const postId = createPost(user.workspaceId, user.userId, {
      mediaId: makeMedia(user.workspaceId),
      title: "",
      description: "d",
      hashtags: [],
      targets: [{ accountId }],
      scheduledAt: Date.now() + 3600_000,
    });
    expect(db.prepare("SELECT brand_id FROM posts WHERE id = ?").get(postId)).toMatchObject({ brand_id: brandId });
  });

  it("se guarda qué versión de los términos aceptó cada usuario", async () => {
    const admin = db.prepare("SELECT id FROM users WHERE is_admin = 1").get() as { id: string };
    const u = await createUser({
      email: "terminos@test.dev",
      password: "contraseña-segura-123",
      name: "T",
      inviteCode: createInvite(admin.id),
      termsVersion: "23 de septiembre de 2026",
    });
    expect(db.prepare("SELECT terms_version, terms_accepted_at FROM users WHERE id = ?").get(u.userId)).toMatchObject({
      terms_version: "23 de septiembre de 2026",
    });
  });

  it("borrar una publicación la oculta pero conserva lo ya publicado y cancela lo pendiente", () => {
    const published = makeAccount(user.workspaceId);
    const pending = makeAccount(user.workspaceId, "facebook");
    const postId = createPost(user.workspaceId, user.userId, {
      mediaId: makeMedia(user.workspaceId),
      title: "",
      description: "d",
      hashtags: [],
      targets: [{ accountId: published }, { accountId: pending }],
      scheduledAt: Date.now() + 3600_000,
    });
    db.prepare("UPDATE post_targets SET status = 'published', remote_id = 'r1' WHERE post_id = ? AND account_id = ?").run(postId, published);
    deletePost(user.workspaceId, postId);

    expect(listPosts(user.workspaceId).some((p) => p.id === postId)).toBe(false);
    const targets = db.prepare("SELECT * FROM post_targets WHERE post_id = ?").all(postId) as Target[];
    expect(targets.map((t) => t.status)).toEqual(["published"]);
    expect(() => deletePost(user.workspaceId, postId)).toThrow(/no existe/);
  });

  it("el registro de auditoría es por espacio de trabajo", async () => {
    const other = await makeUser();
    audit({ workspaceId: user.workspaceId, actorUserId: user.userId, action: "account.disconnect", targetType: "account", targetId: 1 });
    expect(listAudit(user.workspaceId).map((a) => a.action)).toContain("account.disconnect");
    expect(listAudit(other.workspaceId)).toEqual([]);
  });
});

describe("desconectar una cuenta", () => {
  it("cancela lo programado en esa cuenta y lo explica", async () => {
    const { disconnectAccount, pendingCountByAccount } = await import("@/lib/accounts");
    const accountId = makeAccount(user.workspaceId);
    const postId = createPost(user.workspaceId, user.userId, {
      mediaId: makeMedia(user.workspaceId),
      title: "",
      description: "d",
      hashtags: [],
      targets: [{ accountId }],
      scheduledAt: Date.now() + 3600_000,
    });
    expect(pendingCountByAccount(user.workspaceId).get(accountId)).toBe(1);
    expect(disconnectAccount(user.workspaceId, accountId)).toEqual([postId]);
    expect(db.prepare("SELECT status, error FROM post_targets WHERE post_id = ?").get(postId)).toMatchObject({
      status: "failed",
      error: expect.stringMatching(/desconectó/),
    });
    expect(db.prepare("SELECT 1 FROM jobs WHERE kind = 'publish_target' AND status = 'queued' AND ref_id IN (SELECT CAST(id AS TEXT) FROM post_targets WHERE post_id = ?)").get(postId)).toBeUndefined();
  });
});
