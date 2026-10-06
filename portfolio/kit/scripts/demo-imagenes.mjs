// Genera las imágenes de los 6 proyectos de DEMO (ficticios) en public/proyectos/<slug>/.
// Son maquetas abstractas y tipográficas hechas con SVG y rasterizadas con sharp (viene con Next.js).
// Uso: node scripts/demo-imagenes.mjs   ·   Cuando pongas tus proyectos reales, borra public/proyectos/ y este script.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "public", "proyectos");
const SANS = "'Segoe UI','Helvetica Neue',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "Consolas,'SFMono-Regular',Menlo,monospace";
const DISPLAY = "'Arial Black','Segoe UI Black','Helvetica Neue',Arial,sans-serif";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, { size = 16, fill = "#fff", font = SANS, weight = 400, anchor = "start", ls = 0, op = 1, italic = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" fill-opacity="${op}" text-anchor="${anchor}" letter-spacing="${ls}"${italic ? ' font-style="italic"' : ""}>${esc(s)}</text>`;
const rect = (x, y, w, h, fill, r = 0, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const bars = (x, y, widths, { h = 10, gap = 18, fill = "#fff", op = 0.18 } = {}) =>
  widths.map((w, i) => rect(x, y + i * gap, w, h, fill, h / 2, `fill-opacity="${op}"`)).join("");
// Deterministic pseudo-random, so the images are the same on every run.
const rnd = (n) => {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
};
const svg = (w, h, body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

async function save(slug, name, w, h, body, defs) {
  const dir = join(OUT, slug);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${name}.webp`);
  await sharp(Buffer.from(svg(w, h, body, defs))).webp({ quality: 82 }).toFile(file);
  console.log(`  ${slug}/${name}.webp  ${w}×${h}`);
}

// Generic site chrome: logo, links and a pill button along the top.
const nav = (w, { logo, links, fg, accent, bg = "none" }) =>
  rect(0, 0, w, 84, bg) +
  text(64, 52, logo, { size: 22, weight: 700, fill: fg, ls: -0.5 }) +
  links.map((l, i) => text(w - 520 + i * 110, 50, l, { size: 15, fill: fg, op: 0.7 })).join("") +
  rect(w - 190, 28, 126, 38, accent, 19) +
  text(w - 127, 52, "Reservar", { size: 14, weight: 600, fill: "#0a0f2a", anchor: "middle" });

const waves = (w, h, y0, color, n = 9, amp = 26) =>
  Array.from({ length: n }, (_, i) => {
    const y = y0 + i * 34;
    const a = amp * (1 - i / (n + 2));
    let d = `M -20 ${y}`;
    for (let x = -20; x <= w + 40; x += 120) d += ` Q ${x + 30} ${y - a} ${x + 60} ${y} T ${x + 120} ${y}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-opacity="${0.75 - i * 0.07}"/>`;
  }).join("");

// ---------------------------------------------------------------------------------------------
// 1 · Marea — reservas para una escuela de vela (web)

async function marea() {
  const s = "marea";
  const A = "#5fd0ff";
  const bg = `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a4a"/><stop offset="1" stop-color="#05162b"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffd59a"/><stop offset="0.6" stop-color="#ff9a3c" stop-opacity="0.5"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>`;
  await save(
    s,
    "inicio",
    1440,
    900,
    rect(0, 0, 1440, 900, "url(#sea)") +
      `<circle cx="1060" cy="380" r="260" fill="url(#sun)"/>` +
      waves(1440, 900, 540, A, 10, 22) +
      nav(1440, { logo: "marea·", links: ["Cursos", "Flota", "Calendario", "Escuela"], fg: "#e8f4ff", accent: A }) +
      text(64, 260, "Aprende a navegar", { size: 92, weight: 700, fill: "#f3f9ff", ls: -3 }) +
      text(64, 360, "con el viento a favor.", { size: 92, font: SERIF, italic: true, fill: A, ls: -2 }) +
      text(66, 430, "Cursos de iniciación y perfeccionamiento. Reserva tu plaza en dos minutos.", { size: 20, fill: "#cfe3f5", op: 0.8 }) +
      rect(64, 470, 220, 56, A, 28) +
      text(174, 505, "Ver cursos", { size: 17, weight: 600, fill: "#05162b", anchor: "middle" }) +
      text(312, 505, "Calendario de salidas →", { size: 17, fill: "#e8f4ff", op: 0.8 }),
    bg,
  );

  // Booking calendar screen.
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  let cal = "";
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c + 1;
      const x = 520 + c * 118;
      const y = 250 + r * 112;
      const busy = rnd(n) > 0.55;
      const sel = n === 17;
      cal += rect(x, y, 104, 98, sel ? A : busy ? "#123a60" : "#0d2440", 14);
      cal += text(x + 14, y + 30, String(n), { size: 18, weight: 600, fill: sel ? "#05162b" : "#e8f4ff", op: busy || sel ? 1 : 0.5 });
      if (busy && !sel) cal += rect(x + 14, y + 62, 60 + rnd(n + 3) * 20, 8, A, 4, 'fill-opacity="0.7"');
      if (sel) cal += text(x + 14, y + 76, "3 plazas", { size: 13, fill: "#05162b" });
    }
  await save(
    s,
    "calendario",
    1440,
    900,
    rect(0, 0, 1440, 900, "#071d36") +
      nav(1440, { logo: "marea·", links: ["Cursos", "Flota", "Calendario", "Escuela"], fg: "#e8f4ff", accent: A }) +
      text(64, 190, "Calendario", { size: 54, weight: 700, fill: "#f3f9ff", ls: -1.5 }) +
      text(64, 236, "Octubre · salidas de mañana", { size: 18, fill: "#cfe3f5", op: 0.7 }) +
      rect(64, 290, 380, 420, "#0d2440", 20) +
      text(92, 340, "Iniciación a la vela ligera", { size: 20, weight: 600, fill: "#f3f9ff" }) +
      bars(92, 370, [300, 260, 280, 180], { fill: "#cfe3f5", op: 0.18 }) +
      text(92, 500, "Sábado 17", { size: 34, font: SERIF, italic: true, fill: A }) +
      text(92, 540, "10:00 – 13:30 · 3 plazas libres", { size: 16, fill: "#cfe3f5", op: 0.8 }) +
      rect(92, 620, 324, 56, A, 28) +
      text(254, 655, "Reservar plaza", { size: 17, weight: 600, fill: "#05162b", anchor: "middle" }) +
      days.map((d, i) => text(534 + i * 118, 232, d, { size: 14, fill: "#cfe3f5", op: 0.6, font: MONO })).join("") +
      cal,
  );

  // Phone version.
  await save(
    s,
    "movil",
    430,
    932,
    rect(0, 0, 430, 932, "url(#sea)") +
      `<circle cx="300" cy="300" r="170" fill="url(#sun)"/>` +
      waves(430, 932, 600, A, 9, 14) +
      text(28, 70, "marea·", { size: 20, weight: 700, fill: "#e8f4ff" }) +
      rect(350, 46, 52, 34, "#ffffff", 17, 'fill-opacity="0.1"') +
      text(28, 220, "Aprende a", { size: 52, weight: 700, fill: "#f3f9ff", ls: -2 }) +
      text(28, 280, "navegar", { size: 52, weight: 700, fill: "#f3f9ff", ls: -2 }) +
      text(28, 338, "con el viento a favor.", { size: 30, font: SERIF, italic: true, fill: A }) +
      rect(28, 400, 374, 60, A, 30) +
      text(215, 437, "Reservar plaza", { size: 17, weight: 600, fill: "#05162b", anchor: "middle" }),
    bg,
  );

  await save(
    s,
    "fondo",
    1920,
    1080,
    rect(0, 0, 1920, 1080, "url(#sea)") + `<circle cx="1300" cy="420" r="380" fill="url(#sun)"/>` + waves(1920, 1080, 560, A, 14, 34),
    bg,
  );
}

// ---------------------------------------------------------------------------------------------
// 2 · Brújula — app de rutas a pie (móvil)

async function brujula() {
  const s = "brujula";
  const A = "#ff8a3d";
  const BG = "#14110f";
  const status = (fg = "#f6eee6") => text(28, 40, "9:41", { size: 15, weight: 600, fill: fg }) + rect(360, 28, 44, 14, fg, 4, 'fill-opacity="0.8"');

  // 1 · Map with a route.
  let grid = "";
  for (let i = 0; i < 14; i++) {
    const y = 90 + i * 60 + rnd(i) * 20;
    grid += `<path d="M -10 ${y} L 440 ${y + (rnd(i + 9) - 0.5) * 80}" stroke="#2a241f" stroke-width="${i % 4 ? 3 : 9}"/>`;
    const x = i * 36 + rnd(i + 4) * 20;
    grid += `<path d="M ${x} 60 L ${x + (rnd(i + 2) - 0.5) * 120} 940" stroke="#2a241f" stroke-width="${i % 5 ? 3 : 8}"/>`;
  }
  const route = "M 70 760 C 120 680, 90 600, 170 560 S 300 520, 280 430 S 180 330, 260 250 S 360 190, 350 140";
  await save(
    s,
    "mapa",
    430,
    932,
    rect(0, 0, 430, 932, "#1b1714") +
      grid +
      `<rect x="250" y="600" width="140" height="110" rx="20" fill="#24311f"/><rect x="30" y="200" width="110" height="140" rx="20" fill="#24311f"/>` +
      `<path d="${route}" fill="none" stroke="${A}" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 14"/>` +
      `<path d="${route}" fill="none" stroke="${A}" stroke-width="4" stroke-linecap="round" stroke-opacity="0.5"/>` +
      `<circle cx="70" cy="760" r="12" fill="${A}"/><circle cx="70" cy="760" r="26" fill="${A}" fill-opacity="0.25"/>` +
      `<circle cx="350" cy="140" r="10" fill="#f6eee6"/>` +
      status() +
      rect(16, 790, 398, 126, BG, 26, 'fill-opacity="0.94"') +
      text(40, 830, "Ruta de los miradores", { size: 20, weight: 700, fill: "#f6eee6" }) +
      text(40, 860, "4,2 km · 1 h 10 min · 6 paradas", { size: 14, fill: "#f6eee6", op: 0.6 }) +
      rect(300, 812, 92, 44, A, 22) +
      text(346, 840, "Ir", { size: 16, weight: 700, fill: BG, anchor: "middle" }),
  );

  // 2 · Route list.
  const card = (y, title, meta, hue, n) =>
    rect(20, y, 390, 150, "#201b17", 22) +
    `<circle cx="${92}" cy="${y + 75}" r="48" fill="${hue}" fill-opacity="0.85"/>` +
    `<path d="M ${62} ${y + 92} q 20 -40 34 -14 t 30 -20" fill="none" stroke="${BG}" stroke-width="4" stroke-linecap="round"/>` +
    text(162, y + 62, title, { size: 19, weight: 700, fill: "#f6eee6" }) +
    text(162, y + 90, meta, { size: 14, fill: "#f6eee6", op: 0.55 }) +
    bars(162, y + 108, [120 + rnd(n) * 80], { h: 8, fill: A, op: 0.6 });
  await save(
    s,
    "rutas",
    430,
    932,
    rect(0, 0, 430, 932, BG) +
      status() +
      text(24, 120, "Cerca de ti", { size: 40, weight: 700, fill: "#f6eee6", ls: -1.2 }) +
      text(24, 158, "Rutas a pie para esta tarde", { size: 17, font: SERIF, italic: true, fill: A }) +
      ["Todas", "Cortas", "Con vistas", "Nocturnas"].map((c, i) => rect(24 + i * 98, 190, 90, 36, i === 0 ? A : "#2a241f", 18) + text(69 + i * 98, 213, c, { size: 13, fill: i === 0 ? BG : "#f6eee6", anchor: "middle", weight: 600 })).join("") +
      card(260, "Miradores", "4,2 km · 1 h 10 min", "#ff8a3d", 1) +
      card(430, "Ribera vieja", "2,8 km · 45 min", "#e3c45a", 2) +
      card(600, "Jardines", "3,5 km · 55 min", "#7fc28e", 3) +
      card(770, "Puentes", "5,1 km · 1 h 25 min", "#7aa8ff", 4),
  );

  // 3 · Route detail with an elevation profile.
  let elev = "M 24 640";
  for (let i = 0; i <= 20; i++) elev += ` L ${24 + i * 19.1} ${560 - Math.sin(i / 3) * 40 - rnd(i + 30) * 50}`;
  await save(
    s,
    "detalle",
    430,
    932,
    rect(0, 0, 430, 932, BG) +
      `<circle cx="330" cy="150" r="190" fill="${A}" fill-opacity="0.16"/>` +
      status() +
      text(24, 190, "Ruta de los", { size: 40, weight: 700, fill: "#f6eee6", ls: -1.2 }) +
      text(24, 240, "miradores", { size: 46, font: SERIF, italic: true, fill: A }) +
      [["4,2", "km"], ["1:10", "horas"], ["120", "m de desnivel"]].map(([v, l], i) => text(24 + i * 132, 320, v, { size: 30, weight: 700, fill: "#f6eee6" }) + text(24 + i * 132, 346, l, { size: 13, fill: "#f6eee6", op: 0.55 })).join("") +
      text(24, 440, "PERFIL", { size: 12, font: MONO, fill: "#f6eee6", op: 0.5, ls: 3 }) +
      `<path d="${elev} L 406 640 Z" fill="${A}" fill-opacity="0.2"/><path d="${elev.replace("M 24 640 L", "M")}" fill="none" stroke="${A}" stroke-width="3"/>` +
      bars(24, 690, [380, 340, 360, 220], { fill: "#f6eee6", op: 0.14 }) +
      rect(24, 830, 382, 62, A, 31) +
      text(215, 868, "Empezar ruta", { size: 17, weight: 700, fill: BG, anchor: "middle" }),
  );

  // 4 · Progress.
  const ring = (cx, cy, r, pct, color) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2a241f" stroke-width="18"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * r * pct} 9999" transform="rotate(-90 ${cx} ${cy})"/>`;
  await save(
    s,
    "progreso",
    430,
    932,
    rect(0, 0, 430, 932, BG) +
      status() +
      text(24, 120, "Tu semana", { size: 40, weight: 700, fill: "#f6eee6", ls: -1.2 }) +
      ring(215, 360, 140, 0.72, A) +
      ring(215, 360, 108, 0.45, "#e3c45a") +
      ring(215, 360, 76, 0.86, "#7fc28e") +
      text(215, 370, "18 km", { size: 30, weight: 700, fill: "#f6eee6", anchor: "middle" }) +
      ["L", "M", "X", "J", "V", "S", "D"].map((d, i) => {
        const h = 30 + rnd(i + 50) * 110;
        return rect(34 + i * 54, 760 - h, 30, h, i === 5 ? A : "#3a322b", 8) + text(49 + i * 54, 790, d, { size: 13, fill: "#f6eee6", op: 0.5, anchor: "middle" });
      }).join(""),
  );
}

// ---------------------------------------------------------------------------------------------
// 3 · Nódulo — identidad para un estudio de sonido (marca)

async function nodulo() {
  const s = "nodulo";
  const A = "#b48cff";
  const defs = `<linearGradient id="nd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1660"/><stop offset="1" stop-color="#0c0820"/></linearGradient>`;
  // An N drawn as three nodes joined by strokes.
  const mark = (cx, cy, k) => {
    const p = (x, y) => [cx + x * k, cy + y * k];
    const [a, b, c, d] = [p(-1, 1), p(-1, -1), p(1, 1), p(1, -1)];
    return (
      `<path d="M ${a} L ${b} L ${c} L ${d}" fill="none" stroke="#f3eeff" stroke-width="${k * 0.34}" stroke-linecap="round" stroke-linejoin="round"/>` +
      [a, b, c, d].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${k * (i === 1 || i === 2 ? 0.34 : 0.26)}" fill="${i === 2 ? A : "#f3eeff"}"/>`).join("")
    );
  };
  await save(s, "simbolo", 880, 880, rect(0, 0, 880, 880, "url(#nd)") + mark(440, 440, 190), defs);

  let wave = "";
  for (let i = 0; i < 90; i++) {
    const h = 8 + Math.abs(Math.sin(i / 5) * 60) * (0.4 + rnd(i) * 0.6);
    wave += rect(80 + i * 12, 520 - h / 2, 5, h, A, 2.5, `fill-opacity="${0.35 + (i % 9) / 18}"`);
  }
  await save(
    s,
    "tarjeta",
    1200,
    630,
    rect(0, 0, 1200, 630, "url(#nd)") +
      mark(170, 250, 62) +
      text(290, 290, "nódulo", { size: 128, weight: 700, fill: "#f3eeff", ls: -5 }) +
      text(296, 350, "estudio de sonido", { size: 34, font: SERIF, italic: true, fill: A }) +
      wave,
    defs,
  );
}

