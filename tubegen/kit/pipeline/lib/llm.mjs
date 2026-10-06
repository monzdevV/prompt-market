import { spawn } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";
import { env, log } from "./config.mjs";

/**
 * Pide a Claude un JSON. Con ANTHROPIC_API_KEY usa la API; si no, usa el CLI
 * `claude -p` con la sesión de Claude Code del usuario. En ambas vías `web: true` activa la búsqueda web
 * para verificar datos y fuentes.
 */
export async function askJson(prompt, { maxTokens = 64000, web = false } = {}) {
  const full = `${prompt}\n\nResponde SOLO con un bloque \`\`\`json válido, sin texto antes ni después.`;
  const text = env("ANTHROPIC_API_KEY") ? await viaApi(full, maxTokens, web) : await viaCli(full, web);
  return parseJson(text);
}

async function viaApi(prompt, maxTokens, web) {
  const client = new Anthropic();
  const model = env("CLAUDE_MODEL", "claude-sonnet-5-5");
  log(`Claude API (${model})${web ? " con búsqueda web" : ""}…`);
  // Búsqueda web del servidor de Anthropic (se ejecuta en sus servidores, sin bucle de herramientas propio).
  const tools = web ? [{ type: "web_search_20260209", name: "web_search", max_uses: 10 }] : undefined;
  const messages = [{ role: "user", content: prompt }];
  // Siempre en streaming: con max_tokens alto evita timeouts HTTP. El razonamiento adaptativo
  // también gasta de max_tokens, por eso los guiones piden margen de sobra (ver steps.mjs).
  for (let turn = 0; turn < 5; turn++) {
    const msg = await client.messages.stream({ model, max_tokens: maxTokens, messages, ...(tools ? { tools } : {}) }).finalMessage();
    // pause_turn: el bucle de búsquedas del servidor llegó a su límite; se reenvía tal cual y continúa.
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    if (msg.stop_reason === "max_tokens") {
      throw new Error(
        `La respuesta de Claude se cortó al llegar a max_tokens (${maxTokens}, razonamiento incluido): el JSON estaría incompleto. ` +
          "Sube maxTokens en pipeline/lib/steps.mjs o acorta el vídeo (long.minutes en channels/<canal>.json).",
      );
    }
    if (msg.stop_reason === "refusal") throw new Error(`Claude rechazó la petición (${msg.stop_details?.category ?? "sin categoría"}).`);
    // Con búsqueda web hay texto intercalado ("voy a buscar…"); el JSON va en el texto final, tras el último resultado.
    const text = (blocks) => blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
    const lastTool = msg.content.findLastIndex((b) => b.type.endsWith("_tool_result"));
    return text(msg.content.slice(lastTool + 1)) || text(msg.content);
  }
  throw new Error("Claude siguió pausando la búsqueda web tras 5 reanudaciones; vuelve a intentarlo.");
}

function viaCli(prompt, web) {
  log(`claude -p${web ? " (con búsqueda web)" : ""}…`);
  const argv = ["-p", "--output-format", "json"];
  if (web) argv.push("--allowedTools", "WebSearch,WebFetch");
  return new Promise((resolve, reject) => {
    // Los argumentos son fijos (sin datos del usuario), así que se pueden pasar como una sola línea al shell.
    const child = spawn(`claude ${argv.join(" ")}`, { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`claude -p salió con ${code}: ${err.slice(0, 500)}`));
      try {
        const res = JSON.parse(out);
        if (res.is_error) return reject(new Error(res.result));
        resolve(res.result);
      } catch {
        resolve(out);
      }
    });
    child.stdin.end(prompt);
  });
}

export function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(raw);
}
