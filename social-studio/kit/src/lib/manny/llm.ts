import { spawn } from "node:child_process";
import os from "node:os";
import { log } from "../log";
import { resolveClaude } from "./claude-bin";

/*
 * Manny piensa con Claude Code instalado en este ordenador (`claude -p`), con la sesión de tu suscripción.
 * No usa la API de pago: el proceso hijo nunca recibe ANTHROPIC_API_KEY, así que no puede facturar por
 * tokens aunque algún día pongas esa clave para otra cosa. Gasta del límite de uso de tu plan de Claude.
 *
 * Solo funciona donde esté instalado Claude Code con tu sesión iniciada (tu PC), no en un servidor.
 */

export class MannyError extends Error {
  constructor(
    message: string,
    public retryable = false,
  ) {
    super(message);
  }
}

export type ClaudeRun = { system: string; prompt: string; schema?: object; timeoutMs?: number };

/** Argumentos de la llamada: sin herramientas, sin MCP, sin tus ajustes ni CLAUDE.md, sin guardar la sesión. */
export function claudeArgs(run: Pick<ClaudeRun, "system" | "schema">, model = process.env.MANNY_MODEL || "sonnet") {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    model,
    "--tools",
    "",
    "--no-session-persistence",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--system-prompt",
    run.system,
  ];
  if (run.schema) args.push("--json-schema", JSON.stringify(run.schema));
  return args;
}

/** Entorno del proceso hijo sin credenciales de la API (así nunca cobra por tokens) ni secretos de la app. */
export function claudeEnv(env: NodeJS.ProcessEnv = process.env) {
  const drop = /^(ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|TOKEN_ENC_KEY|.*_SECRET|.*_API_KEY|STRIPE_.*|UPLOAD_POST_.*)$/i;
  return Object.fromEntries(Object.entries(env).filter(([k]) => !drop.test(k))) as NodeJS.ProcessEnv;
}

type CliResult = { is_error?: boolean; result?: string; subtype?: string; api_error_status?: number | null };

/** Traduce la salida JSON de `claude -p` a texto o a un error que se puede enseñar tal cual. */
export function readCliOutput(stdout: string): string {
  let out: CliResult;
  try {
    out = JSON.parse(stdout.trim().split("\n").filter(Boolean).at(-1) ?? "");
  } catch {
    throw new MannyError("Claude Code respondió algo que no entiendo. Vuelve a intentarlo.", true);
  }
  const text = (out.result ?? "").trim();
  if (out.is_error) {
    if (/log ?in|logged|auth|credential/i.test(text)) {
      throw new MannyError("Claude Code no tiene tu sesión iniciada en este ordenador. Abre una terminal, escribe «claude» e inicia sesión.");
    }
    if (/limit|usage|quota|rate/i.test(text)) {
      throw new MannyError("Has llegado al límite de uso de tu plan de Claude por ahora. Prueba más tarde.", true);
    }
    throw new MannyError(text ? `Claude Code dio un error: ${text.slice(0, 200)}` : "Claude Code dio un error. Vuelve a intentarlo.", true);
  }
  if (!text) throw new MannyError("Manny se quedó en blanco. Vuelve a intentarlo.", true);
  return text;
}

let chain: Promise<unknown> = Promise.resolve();

/** Una llamada cada vez: tu plan tiene un límite de uso y el PC no tiene por qué abrir diez procesos a la vez. */
export function runClaude(run: ClaudeRun): Promise<string> {
  const next = chain.then(() => spawnClaude(run));
  chain = next.catch(() => undefined);
  return next;
}

function spawnClaude(run: ClaudeRun): Promise<string> {
  // Sin instalación localizable se intenta «claude» tal cual: si falla, el error ENOENT lo explica abajo
  const cmd = resolveClaude() ?? { bin: "claude", pre: [], shell: false };
  const timeoutMs = run.timeoutMs ?? 180_000;
  return new Promise((resolve, reject) => {
    // Desde la carpeta temporal: así no carga el CLAUDE.md de este proyecto
    const proc = spawn(cmd.bin, [...cmd.pre, ...claudeArgs(run)], { cwd: os.tmpdir(), env: claudeEnv(), windowsHide: true, shell: cmd.shell });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new MannyError("Manny tardó demasiado en contestar. Vuelve a intentarlo.", true));
    }, timeoutMs);
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        e.code === "ENOENT"
          ? new MannyError("No encuentro Claude Code en este ordenador. Instálalo o pon su ruta en MANNY_CLAUDE_BIN (o CLAUDE_BIN).")
          : new MannyError("No he podido arrancar Claude Code. Vuelve a intentarlo.", true),
      );
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      try {
        resolve(readCliOutput(stdout));
      } catch (e) {
        if (code !== 0) log.warn("manny.cli_failed", { code, stderr: stderr.slice(0, 500) });
        reject(e);
      }
    });
    proc.stdin.end(run.prompt);
  });
}
