import fs from "node:fs";
import path from "node:path";

/*
 * Cómo arrancar Claude Code sin depender de cómo se instaló.
 * - Instalador nativo: `claude` / `claude.exe`, se lanza directamente.
 * - En Windows vía npm solo hay `claude.cmd`, que spawn() sin shell no puede ejecutar (ENOENT/EINVAL).
 *   Se busca el programa real del paquete y se lanza sin shell (los argumentos llevan saltos de línea y
 *   comillas que cmd.exe no sabe pasar); solo si no aparece se recurre a `claude.cmd` con shell.
 * - MANNY_CLAUDE_BIN o CLAUDE_BIN fijan la ruta a mano.
 * Solo mira el disco (sin lanzar procesos): vale también para la comprobación al arrancar.
 */

export type ClaudeCommand = { bin: string; pre: string[]; shell: boolean };

type Env = Record<string, string | undefined>;

const isFile = (p: string) => {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
};

/** PATH sin distinguir mayúsculas (en Windows suele llamarse «Path»). */
function pathDirs(env: Env) {
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH");
  return (key ? env[key] ?? "" : "").split(path.delimiter).filter(Boolean);
}

function findOnPath(names: string[], env: Env): string | null {
  const dirs = pathDirs(env);
  for (const name of names) for (const dir of dirs) if (isFile(path.join(dir, name))) return path.join(dir, name);
  return null;
}

/** De `…\npm\claude.cmd` al programa del paquete `@anthropic-ai/claude-code` que hay al lado. */
function fromCmdShim(cmdPath: string): ClaudeCommand {
  const pkgDir = path.join(path.dirname(cmdPath), "node_modules", "@anthropic-ai", "claude-code");
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")) as { bin?: string | Record<string, string> };
    const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.claude;
    const target = rel ? path.join(pkgDir, rel) : "";
    if (target && isFile(target)) {
      return /\.[cm]?js$/i.test(target) ? { bin: process.execPath, pre: [target], shell: false } : { bin: target, pre: [], shell: false };
    }
  } catch {
    // Sin package.json legible: último recurso, el .cmd con shell
  }
  return { bin: cmdPath, pre: [], shell: true };
}

/** Comando para lanzar Claude Code, o null si no está instalado (o no está en el PATH). */
export function resolveClaude(env: Env = process.env, platform: NodeJS.Platform = process.platform): ClaudeCommand | null {
  const explicit = env.MANNY_CLAUDE_BIN?.trim() || env.CLAUDE_BIN?.trim();
  if (explicit) {
    return platform === "win32" && /\.(cmd|bat)$/i.test(explicit) ? fromCmdShim(explicit) : { bin: explicit, pre: [], shell: false };
  }
  if (platform !== "win32") {
    const found = findOnPath(["claude"], env);
    return found ? { bin: found, pre: [], shell: false } : null;
  }
  const exe = findOnPath(["claude.exe"], env);
  if (exe) return { bin: exe, pre: [], shell: false };
  const cmd = findOnPath(["claude.cmd"], env);
  return cmd ? fromCmdShim(cmd) : null;
}
