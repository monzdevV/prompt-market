#!/usr/bin/env node
// Genera src/data/catalogo.json a partir de las carpetas de producto (../<producto>/).
// Se ejecuta antes de dev y build. Solo entran los productos con publicado: true.
// Del PROMPT.md solo se copian las primeras LINEAS_VISTA_PREVIA líneas: nunca el prompt completo ni el kit.
import fs from "node:fs";
import path from "node:path";
import { WEB, ARCHIVOS_PAQUETE, archivosKit, leerProductos } from "./paquetes.mjs";

const LINEAS_VISTA_PREVIA = 25;
const EXT_CODIGO = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".sql", ".py", ".json", ".ps1", ".sh"]);
// Secciones del README que la ficha ya muestra con componentes propios.
const SECCIONES_OMITIDAS = new Set(["Qué necesitas", "Cómo se usa", "Contenido del paquete"]);
const CAMPOS_OBLIGATORIOS = ["slug", "titulo", "subtitulo", "categoria", "stack", "precio", "dificultad", "tiempoInstalacion", "requisitos", "publicado"];

/** Markdown muy acotado (el de los README de los paquetes) → bloques serializables. */
function bloquesMarkdown(lineas) {
  const bloques = [];
  let i = 0;
  while (i < lineas.length) {
    const l = lineas[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("### ")) { bloques.push({ t: "h", texto: l.slice(4).trim() }); i++; continue; }
    if (/^\s*[-*] /.test(l)) {
      const items = [];
      while (i < lineas.length && (/^\s*[-*] /.test(lineas[i]) || /^\s{2,}\S/.test(lineas[i]))) {
        const m = lineas[i].match(/^(\s*)[-*] (.*)$/);
        if (m) items.push({ texto: m[2].trim(), nivel: m[1].length >= 2 ? 1 : 0 });
        else if (items.length) items[items.length - 1].texto += " " + lineas[i].trim();
        i++;
      }
      bloques.push({ t: "lista", items });
      continue;
    }
    if (/^\s*\d+\. /.test(l)) {
      const items = [];
      while (i < lineas.length && /^\s*\d+\. /.test(lineas[i])) {
        items.push({ texto: lineas[i].replace(/^\s*\d+\. /, "").trim(), nivel: 0 });
        i++;
      }
      bloques.push({ t: "pasos", items });
      continue;
    }
    if (l.trim().startsWith("|")) {
      const filas = [];
      while (i < lineas.length && lineas[i].trim().startsWith("|")) {
        const celdas = lineas[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!celdas.every((c) => /^:?-{2,}:?$/.test(c))) filas.push(celdas);
        i++;
      }
      bloques.push({ t: "tabla", cabecera: filas[0] ?? [], filas: filas.slice(1) });
      continue;
    }
    // Párrafo: junta líneas seguidas.
    const partes = [];
    while (i < lineas.length && lineas[i].trim() && !/^(#{1,3} |\s*[-*] |\s*\d+\. |\|)/.test(lineas[i])) {
      partes.push(lineas[i].trim());
      i++;
    }
    const texto = partes.join(" ");
    if (/^\*\*[^*]+\*\*$/.test(texto)) bloques.push({ t: "sub", texto: texto.slice(2, -2) });
    else bloques.push({ t: "p", texto });
  }
  return bloques;
}

function leerReadme(ruta) {
  const lineas = fs.readFileSync(ruta, "utf8").replace(/\r\n/g, "\n").split("\n");
  const h1 = lineas.find((l) => l.startsWith("# "))?.slice(2).trim() ?? "";
  const iSeccion = lineas.findIndex((l) => l.startsWith("## "));
  const cabecera = lineas.slice(lineas.findIndex((l) => l.startsWith("# ")) + 1, iSeccion === -1 ? undefined : iSeccion);
  const intro = bloquesMarkdown(cabecera);
  const lema = intro[0]?.t === "sub" ? intro.shift().texto : "";
  const secciones = [];
  if (iSeccion !== -1) {
    let actual = null;
    for (const l of lineas.slice(iSeccion)) {
      if (l.startsWith("## ")) {
        actual = { titulo: l.slice(3).trim(), lineas: [] };
        secciones.push(actual);
      } else actual.lineas.push(l);
    }
  }
  // Fila «kit/» de la tabla «Contenido del paquete»: lo que se verificó del kit.
  const filaKit = lineas.find((l) => /^\|\s*`kit\/`\s*\|/.test(l));
  const descKit = filaKit ? filaKit.split("|")[2]?.trim() ?? "" : "";
  const verificacion = descKit.includes(":") ? descKit.slice(descKit.indexOf(":") + 1).trim() : descKit;
  return {
    h1,
    tipo: h1.includes("·") ? h1.slice(h1.indexOf("·") + 1).trim() : "",
    verificacion,
    lema,
    intro,
    secciones: secciones
      .filter((s) => !SECCIONES_OMITIDAS.has(s.titulo))
      .map((s) => ({ titulo: s.titulo, bloques: bloquesMarkdown(s.lineas) })),
  };
}

function bytes(ruta) {
  return fs.statSync(ruta).size;
}

function contarLineas(ruta) {
  const txt = fs.readFileSync(ruta, "utf8");
  return txt ? txt.split("\n").length : 0;
}

function medirPaquete(dir) {
  const contenido = [];
  for (const nombre of ARCHIVOS_PAQUETE) {
    const ruta = path.join(dir, nombre);
    if (fs.existsSync(ruta)) contenido.push({ ruta: nombre, tipo: "archivo", archivos: 1, bytes: bytes(ruta), lineas: contarLineas(ruta) });
  }
  const dirKit = path.join(dir, "kit");
  const kit = archivosKit(dirKit);
  let bytesKit = 0;
  let lineasCodigo = 0;
  for (const rel of kit) {
    const abs = path.join(dirKit, rel);
    const b = bytes(abs);
    bytesKit += b;
    const ext = path.extname(rel).toLowerCase();
    // package-lock y similares inflan el recuento sin ser código escrito.
    if (EXT_CODIGO.has(ext) && !/(^|\/)package-lock\.json$/.test(rel) && b < 400_000) lineasCodigo += contarLineas(abs);
  }
  contenido.push({ ruta: "kit/", tipo: "carpeta", archivos: kit.length, bytes: bytesKit, lineas: lineasCodigo });
  return {
    contenido,
    archivos: contenido.reduce((n, c) => n + c.archivos, 0),
    bytes: contenido.reduce((n, c) => n + c.bytes, 0),
    lineasCodigo,
  };
}

function main() {
  const publicados = [];
  const omitidos = [];
  const productos = leerProductos();
  const salida = path.join(WEB, "src", "data", "catalogo.json");
  // Si se despliega solo web/ (sin las carpetas hermanas), se conserva el catálogo ya generado.
  if (!productos.length && fs.existsSync(salida)) {
    console.warn("catálogo: no hay carpetas de producto junto a web/; se mantiene src/data/catalogo.json");
    return;
  }
  for (const { carpeta, dir, datos } of productos) {
    const faltan = CAMPOS_OBLIGATORIOS.filter((c) => datos[c] === undefined);
    if (faltan.length) throw new Error(`${carpeta}/producto.json: faltan campos ${faltan.join(", ")}`);
    if (datos.publicado !== true) {
      omitidos.push(carpeta);
      continue;
    }
    const prompt = fs.readFileSync(path.join(dir, "PROMPT.md"), "utf8").replace(/\r\n/g, "\n").split("\n");
    const publico = { ...datos };
    delete publico.notaInterna;
    publicados.push({
      ...publico,
      stripePaymentLink: datos.stripePaymentLink ?? "",
      captura: datos.captura ?? "",
      faq: datos.faq ?? [],
      readme: leerReadme(path.join(dir, "README.md")),
      vistaPrevia: { lineas: prompt.slice(0, LINEAS_VISTA_PREVIA), total: prompt.length },
      paquete: medirPaquete(dir),
    });
  }
  const slugs = new Set();
  for (const p of publicados) {
    if (slugs.has(p.slug)) throw new Error(`slug repetido: ${p.slug}`);
    slugs.add(p.slug);
  }
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify({ productos: publicados }, null, 2) + "\n");
  console.log(`catálogo: ${publicados.length} publicados (${publicados.map((p) => p.slug).join(", ")})`);
  if (omitidos.length) console.log(`no publicados, fuera del catálogo: ${omitidos.join(", ")}`);
}

main();
