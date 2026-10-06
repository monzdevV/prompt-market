#!/usr/bin/env node
/**
 * Contraste WCAG y propuesta de colores para tokens.ts. Node puro, sin dependencias.
 *
 *   node scripts/contraste.mjs "#C6FF3D" ["#0A6A87" ...]
 *       Contraste de cada color contra los fondos de src/design/tokens.ts.
 *
 *   node scripts/contraste.mjs --generar "#C6FF3D"
 *       A partir del color de acento propone acentoTinta y datoAzul (claro y
 *       oscuro), las rampas de 6 pasos de ambos temas y marca-gym, imprime un
 *       bloque listo para pegar en tokens.ts y la tabla de contrastes.
 *
 *   node scripts/contraste.mjs --oscurecer "#1C86A8" [4.5]
 *       El mínimo oscurecimiento (en OKLCH) que alcanza el ratio sobre los
 *       fondos claros (#F2F7FA y #FFFFFF por defecto).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------ Color ------------------------------ */

function hexARgb(hex) {
  let h = String(hex).trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Color no válido: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

const aHex = (rgb) =>
  "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

const lineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function luminancia(hex) {
  const [r, g, b] = hexARgb(hex).map(lineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function rgbAOklch(rgb) {
  const [r, g, b] = rgb.map(lineal);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

/** OKLCH → sRGB lineal (sin recortar). */
function oklchALineal([L, C, H]) {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const dentro = (lin) => lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH → hex, bajando croma (mismo tono y luminosidad) si se sale de sRGB. */
function oklchAHex([L, C, H]) {
  let c = C;
  if (!dentro(oklchALineal([L, c, H]))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (dentro(oklchALineal([L, mid, H]))) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  return aHex(oklchALineal([L, c, H]).map((v) => gamma(Math.min(1, Math.max(0, v)))));
}

const oklch = (hex) => rgbAOklch(hexARgb(hex));

/** Baja (o sube) la luminosidad OKLCH en pasos de 0.001 hasta pasar `ratio` sobre todos los fondos. */
function ajustar(hex, fondos, ratio, sentido = -1) {
  const [L0, C, H] = oklch(hex);
  for (let L = L0; L >= 0 && L <= 1; L += 0.001 * sentido) {
    const candidato = Math.abs(L - L0) < 1e-9 ? hex.toUpperCase() : oklchAHex([L, C, H]);
    if (fondos.every((f) => contraste(candidato, f) >= ratio)) return candidato;
  }
  return sentido < 0 ? "#000000" : "#FFFFFF";
}

/* ------------------------- Fondos de tokens.ts ------------------------- */

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

function fondosDeTokens() {
  const reserva = {
    claro: { fondo: "#F2F7FA", placa: "#FFFFFF", placa2: "#E4ECF1" },
    oscuro: { fondo: "#0A0B0D", placa: "#121418", placa2: "#1B1E24" },
    crmClaro: { fondo: "#F4F4F5", placa: "#FFFFFF", placa2: "#EEEEF0" },
    crmOscuro: { fondo: "#0A0A0B", placa: "#141416", placa2: "#1C1C1F" },
  };
  let src;
  try {
    src = readFileSync(join(raiz, "src", "design", "tokens.ts"), "utf8");
  } catch {
    return reserva;
  }
  const bloque = (desde, nombre) => {
    const i = src.indexOf(desde);
    if (i < 0) return null;
    const j = src.indexOf(`${nombre}: {`, i);
    if (j < 0) return null;
    const cuerpo = src.slice(j, src.indexOf("}", j));
    const leer = (k) => cuerpo.match(new RegExp(`\\b${k}:\\s*"(#[0-9a-fA-F]{6})"`))?.[1];
    const r = { fondo: leer("fondo"), placa: leer("placa"), placa2: leer("placa2") };
    return r.fondo && r.placa && r.placa2 ? r : null;
  };
  return {
    claro: bloque("export const temas:", "claro") ?? reserva.claro,
    oscuro: bloque("export const temas:", "oscuro") ?? reserva.oscuro,
    crmClaro: bloque("export const temasCrm", "claro") ?? reserva.crmClaro,
    crmOscuro: bloque("export const temasCrm", "oscuro") ?? reserva.crmOscuro,
  };
}

const ETIQUETA = { claro: "web claro", oscuro: "web oscuro", crmClaro: "CRM claro", crmOscuro: "CRM oscuro" };

/* ------------------------------ Salida ------------------------------ */

const marca = (r, min = 4.5) => (r >= 7 ? "AAA" : r >= min ? "AA " : r >= 3 ? "3:1" : "✗  ");
const fmt = (r) => r.toFixed(2).padStart(5);

function tabla(filas) {
  const ancho = Math.max(...filas.map((f) => f[0].length));
  for (const [nombre, color, fondo, nombreFondo, min = 4.5] of filas) {
    const r = contraste(color, fondo);
    console.log(`  ${nombre.padEnd(ancho)}  ${color}  sobre ${fondo} (${nombreFondo.padEnd(14)})  ${fmt(r)}:1  ${marca(r, min)}`);
  }
}

function modoComprobar(colores) {
  const fondos = fondosDeTokens();
  for (const c of colores) {
    const [L, C, H] = oklch(c);
    console.log(`\n${c.toUpperCase()}  ·  oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`);
    const filas = [];
    for (const [tema, f] of Object.entries(fondos)) {
      for (const [k, v] of Object.entries(f)) filas.push([ETIQUETA[tema], c, v, k]);
    }
    tabla(filas);
  }
  console.log("\nAA = 4.5:1 (texto)  ·  3:1 = sólo texto grande, iconos y gráficos  ·  ✗ = no apto\n");
}

function modoOscurecer(hex, ratio = 4.5) {
  const claro = ["#F2F7FA", "#FFFFFF"];
  const nuevo = ajustar(hex, claro, ratio, -1);
  console.log(`\n${hex.toUpperCase()} → ${nuevo}  (≥ ${ratio}:1 sobre ${claro.join(" y ")})`);
  tabla([
    ["antes", hex.toUpperCase(), claro[0], "fondo"],
    ["antes", hex.toUpperCase(), claro[1], "placa"],
    ["después", nuevo, claro[0], "fondo"],
    ["después", nuevo, claro[1], "placa"],
  ]);
  console.log();
}

function rampa(hex, desde, hasta) {
  const [, C, H] = oklch(hex);
  return Array.from({ length: 6 }, (_, i) => oklchAHex([desde + ((hasta - desde) * i) / 5, C, H]));
}

function modoGenerar(base) {
  base = base.toUpperCase();
  const fondos = fondosDeTokens();
  const claros = ["#F2F7FA", "#FFFFFF", fondos.claro.fondo, fondos.claro.placa];
  const oscuros = [fondos.oscuro.fondo, fondos.oscuro.placa, fondos.oscuro.placa2];
  const crmClaros = [fondos.crmClaro.fondo, fondos.crmClaro.placa];
  const crmOscuros = [fondos.crmOscuro.fondo, fondos.crmOscuro.placa];

  // Claro: oscurecer en OKLCH. La tinta de texto pide 5,5:1 (margen sobre AA, como la de serie); el dato, el mínimo AA.
  const acentoTintaClaro = ajustar(base, claros, 5.5, -1);
  const datoAzulClaro = ajustar(base, claros, 4.5, -1);
  // Oscuro: la tinta es el propio acento si ya contrasta (si no, se aclara); el dato baja a L≈0.65.
  const acentoTintaOscuro = ajustar(base, oscuros, 4.5, +1);
  const [, C, H] = oklch(base);
  const datoAzulOscuro = ajustar(oklchAHex([Math.min(0.65, oklch(base)[0]), C, H]), oscuros, 4.5, +1);
  const rampaClaro = rampa(base, 0.75, 0.3);
  const rampaOscuro = rampa(base, 0.3, 0.9);
  const marcaGymClaro = ajustar(base, crmClaros, 4.5, -1);
  const marcaGymOscuro = ajustar(base, crmOscuros, 4.5, +1);
  const sobreCampo = contraste(base, "#0A0B0D") >= contraste(base, "#FFFFFF") ? "#0A0B0D" : "#FFFFFF";

  const lista = (a) => `[${a.map((c) => `"${c}"`).join(", ")}]`;
  console.log(`
/* ---- Propuesta para src/design/tokens.ts a partir de ${base} ---- */

// export const marca = { ... }
    azul: "${base}",            // acento: campo sólido con texto ${sobreCampo === "#0A0B0D" ? "negro" : "blanco"} (${contraste(base, sobreCampo).toFixed(2)}:1)

// temas.claro
    acentoTinta: "${acentoTintaClaro}",
    datoAzul: "${datoAzulClaro}",
    rampa: ${lista(rampaClaro)},

// temas.oscuro
    acentoTinta: "${acentoTintaOscuro}",
    datoAzul: "${datoAzulOscuro}",
    rampa: ${lista(rampaOscuro)},

// extrasCrm.claro / extrasCrm.oscuro
    "marca-gym": "${marcaGymClaro}",   // claro
    "marca-gym": "${marcaGymOscuro}",   // oscuro
`);
  if (sobreCampo !== "#0A0B0D") {
    console.log(`  Aviso: ${base} contrasta más con blanco; cambia camposMarca.sobreCampo a "#FFFFFF" en tokens.ts.\n`);
  }

  console.log("Contrastes:");
  tabla([
    ["acento (campo)", base, sobreCampo, "texto encima"],
    ["acentoTinta claro", acentoTintaClaro, "#F2F7FA", "web fondo"],
    ["acentoTinta claro", acentoTintaClaro, "#FFFFFF", "web placa"],
    ["datoAzul claro", datoAzulClaro, "#F2F7FA", "web fondo"],
    ["datoAzul claro", datoAzulClaro, "#FFFFFF", "web placa"],
    ["acentoTinta oscuro", acentoTintaOscuro, fondos.oscuro.fondo, "web fondo"],
    ["acentoTinta oscuro", acentoTintaOscuro, fondos.oscuro.placa2, "web placa2"],
    ["datoAzul oscuro", datoAzulOscuro, fondos.oscuro.fondo, "web fondo"],
    ["datoAzul oscuro", datoAzulOscuro, fondos.oscuro.placa2, "web placa2"],
    ["marca-gym claro", marcaGymClaro, fondos.crmClaro.fondo, "CRM fondo"],
    ["marca-gym claro", marcaGymClaro, fondos.crmClaro.placa, "CRM placa"],
    ["marca-gym oscuro", marcaGymOscuro, fondos.crmOscuro.fondo, "CRM fondo"],
    ["marca-gym oscuro", marcaGymOscuro, fondos.crmOscuro.placa, "CRM placa"],
    ...rampaClaro.map((c, i) => [`rampa claro ${i}`, c, fondos.claro.fondo, "web fondo", 3]),
    ...rampaOscuro.map((c, i) => [`rampa oscuro ${i}`, c, fondos.oscuro.fondo, "web fondo", 3]),
  ]);
  console.log("\nLas rampas son relleno de gráficos (embudo): basta con distinguirse entre sí; 3:1 es orientativo.\n");
}

/* ------------------------------ CLI ------------------------------ */

const args = process.argv.slice(2);
try {
  if (!args.length || args.includes("--ayuda") || args.includes("-h")) {
    console.log(`Uso:
  node scripts/contraste.mjs "#C6FF3D" [...]           contraste contra los fondos de tokens.ts
  node scripts/contraste.mjs --generar "#C6FF3D"       propuesta de tokens a partir del acento
  node scripts/contraste.mjs --oscurecer "#1C86A8" [4.5]  mínimo oscurecimiento para pasar el ratio`);
  } else if (args[0] === "--generar") {
    if (!args[1]) throw new Error("Falta el color: --generar \"#5CE1FF\"");
    modoGenerar(args[1]);
  } else if (args[0] === "--oscurecer") {
    if (!args[1]) throw new Error("Falta el color: --oscurecer \"#1C86A8\"");
    modoOscurecer(args[1], args[2] ? Number(args[2]) : 4.5);
  } else {
    modoComprobar(args);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
