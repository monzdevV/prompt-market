// Utilidades compartidas por catalogo.mjs y empaquetar.mjs.
// Una sola definición de «qué viaja en un paquete» para que lo que la web
// declara (recuentos, tamaños) coincida con lo que el comprador recibe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RAIZ = path.resolve(WEB, "..");

// Archivos de primer nivel que se entregan (si existen), en este orden.
export const ARCHIVOS_PAQUETE = [
  "README.md",
  "PROMPT.md",
  "PERSONALIZAR.md",
  "SPEC.md",
  "negocio.ejemplo.json",
];

// Carpetas que nunca viajan dentro de kit/: dependencias, builds, cachés y datos locales.
const CARPETAS_EXCLUIDAS = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  ".vercel",
  ".turbo",
  ".expo",
  ".cache",
  "coverage",
]);

/** ¿Debe excluirse este archivo/carpeta del kit? (nombre de la entrada, no la ruta) */
export function excluido(nombre, esCarpeta) {
  if (esCarpeta) return CARPETAS_EXCLUIDAS.has(nombre);
  // .env* nunca; .env.example sí, porque los prompts lo usan como plantilla y no lleva secretos.
  if (nombre.startsWith(".env") && nombre !== ".env.example") return true;
  if (nombre.endsWith(".tsbuildinfo")) return true;
  if (nombre === ".DS_Store" || nombre === "Thumbs.db") return true;
  return false;
}

/** Recorre kit/ devolviendo rutas relativas (con «/») de los archivos que viajan. */
export function archivosKit(dirKit) {
  const salida = [];
  if (!fs.existsSync(dirKit)) return salida;
  const pila = [""];
  while (pila.length) {
    const rel = pila.pop();
    const abs = path.join(dirKit, rel);
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (excluido(e.name, e.isDirectory())) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) pila.push(r);
      else if (e.isFile()) salida.push(r);
    }
  }
  return salida.sort();
}

/** Lee el producto.json de cada carpeta hermana de web/. */
export function leerProductos() {
  const productos = [];
  for (const e of fs.readdirSync(RAIZ, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "web" || e.name.startsWith(".")) continue;
    const dir = path.join(RAIZ, e.name);
    const ficha = path.join(dir, "producto.json");
    if (!fs.existsSync(ficha)) continue;
    const datos = JSON.parse(fs.readFileSync(ficha, "utf8"));
    productos.push({ carpeta: e.name, dir, datos });
  }
  return productos.sort((a, b) => a.datos.titulo.localeCompare(b.datos.titulo, "es"));
}
