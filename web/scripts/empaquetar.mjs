#!/usr/bin/env node
// Genera dist-paquetes/<slug>.zip por producto publicado, para entregarlo tras la compra.
// Incluye README, PROMPT, PERSONALIZAR, SPEC, negocio.ejemplo.json (si existe) y kit/
// sin node_modules, .next, out ni .env* (salvo .env.example).
// Uso: node scripts/empaquetar.mjs [--todos] [slug ...]
//   --todos  incluye también los no publicados (nunca se suben a la web).
// Escritor ZIP propio (deflate + CRC32 de node:zlib) para no añadir dependencias.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { WEB, ARCHIVOS_PAQUETE, archivosKit, leerProductos } from "./paquetes.mjs";

const SALIDA = path.join(WEB, "dist-paquetes");

function fechaDos(d) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const fecha = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, fecha };
}

function crearZip(entradas, destino) {
  const fd = fs.openSync(destino, "w");
  const central = [];
  let desplazamiento = 0;
  const escribir = (buf) => {
    fs.writeSync(fd, buf);
    desplazamiento += buf.length;
  };
  for (const { nombre, abs } of entradas) {
    const datos = fs.readFileSync(abs);
    const comprimido = zlib.deflateRawSync(datos, { level: 9 });
    const usarDeflate = comprimido.length < datos.length;
    const cuerpo = usarDeflate ? comprimido : datos;
    const crc = zlib.crc32(datos) >>> 0;
    const nombreBuf = Buffer.from(nombre, "utf8");
    const { hora, fecha } = fechaDos(fs.statSync(abs).mtime);
    const metodo = usarDeflate ? 8 : 0;
    const FLAG_UTF8 = 0x0800;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(metodo, 8);
    local.writeUInt16LE(hora, 10);
    local.writeUInt16LE(fecha, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(cuerpo.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const inicio = desplazamiento;
    escribir(local);
    escribir(nombreBuf);
    escribir(cuerpo);

    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(FLAG_UTF8, 8);
    c.writeUInt16LE(metodo, 10);
    c.writeUInt16LE(hora, 12);
    c.writeUInt16LE(fecha, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(cuerpo.length, 20);
    c.writeUInt32LE(datos.length, 24);
    c.writeUInt16LE(nombreBuf.length, 28);
    c.writeUInt32LE(inicio, 42);
    central.push(Buffer.concat([c, nombreBuf]));
  }
  const inicioCentral = desplazamiento;
  for (const c of central) escribir(c);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(central.length, 8);
  fin.writeUInt16LE(central.length, 10);
  fin.writeUInt32LE(desplazamiento - inicioCentral, 12);
  fin.writeUInt32LE(inicioCentral, 16);
  escribir(fin);
  fs.closeSync(fd);
}

function formatoTamano(b) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

function main() {
  const args = process.argv.slice(2);
  const todos = args.includes("--todos");
  const pedidos = args.filter((a) => !a.startsWith("--"));
  fs.mkdirSync(SALIDA, { recursive: true });

  const filas = [];
  for (const { dir, datos } of leerProductos()) {
    if (pedidos.length && !pedidos.includes(datos.slug)) continue;
    if (!datos.publicado && !todos) continue;
    const entradas = [];
    for (const nombre of ARCHIVOS_PAQUETE) {
      const abs = path.join(dir, nombre);
      if (fs.existsSync(abs)) entradas.push({ nombre: `${datos.slug}/${nombre}`, abs });
    }
    const dirKit = path.join(dir, "kit");
    for (const rel of archivosKit(dirKit)) entradas.push({ nombre: `${datos.slug}/kit/${rel}`, abs: path.join(dirKit, rel) });

    // Comprobación de seguridad: nada de secretos ni dependencias dentro del zip.
    const prohibido = entradas.find((e) => /(^|\/)(node_modules|\.next)\//.test(e.nombre) || /(^|\/)\.env(?!\.example$)[^/]*$/.test(e.nombre));
    if (prohibido) throw new Error(`entrada no permitida en ${datos.slug}: ${prohibido.nombre}`);

    const destino = path.join(SALIDA, `${datos.slug}.zip`);
    crearZip(entradas, destino);
    const original = entradas.reduce((n, e) => n + fs.statSync(e.abs).size, 0);
    filas.push({ slug: datos.slug, archivos: entradas.length, original, zip: fs.statSync(destino).size, publicado: datos.publicado });
  }

  console.log("slug".padEnd(16), "archivos".padStart(9), "sin comprimir".padStart(14), "zip".padStart(10));
  for (const f of filas) {
    console.log(f.slug.padEnd(16), String(f.archivos).padStart(9), formatoTamano(f.original).padStart(14), formatoTamano(f.zip).padStart(10), f.publicado ? "" : "(no publicado)");
  }
  console.log(`→ ${path.relative(WEB, SALIDA)}/`);
}

main();
