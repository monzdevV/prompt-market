import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env";
import { resolveClaude } from "@/lib/manny/claude-bin";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "claude-bin-"));
const touch = (p: string, body = "") => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body);
};

describe("resolveClaude", () => {
  it("en Windows prefiere claude.exe nativo", () => {
    const dir = tmp();
    touch(path.join(dir, "claude.exe"));
    touch(path.join(dir, "claude.cmd"));
    expect(resolveClaude({ Path: dir }, "win32")).toEqual({ bin: path.join(dir, "claude.exe"), pre: [], shell: false });
  });

  it("con la instalación de npm (claude.cmd) lanza el programa del paquete con node, sin shell", () => {
    const dir = tmp();
    touch(path.join(dir, "claude.cmd"));
    const pkg = path.join(dir, "node_modules", "@anthropic-ai", "claude-code");
    touch(path.join(pkg, "package.json"), JSON.stringify({ bin: { claude: "cli.js" } }));
    touch(path.join(pkg, "cli.js"));
    expect(resolveClaude({ PATH: dir }, "win32")).toEqual({ bin: process.execPath, pre: [path.join(pkg, "cli.js")], shell: false });
  });

  it("si el .cmd no deja ver su paquete, lo usa con shell", () => {
    const dir = tmp();
    touch(path.join(dir, "claude.cmd"));
    expect(resolveClaude({ PATH: dir }, "win32")).toEqual({ bin: path.join(dir, "claude.cmd"), pre: [], shell: true });
  });

  it("respeta MANNY_CLAUDE_BIN / CLAUDE_BIN y devuelve null si no hay nada", () => {
    expect(resolveClaude({ CLAUDE_BIN: "/opt/claude" }, "linux")).toEqual({ bin: "/opt/claude", pre: [], shell: false });
    expect(resolveClaude({ PATH: tmp() }, "win32")).toBeNull();
    expect(resolveClaude({ PATH: tmp() }, "linux")).toBeNull();
  });
});

describe("checkEnv y la IA", () => {
  it("sin ANTHROPIC_API_KEY avisa de que usará Claude Code si está instalado", () => {
    const dir = tmp();
    touch(path.join(dir, process.platform === "win32" ? "claude.exe" : "claude"));
    const r = checkEnv({ TOKEN_ENC_KEY: Buffer.alloc(32).toString("base64"), PATH: dir });
    expect(r.warnings.join()).toMatch(/Claude Code/);
    expect(r.softErrors).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it("sin clave ni Claude Code lo marca como error que no bloquea el arranque", () => {
    const r = checkEnv({ NODE_ENV: "production", APP_URL: "https://a.es", ADMIN_EMAIL: "a@b.es", TOKEN_ENC_KEY: Buffer.alloc(32).toString("base64"), PATH: tmp() });
    expect(r.softErrors.join()).toMatch(/no podrá escribir/);
    expect(r.errors).toEqual([]);
  });
});
