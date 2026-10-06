import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import readline from "node:readline";
import { log } from "./log";

export type Transcription = {
  text: string;
  /** Idioma detectado (ISO 639-1, p. ej. "es") */
  language: string | null;
  durationS: number | null;
};

/**
 * Punto de extensión: hoy Whisper local (gratis); mañana una API en la nube
 * implementando esta misma interfaz y eligiéndola con TRANSCRIBER.
 */
export interface Transcriber {
  transcribe(filePath: string): Promise<Transcription>;
}

export class TranscriberError extends Error {}

/**
 * Entorno mínimo para Python: el decodificador de vídeo procesa archivos de usuarios,
 * así que no recibe claves ni secretos de la app.
 */
function safeEnv() {
  const keep = /^(PATH|PATHEXT|SYSTEMROOT|SYSTEMDRIVE|WINDIR|TEMP|TMP|TMPDIR|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|LANG|LC_.*|PYTHON.*|HF_.*|XDG_.*|VIRTUAL_ENV|CONDA_.*)$/i;
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => keep.test(k))) as NodeJS.ProcessEnv;
}

type Pending = {
  resolve: (t: Transcription) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
};

/** Un proceso de Python con sus propias peticiones pendientes: al morir solo afecta a las suyas. */
type Worker = {
  proc: ChildProcessWithoutNullStreams;
  ready: Promise<void>;
  pending: Map<string, Pending>;
  dead: boolean;
};

/**
 * faster-whisper en un proceso Python de larga duración: el modelo se carga una sola vez.
 * Atiende una petición cada vez (la CPU es el cuello de botella); las demás esperan en cola.
 * Si el proceso falla, se cuelga o tarda demasiado, se descarta y el siguiente vídeo arranca uno nuevo.
 */
export class LocalWhisper implements Transcriber {
  private worker: Worker | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    private opts = {
      python: process.env.PYTHON_BIN ?? "python",
      script: path.join(process.cwd(), "scripts", "transcribe.py"),
      model: process.env.WHISPER_MODEL ?? "small",
      timeoutMs: (Number(process.env.WHISPER_TIMEOUT_S) || 1800) * 1000,
      loadTimeoutMs: 10 * 60_000,
      // Liberar la memoria del modelo si no se usa en un rato
      idleMs: 10 * 60_000,
    },
  ) {}

  transcribe(filePath: string) {
    const run = this.chain.then(() => this.request(filePath));
    this.chain = run.catch(() => undefined);
    return run;
  }

  /** Mata el proceso y rechaza lo que tuviera pendiente. Idempotente. */
  private discard(w: Worker, err: Error) {
    if (this.worker === w) this.worker = null;
    if (w.dead) return;
    w.dead = true;
    for (const [id, p] of w.pending) {
      clearTimeout(p.timer);
      p.reject(err);
      w.pending.delete(id);
    }
    w.proc.kill();
  }

  private start(): Worker {
    const proc = spawn(this.opts.python, [this.opts.script, this.opts.model], {
      env: { ...safeEnv(), PYTHONIOENCODING: "utf-8", PYTHONUNBUFFERED: "1" },
      windowsHide: true,
    });
    const stderrTail: string[] = [];
    const w = { proc, pending: new Map<string, Pending>(), dead: false } as Worker;

    w.ready = new Promise<void>((resolve, reject) => {
      const fail = (err: Error) => {
        clearTimeout(loadTimer);
        reject(err);
        this.discard(w, err);
      };
      const loadTimer = setTimeout(() => fail(new TranscriberError("Whisper tardó demasiado en cargar el modelo")), this.opts.loadTimeoutMs);
      readline.createInterface({ input: proc.stdout }).on("line", (line) => {
        let msg: { ready?: boolean; id?: string; ok?: boolean; text?: string; language?: string; duration?: number; error?: string };
        try {
          msg = JSON.parse(line);
        } catch {
          log.warn("whisper.bad_line", { line: line.slice(0, 200) });
          return;
        }
        if (msg.ready) {
          clearTimeout(loadTimer);
          resolve();
          return;
        }
        const p = msg.id ? w.pending.get(msg.id) : undefined;
        if (!p || !msg.id) return;
        w.pending.delete(msg.id);
        clearTimeout(p.timer);
        if (msg.ok) p.resolve({ text: msg.text ?? "", language: msg.language ?? null, durationS: msg.duration ?? null });
        else p.reject(new TranscriberError(`Whisper no pudo transcribir el vídeo: ${msg.error ?? "error desconocido"}`));
      });
      proc.on("error", (e) =>
        fail(
          new TranscriberError(
            (e as NodeJS.ErrnoException).code === "ENOENT"
              ? `No se encuentra Python (${this.opts.python}). Instálalo o ajusta PYTHON_BIN.`
              : `No se pudo arrancar Whisper: ${e.message}`,
          ),
        ),
      );
      proc.on("exit", (code) => {
        const detail = code === 3 ? "faster-whisper no está instalado: ejecuta  pip install faster-whisper" : stderrTail.slice(-3).join(" ");
        fail(new TranscriberError(`Whisper se cerró (${code}): ${detail}`));
      });
    });
    // Escribir a un proceso que acaba de morir da EPIPE: se gestiona aquí en vez de tumbar el servidor
    proc.stdin.on("error", (e) => this.discard(w, new TranscriberError(`Se perdió la conexión con Whisper: ${e.message}`)));
    proc.stderr.on("data", (d: Buffer) => {
      for (const l of d.toString("utf8").split(/\r?\n/).filter(Boolean)) {
        stderrTail.push(l);
        if (stderrTail.length > 20) stderrTail.shift();
      }
    });
    // Un error de arranque no debe quedar como rechazo sin manejar si nadie espera
    w.ready.catch(() => undefined);
    return w;
  }

  private async request(filePath: string): Promise<Transcription> {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const w = (this.worker && !this.worker.dead ? this.worker : null) ?? (this.worker = this.start());
    try {
      await w.ready;
      if (w.dead) throw new TranscriberError("Whisper se cerró inesperadamente");
      const id = randomUUID();
      return await new Promise<Transcription>((resolve, reject) => {
        const timer = setTimeout(() => {
          w.pending.delete(id);
          reject(new TranscriberError("La transcripción tardó demasiado y se canceló"));
          // El proceso sigue ocupado con este vídeo: se descarta y el siguiente usará uno nuevo
          this.discard(w, new TranscriberError("Whisper se reinició"));
        }, this.opts.timeoutMs);
        w.pending.set(id, { resolve, reject, timer });
        w.proc.stdin.write(JSON.stringify({ id, path: filePath }) + "\n");
      });
    } finally {
      this.idleTimer = setTimeout(() => this.stop(), this.opts.idleMs);
      this.idleTimer.unref();
    }
  }

  stop() {
    if (this.worker) this.discard(this.worker, new TranscriberError("Whisper se detuvo"));
  }
}

let instance: Transcriber | null = null;

export function getTranscriber(): Transcriber {
  if (instance) return instance;
  const kind = process.env.TRANSCRIBER ?? "local";
  if (kind !== "local") throw new Error(`Transcriptor desconocido: ${kind}`);
  instance = new LocalWhisper();
  return instance;
}

/** Solo para tests. */
export function setTranscriberForTests(t: Transcriber | null) {
  instance = t;
}
