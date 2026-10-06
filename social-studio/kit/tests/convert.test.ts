import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { handleConvertMedia, requestVertical } from "@/lib/convert";
import { db, UPLOAD_DIR, type Media } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { makeMedia, makeUser } from "./helpers";

let ws: string;
const env = { python: process.env.PYTHON_BIN, script: process.env.VERTICAL_SCRIPT };

beforeAll(async () => {
  ws = (await makeUser()).workspaceId;
  // Sin Python: el sustituto en Node cumple el mismo contrato que scripts/to-vertical.py
  process.env.PYTHON_BIN = process.execPath;
  process.env.VERTICAL_SCRIPT = path.join(__dirname, "fixtures", "fake-vertical.cjs");
});
afterAll(() => {
  process.env.PYTHON_BIN = env.python;
  process.env.VERTICAL_SCRIPT = env.script;
});
beforeEach(() => {
  db.prepare("DELETE FROM jobs").run();
});

function source(content = "video-original") {
  const id = makeMedia(ws);
  const m = db.prepare("SELECT * FROM media WHERE id = ?").get(id) as Media;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, m.filename), content);
  db.prepare("UPDATE media SET transcript = 'hola', language = 'es', ai = ?, duration_s = 12 WHERE id = ?").run(
    JSON.stringify({ title: "T", description: "D", keywords: [], hashtags: ["a", "b", "c", "d"] }),
    id,
  );
  return id;
}

const media = (id: string) => db.prepare("SELECT * FROM media WHERE id = ?").get(id) as Media;

describe("convertir a vertical", () => {
  it("crea la copia 9:16 en la cola, hereda transcripción y texto, y no duplica si se pide dos veces", async () => {
    const src = source();
    const v = requestVertical(ws, src);
    expect(v).toMatchObject({ status: "queued", source_media_id: src });
    expect(requestVertical(ws, src).id).toBe(v.id);

    const job = jobs.claim("convert_media", 60_000)!;
    expect(job.ref_id).toBe(v.id);
    await expect(handleConvertMedia(job)).resolves.toEqual({ type: "done" });
    const done = media(v.id);
    expect(done).toMatchObject({ status: "ready", width: 1080, height: 1920, transcript: "hola", language: "es", duration_s: 12.5 });
    expect(JSON.parse(done.ai!)).toMatchObject({ title: "T" });
    expect(fs.readFileSync(path.join(UPLOAD_DIR, done.filename), "utf8")).toBe("vertical:video-original");
    expect(done.size).toBeGreaterThan(0);
  });

  it("si la conversión falla, queda en error con un mensaje claro (sin rutas internas) y se puede volver a pedir", async () => {
    const src = source("romper");
    const v = requestVertical(ws, src);
    await handleConvertMedia(jobs.claim("convert_media", 60_000)!);
    expect(media(v.id)).toMatchObject({ status: "error", error: "No se pudo convertir el vídeo a vertical. Prueba con otro archivo." });
    expect(fs.existsSync(path.join(UPLOAD_DIR, `${v.filename}.part.mp4`))).toBe(false);
    expect(requestVertical(ws, src).id).not.toBe(v.id);
  });

  it("no se puede convertir un vídeo de otro espacio", async () => {
    const other = await makeUser();
    const foreign = makeMedia(other.workspaceId);
    expect(() => requestVertical(ws, foreign)).toThrow(/no existe/);
  });
});
