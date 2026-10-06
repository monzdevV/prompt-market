import path from "node:path";
import { describe, expect, it } from "vitest";
import { LocalWhisper } from "@/lib/transcriber";

const script = path.join(__dirname, "fixtures", "fake-whisper.cjs");

function whisper(model: string, over: Partial<{ timeoutMs: number; loadTimeoutMs: number; idleMs: number }> = {}) {
  return new LocalWhisper({
    python: process.execPath,
    script,
    model,
    timeoutMs: 5000,
    loadTimeoutMs: 5000,
    idleMs: 60_000,
    ...over,
  });
}

describe("Whisper como proceso persistente", () => {
  it("transcribe varios vídeos con el mismo proceso y devuelve idioma y duración", async () => {
    const w = whisper("ok");
    await expect(w.transcribe("a.mp4")).resolves.toEqual({ text: "texto de a.mp4", language: "es", durationS: 12.5 });
    await expect(w.transcribe("b.mp4")).resolves.toMatchObject({ text: "texto de b.mp4" });
    w.stop();
  });

  it("un error de un vídeo no afecta al siguiente", async () => {
    const w = whisper("ok");
    await expect(w.transcribe("roto.mp4")).rejects.toThrow(/formato no válido/);
    await expect(w.transcribe("bien.mp4")).resolves.toMatchObject({ text: "texto de bien.mp4" });
    w.stop();
  });

  it("tras un tiempo agotado, el siguiente vídeo usa un proceso nuevo y funciona", async () => {
    const w = whisper("ok", { timeoutMs: 300 });
    await expect(w.transcribe("se-cuelga.mp4")).rejects.toThrow(/tardó demasiado/);
    await expect(w.transcribe("siguiente.mp4")).resolves.toMatchObject({ text: "texto de siguiente.mp4" });
    w.stop();
  });

  it("si el proceso muere a mitad, falla ese vídeo y el siguiente arranca otro proceso", async () => {
    const w = whisper("crash");
    await expect(w.transcribe("x.mp4")).rejects.toThrow(/se cerró|conexión/);
    await expect(w.transcribe("y.mp4")).rejects.toThrow(/se cerró|conexión/);
    w.stop();
  });

  it("si el modelo no carga a tiempo, no se queda bloqueado para siempre", async () => {
    const w = whisper("never-ready", { loadTimeoutMs: 300 });
    await expect(w.transcribe("x.mp4")).rejects.toThrow(/cargar el modelo/);
    await expect(w.transcribe("y.mp4")).rejects.toThrow(/cargar el modelo/);
    w.stop();
  });

  it("explica que falta faster-whisper", async () => {
    const w = whisper("missing");
    await expect(w.transcribe("x.mp4")).rejects.toThrow(/pip install faster-whisper/);
  });

  it("explica que no encuentra Python", async () => {
    const w = new LocalWhisper({ python: "no-existe-python-xyz", script, model: "ok", timeoutMs: 1000, loadTimeoutMs: 1000, idleMs: 1000 });
    await expect(w.transcribe("x.mp4")).rejects.toThrow(/No se encuentra Python/);
  });

  it("al liberarse por inactividad, vuelve a arrancar cuando llega otro vídeo", async () => {
    const w = whisper("ok", { idleMs: 50 });
    await w.transcribe("a.mp4");
    await new Promise((r) => setTimeout(r, 150));
    await expect(w.transcribe("b.mp4")).resolves.toMatchObject({ text: "texto de b.mp4" });
    w.stop();
  });
});
