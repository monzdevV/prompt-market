import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { makeUser } from "./helpers";

let ws: string;

beforeAll(async () => {
  ws = (await makeUser()).workspaceId;
});

beforeEach(() => {
  db.prepare("DELETE FROM jobs").run();
});

describe("cola de trabajos", () => {
  it("no crea dos trabajos vivos para lo mismo (y adelanta la hora si procede)", () => {
    jobs.enqueue("publish_target", 1, ws, Date.now() + 60_000);
    jobs.enqueue("publish_target", 1, ws, Date.now() - 1000);
    const rows = db.prepare("SELECT * FROM jobs").all() as jobs.Job[];
    expect(rows).toHaveLength(1);
    expect(rows[0].run_after).toBeLessThanOrEqual(Date.now());
  });

  it("un trabajo solo lo reclama un ejecutor", () => {
    jobs.enqueue("publish_target", 2, ws);
    const first = jobs.claim("publish_target", 60_000, "w1");
    const second = jobs.claim("publish_target", 60_000, "w2");
    expect(first?.ref_id).toBe("2");
    expect(second).toBeUndefined();
  });

  it("no reclama trabajos programados para el futuro", () => {
    jobs.enqueue("publish_target", 3, ws, Date.now() + 60_000);
    expect(jobs.claim("publish_target", 60_000, "w1")).toBeUndefined();
  });

  it("si el ejecutor muere, otro retoma el trabajo al caducar el lease", () => {
    jobs.enqueue("process_media", "m1", ws);
    const lost = jobs.claim("process_media", 60_000, "w1")!;
    db.prepare("UPDATE jobs SET locked_until = ? WHERE id = ?").run(Date.now() - 1, lost.id);
    const retaken = jobs.claim("process_media", 60_000, "w2");
    expect(retaken?.id).toBe(lost.id);
    expect(retaken?.attempts).toBe(2);
    // Fencing: el ejecutor antiguo ya no puede cerrar ni renovar el trabajo
    expect(jobs.complete(lost)).toBe(false);
    expect(jobs.heartbeat(lost, 60_000)).toBe(false);
    expect(jobs.complete(retaken!)).toBe(true);
  });

  it("el fencing funciona aunque el mismo proceso retome su propio trabajo caducado", () => {
    jobs.enqueue("publish_target", "same", ws);
    const old = jobs.claim("publish_target", 60_000)!;
    db.prepare("UPDATE jobs SET locked_until = ? WHERE id = ?").run(Date.now() - 1, old.id);
    const again = jobs.claim("publish_target", 60_000)!;
    expect(again.id).toBe(old.id);
    expect(jobs.stillOwned(old)).toBe(false);
    expect(jobs.complete(old)).toBe(false);
    expect(jobs.stillOwned(again)).toBe(true);
  });

  it("esperar no cuenta como intento; fallar sí, con espera y límite", () => {
    jobs.enqueue("publish_target", 4, ws);
    let job = jobs.claim("publish_target", 60_000, "w1")!;
    jobs.requeue(job, 0);
    job = jobs.claim("publish_target", 60_000, "w1")!;
    expect(job.attempts).toBe(1);

    expect(jobs.fail(job, "boom", { retryable: true })).toBe(true);
    const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(job.id) as jobs.Job;
    expect(row.status).toBe("queued");
    expect(row.run_after).toBeGreaterThan(Date.now());

    db.prepare("UPDATE jobs SET attempts = max_attempts - 1, run_after = 0 WHERE id = ?").run(job.id);
    job = jobs.claim("publish_target", 60_000, "w1")!;
    expect(jobs.fail(job, "boom", { retryable: true })).toBe(false);
    expect((db.prepare("SELECT status FROM jobs WHERE id = ?").get(job.id) as { status: string }).status).toBe("failed");
  });

  it("tras fallar definitivamente se puede volver a encolar", () => {
    jobs.enqueue("publish_target", 5, ws);
    const job = jobs.claim("publish_target", 60_000, "w1")!;
    jobs.fail(job, "x", { retryable: false });
    jobs.enqueue("publish_target", 5, ws);
    expect(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE ref_id = '5'").get()).toMatchObject({ n: 2 });
  });
});
