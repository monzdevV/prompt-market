import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, type Media } from "@/lib/db";
import * as jobs from "@/lib/jobs";
import { createMedia } from "@/lib/media";
import { setTranscriberForTests, type Transcriber } from "@/lib/transcriber";
import { makeUser } from "./helpers";

const generateCopy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/ai")>()), generateCopy }));

const { AiError } = await import("@/lib/ai");
const { handleProcessMedia } = await import("@/lib/media-processing");

let ws: string;
let transcribeCalls = 0;

beforeAll(async () => {
  ws = (await makeUser()).workspaceId;
});

beforeEach(() => {
  transcribeCalls = 0;
  generateCopy.mockReset();
  db.prepare("DELETE FROM jobs").run();
});

function useTranscriber(result: Awaited<ReturnType<Transcriber["transcribe"]>> | Error) {
  setTranscriberForTests({
    async transcribe() {
      transcribeCalls++;
      if (result instanceof Error) throw result;
      return result;
    },
  });
}

function upload() {
  const id = crypto.randomUUID();
  createMedia({ id, workspaceId: ws, filename: `${id}.mp4`, originalName: "clase-patinaje.mp4", mime: "video/mp4", size: 1 });
  return { id, job: jobs.claim("process_media", 60_000)! };
}

const media = (id: string) => db.prepare("SELECT * FROM media WHERE id = ?").get(id) as Media;

const copy = { title: "Título", description: "Desc", keywords: ["k"], hashtags: ["a", "b", "c", "d"] };

describe("transcribir y generar el texto", () => {
  it("guarda transcripción, idioma, duración y el texto de la IA", async () => {
    useTranscriber({ text: "hola a todos", language: "es", durationS: 42 });
    generateCopy.mockResolvedValue({ copy, model: "m", tokens: 100 });
    const { id, job } = upload();
    expect(await handleProcessMedia(job)).toEqual({ type: "done" });
    expect(media(id)).toMatchObject({ status: "ready", transcript: "hola a todos", language: "es", duration_s: 42 });
    expect(JSON.parse(media(id).ai!)).toMatchObject({ ...copy, model: "m" });
    expect(generateCopy.mock.calls[0][0]).toMatchObject({ transcript: "hola a todos", detectedLanguage: "es" });
  });

  it("si la IA falla de forma pasajera, reintenta sin volver a transcribir", async () => {
    useTranscriber({ text: "texto", language: "es", durationS: 5 });
    generateCopy.mockRejectedValueOnce(new AiError("saturada", true)).mockResolvedValueOnce({ copy, model: "m", tokens: 1 });
    const { id, job } = upload();
    expect(await handleProcessMedia(job)).toMatchObject({ type: "retry" });
    expect(media(id).status).toBe("queued");
    await handleProcessMedia({ ...job, attempts: 2 });
    expect(media(id).status).toBe("ready");
    expect(transcribeCalls).toBe(1);
  });

  it("vídeo sin voz: no da error, genera a partir del contexto", async () => {
    useTranscriber({ text: "", language: null, durationS: 10 });
    generateCopy.mockResolvedValue({ copy: { ...copy, noSpeech: true }, model: "m", tokens: 1 });
    const { id, job } = upload();
    await handleProcessMedia(job);
    expect(media(id)).toMatchObject({ status: "ready", transcript: "" });
  });

  it("error de Whisper: se muestra el motivo y queda en error", async () => {
    const { TranscriberError } = await import("@/lib/transcriber");
    useTranscriber(new TranscriberError("faster-whisper no está instalado"));
    const { id, job } = upload();
    await handleProcessMedia(job);
    expect(media(id)).toMatchObject({ status: "error", error: "faster-whisper no está instalado" });
  });

  it("error inesperado: mensaje genérico, sin detalles internos", async () => {
    useTranscriber({ text: "x", language: "es", durationS: 1 });
    generateCopy.mockRejectedValue(new Error("SQLITE_BUSY /ruta/secreta"));
    const { id, job } = upload();
    await handleProcessMedia(job);
    expect(media(id).status).toBe("error");
    expect(media(id).error).not.toContain("secreta");
  });
});

// Va el último: el apagado es un estado global del proceso
describe("apagado ordenado", () => {
  it("un vídeo cortado por el apagado vuelve a la cola sin marcarse como error", async () => {
    const { TranscriberError } = await import("@/lib/transcriber");
    useTranscriber(new TranscriberError("Whisper se detuvo"));
    const { id, job } = upload();
    jobs.markShuttingDown();
    expect(await handleProcessMedia(job)).toMatchObject({ type: "wait" });
    expect(media(id)).toMatchObject({ status: "queued", error: null });
  });
});
