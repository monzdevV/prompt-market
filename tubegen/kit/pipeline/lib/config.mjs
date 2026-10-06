import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const JOBS = path.join(ROOT, "jobs");
export const OUT = path.join(ROOT, "out");
export const SECRETS = path.join(ROOT, "secrets");
export const DATA = path.join(ROOT, "data");

export const env = (k, fallback = "") => process.env[k]?.trim() || fallback;

export const loadChannel = (id = env("CHANNEL", "curiosidad")) => {
  const file = path.join(ROOT, "channels", `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`No existe el canal ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

export const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);
export const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

export const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

export const jobDir = (id) => path.join(JOBS, id);

/** Argumentos tipo --clave valor / --flag */
export const args = () => {
  const out = { _: [] };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const next = a[i + 1];
      if (next === undefined || next.startsWith("--")) out[k] = true;
      else out[k] = a[++i];
    } else out._.push(a[i]);
  }
  return out;
};

export const log = (...m) => console.log(`[${new Date().toLocaleTimeString("es-ES")}]`, ...m);