// ---------------------------------------------------------------------------------------------
// 4 · Atlas de luz — fanzine impreso de astronomía urbana (impresión)

async function atlas() {
  const s = "atlas";
  const P = "#f4efe5";
  const INK = "#1d1a2e";
  const R = "#d8453a";
  const stars = (x, y, w, h, n, seed, color = INK) =>
    Array.from({ length: n }, (_, i) => `<circle cx="${x + rnd(seed + i) * w}" cy="${y + rnd(seed + i + 500) * h}" r="${0.8 + rnd(seed + i + 900) * 2.6}" fill="${color}"/>`).join("");
  const folio = (n) => text(397, 1090, String(n).padStart(2, "0"), { size: 12, font: MONO, fill: INK, op: 0.5, anchor: "middle" });

  await save(
    s,
    "portada",
    794,
    1122,
    rect(0, 0, 794, 1122, INK) +
      stars(0, 0, 794, 1122, 220, 1, "#f4efe5") +
      `<circle cx="520" cy="380" r="210" fill="${R}"/><circle cx="600" cy="330" r="200" fill="${INK}"/>` +
      text(60, 840, "ATLAS", { size: 150, font: DISPLAY, fill: P, ls: -6 }) +
      text(64, 920, "de luz", { size: 86, font: SERIF, italic: true, fill: R }) +
      text(64, 1060, "FANZINE Nº 3 · ASTRONOMÍA URBANA", { size: 14, font: MONO, fill: P, op: 0.7, ls: 3 }),
  );

  const col = (x, y, n, seed) => bars(x, y, Array.from({ length: n }, (_, i) => (i % 7 === 6 ? 120 : 280 + rnd(seed + i) * 40)), { h: 7, gap: 17, fill: INK, op: 0.28 });
  await save(
    s,
    "articulo",
    794,
    1122,
    rect(0, 0, 794, 1122, P) +
      text(60, 110, "02 · MIRAR ARRIBA", { size: 13, font: MONO, fill: R, ls: 3 }) +
      text(60, 210, "Las estrellas", { size: 70, font: SERIF, fill: INK, ls: -2 }) +
      text(60, 290, "que aún se ven", { size: 70, font: SERIF, italic: true, fill: INK, ls: -2 }) +
      rect(60, 340, 674, 2, INK) +
      text(60, 420, "“", { size: 120, font: SERIF, fill: R }) +
      text(110, 400, "Desde una azotea del centro", { size: 26, font: SERIF, italic: true, fill: INK }) +
      text(110, 436, "se pueden contar unas cuarenta.", { size: 26, font: SERIF, italic: true, fill: INK }) +
      col(60, 500, 30, 10) +
      col(416, 500, 30, 60) +
      folio(2),
  );

  // Star chart.
  const cons = [
    [180, 300], [260, 250], [330, 290], [420, 230], [500, 300], [560, 380], [470, 430],
  ];
  await save(
    s,
    "carta",
    794,
    1122,
    rect(0, 0, 794, 1122, P) +
      `<circle cx="397" cy="460" r="320" fill="none" stroke="${INK}" stroke-opacity="0.25"/>` +
      `<circle cx="397" cy="460" r="220" fill="none" stroke="${INK}" stroke-opacity="0.15" stroke-dasharray="4 8"/>` +
      `<line x1="77" y1="460" x2="717" y2="460" stroke="${INK}" stroke-opacity="0.15"/><line x1="397" y1="140" x2="397" y2="780" stroke="${INK}" stroke-opacity="0.15"/>` +
      stars(110, 170, 574, 580, 140, 200) +
      `<polyline points="${cons.map((c) => c.join(",")).join(" ")}" fill="none" stroke="${R}" stroke-width="2"/>` +
      cons.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${R}"/>`).join("") +
      text(60, 880, "Carta del cielo de otoño", { size: 40, font: SERIF, fill: INK }) +
      text(60, 920, "Mirando al sur, a las 22:00", { size: 22, font: SERIF, italic: true, fill: INK, op: 0.7 }) +
      bars(60, 960, [620, 580, 600, 300], { h: 7, gap: 17, fill: INK, op: 0.28 }) +
      folio(5),
  );

  const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  await save(
    s,
    "datos",
    794,
    1122,
    rect(0, 0, 794, 1122, P) +
      text(60, 110, "04 · CONTAMINACIÓN LUMÍNICA", { size: 13, font: MONO, fill: R, ls: 3 }) +
      text(60, 200, "Noches oscuras", { size: 64, font: SERIF, fill: INK, ls: -2 }) +
      text(60, 260, "a lo largo del año", { size: 40, font: SERIF, italic: true, fill: INK }) +
      months.map((m, i) => {
        const h = 60 + Math.sin((i / 11) * Math.PI) * 260 + rnd(i + 70) * 60;
        return rect(70 + i * 56, 760 - h, 36, h, i === 9 ? R : INK, 3, `fill-opacity="${i === 9 ? 1 : 0.8}"`) + text(88 + i * 56, 790, m, { size: 13, font: MONO, fill: INK, op: 0.6, anchor: "middle" });
      }).join("") +
      rect(60, 820, 674, 1, INK) +
      col(60, 870, 10, 300) +
      col(416, 870, 10, 360) +
      folio(4),
  );
}

// ---------------------------------------------------------------------------------------------
// 5 · Fermento — web de un festival de cocina (web + móvil)

async function fermento() {
  const s = "fermento";
  const A = "#ff5c8a";
  const Y = "#ffd166";
  const BG = "#1a0f14";
  const defs = `<radialGradient id="b1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${Y}"/><stop offset="1" stop-color="${Y}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b3" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7b5cff"/><stop offset="1" stop-color="#7b5cff" stop-opacity="0"/></radialGradient>`;
  const blobs = (w, h, k = 1) =>
    `<circle cx="${w * 0.78}" cy="${h * 0.35}" r="${300 * k}" fill="url(#b1)" fill-opacity="0.8"/>` +
    `<circle cx="${w * 0.62}" cy="${h * 0.7}" r="${240 * k}" fill="url(#b2)" fill-opacity="0.7"/>` +
    `<circle cx="${w * 0.95}" cy="${h * 0.85}" r="${260 * k}" fill="url(#b3)" fill-opacity="0.7"/>`;
  const bubbles = (w, h, n, seed) =>
    Array.from({ length: n }, (_, i) => `<circle cx="${w * 0.45 + rnd(seed + i) * w * 0.55}" cy="${110 + rnd(seed + i + 40) * (h - 110)}" r="${4 + rnd(seed + i + 80) * 22}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2"/>`).join("");

  await save(
    s,
    "inicio",
    1440,
    900,
    rect(0, 0, 1440, 900, BG) +
      blobs(1440, 900) +
      bubbles(1440, 900, 26, 5) +
      text(64, 56, "FERMENTO", { size: 20, font: DISPLAY, fill: "#fff1f4", ls: 1 }) +
      ["Programa", "Cocineros", "Entradas"].map((l, i) => text(900 + i * 130, 54, l, { size: 15, fill: "#fff1f4", op: 0.7 })).join("") +
      rect(1290, 28, 100, 40, Y, 20) +
      text(1340, 54, "Entradas", { size: 14, weight: 700, fill: BG, anchor: "middle" }) +
      text(64, 330, "Tres días", { size: 120, font: DISPLAY, fill: "#fff1f4", ls: -5 }) +
      text(64, 460, "de cocina", { size: 120, font: DISPLAY, fill: "#fff1f4", ls: -5 }) +
      text(70, 560, "lenta y viva.", { size: 84, font: SERIF, italic: true, fill: Y }) +
      text(70, 640, "Talleres, mercado y cenas compartidas · 14–16 de mayo", { size: 20, fill: "#fff1f4", op: 0.75 }) +
      rect(70, 690, 230, 58, A, 29) +
      text(185, 726, "Ver el programa", { size: 17, weight: 700, fill: BG, anchor: "middle" }),
    defs,
  );

  await save(
    s,
    "movil",
    430,
    932,
    rect(0, 0, 430, 932, BG) +
      blobs(430, 932, 0.6) +
      bubbles(430, 932, 14, 30) +
      text(28, 64, "FERMENTO", { size: 16, font: DISPLAY, fill: "#fff1f4", ls: 1 }) +
      text(28, 260, "Tres días", { size: 54, font: DISPLAY, fill: "#fff1f4", ls: -2.5 }) +
      text(28, 324, "de cocina", { size: 54, font: DISPLAY, fill: "#fff1f4", ls: -2.5 }) +
      text(30, 380, "lenta y viva.", { size: 40, font: SERIF, italic: true, fill: Y }) +
      text(30, 430, "14–16 de mayo", { size: 17, fill: "#fff1f4", op: 0.75 }) +
      rect(28, 820, 374, 62, A, 31) +
      text(215, 858, "Comprar entradas", { size: 17, weight: 700, fill: BG, anchor: "middle" }),
    defs,
  );

  await save(
    s,
    "cartel",
    1200,
    630,
    rect(0, 0, 1200, 630, BG) +
      blobs(1200, 630, 0.8) +
      bubbles(1200, 630, 20, 60) +
      text(60, 260, "FERMENTO", { size: 120, font: DISPLAY, fill: "#fff1f4", ls: -4 }) +
      text(66, 340, "festival de cocina lenta", { size: 48, font: SERIF, italic: true, fill: Y }) +
      text(66, 540, "14–16 MAYO · MERCADO CENTRAL", { size: 18, font: MONO, fill: "#fff1f4", op: 0.8, ls: 4 }),
    defs,
  );

  await save(s, "fondo", 1920, 1080, rect(0, 0, 1920, 1080, BG) + blobs(1920, 1080, 1.5) + bubbles(1920, 1080, 40, 90), defs);
}

// ---------------------------------------------------------------------------------------------
// 6 · Cuadrante — panel de turnos para equipos pequeños (web)

async function cuadrante() {
  const s = "cuadrante";
  const A = "#2fd3b8";
  const BG = "#0c1417";
  const PANEL = "#121e22";
  const colors = [A, "#ffb35c", "#8f96ff", "#ff7a8a"];
  const side = (active) =>
    rect(0, 0, 240, 900, PANEL) +
    `<rect x="28" y="30" width="30" height="30" rx="8" fill="${A}"/>` +
    text(70, 52, "cuadrante", { size: 19, weight: 700, fill: "#e6f3f1" }) +
    ["Turnos", "Equipo", "Ausencias", "Informes", "Ajustes"].map((l, i) =>
      (i === active ? rect(16, 104 + i * 48, 208, 40, A, 10, 'fill-opacity="0.14"') : "") + text(40, 130 + i * 48, l, { size: 15, fill: i === active ? A : "#e6f3f1", op: i === active ? 1 : 0.6 }),
    ).join("");

  // Weekly schedule.
  const people = ["Lucía", "Omar", "Inés", "Pablo", "Sara", "Teo", "Nora"];
  let grid = "";
  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((d, i) => (grid += text(420 + i * 140, 210, d, { size: 13, font: MONO, fill: "#e6f3f1", op: 0.5 })));
  people.forEach((p, r) => {
    const y = 240 + r * 86;
    grid += text(290, y + 44, p, { size: 15, fill: "#e6f3f1", op: 0.85 });
    grid += rect(280, y + 76, 1120, 1, "#e6f3f1", 0, 'fill-opacity="0.07"');
    for (let c = 0; c < 7; c++) {
      if (rnd(r * 7 + c) < 0.3) continue;
      const k = Math.floor(rnd(r * 7 + c + 200) * colors.length);
      grid += rect(410 + c * 140, y + 14, 126, 50, colors[k], 10, 'fill-opacity="0.2"');
      grid += rect(410 + c * 140, y + 14, 4, 50, colors[k], 2);
      grid += text(424 + c * 140, y + 45, ["08–14", "14–20", "10–18", "20–02"][k], { size: 13, font: MONO, fill: "#e6f3f1", op: 0.85 });
    }
  });
  await save(
    s,
    "turnos",
    1440,
    900,
    rect(0, 0, 1440, 900, BG) +
      side(0) +
      text(280, 80, "Semana 42", { size: 34, weight: 700, fill: "#e6f3f1", ls: -1 }) +
      text(280, 112, "13 – 19 de octubre · 7 personas", { size: 15, fill: "#e6f3f1", op: 0.55 }) +
      rect(1220, 54, 180, 44, A, 22) +
      text(1310, 82, "Publicar turnos", { size: 14, weight: 700, fill: BG, anchor: "middle" }) +
      grid,
  );

  // Reports.
  let line = "M 300 640";
  for (let i = 0; i <= 24; i++) line += ` L ${300 + i * 44} ${560 - Math.sin(i / 3.5) * 80 - rnd(i + 120) * 60}`;
  await save(
    s,
    "informes",
    1440,
    900,
    rect(0, 0, 1440, 900, BG) +
      side(3) +
      text(280, 80, "Informes", { size: 34, weight: 700, fill: "#e6f3f1", ls: -1 }) +
      [["212 h", "cubiertas esta semana"], ["3", "huecos sin asignar"], ["96 %", "turnos confirmados"]]
        .map(([v, l], i) => rect(280 + i * 380, 140, 356, 150, PANEL, 18) + text(312 + i * 380, 220, v, { size: 46, weight: 700, fill: i === 1 ? "#ffb35c" : "#e6f3f1" }) + text(312 + i * 380, 256, l, { size: 15, fill: "#e6f3f1", op: 0.55 }))
        .join("") +
      rect(280, 320, 1116, 520, PANEL, 18) +
      text(312, 370, "Horas por semana", { size: 17, weight: 600, fill: "#e6f3f1" }) +
      `<path d="${line} L 1356 760 L 300 760 Z" fill="${A}" fill-opacity="0.12"/>` +
      `<path d="${line.replace("M 300 640 L", "M")}" fill="none" stroke="${A}" stroke-width="3"/>`,
  );
}

console.log("Generando imágenes de demo en public/proyectos/ …");
await marea();
await brujula();
await nodulo();
await atlas();
await fermento();
await cuadrante();
console.log("Listo.");
