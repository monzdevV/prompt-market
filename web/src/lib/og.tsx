import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { marca } from "./marca";

export const tamanoOG = { width: 1200, height: 630 };

// Archivo estrecha 800 (rótulos) y Archivo 500 (texto), autoalojadas en assets/fuentes (OFL).
const fuentes = Promise.all([
  readFile(join(process.cwd(), "assets/fuentes/Archivo-Condensed-800.ttf")),
  readFile(join(process.cwd(), "assets/fuentes/Archivo-500.ttf")),
]);

const SUELO = "#0c0d0f";
const TINTA = "#edebe6";
const TINTA2 = "#a5a8ab";
const SENAL = "#ff6b1a";

/** Imagen para compartir: una etiqueta de expedición, como en la web. */
export async function imagenOG({ codigo, titulo, linea, pie }: { codigo: string; titulo: string; linea: string; pie: string }) {
  const [rotulo, texto] = await fuentes;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: SUELO, padding: 48, fontFamily: "Texto" }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", border: `2px solid ${TINTA}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", background: SENAL, color: SUELO }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 32px", fontSize: 22, letterSpacing: 2 }}>
              {`${marca.nombre.toUpperCase()} · EXPEDICIÓN`}
            </div>
            <div style={{ display: "flex", fontFamily: "Rotulo", fontSize: 112, lineHeight: 1, padding: "14px 32px 4px", borderLeft: `2px solid ${SUELO}` }}>
              {codigo}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "36px 32px 0" }}>
            <div style={{ display: "flex", fontFamily: "Rotulo", fontSize: 112, lineHeight: 0.92, color: TINTA, textTransform: "uppercase" }}>
              {titulo}
            </div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 34, color: TINTA2, lineHeight: 1.25, maxWidth: 960 }}>{linea}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: `2px solid ${TINTA}`, padding: "18px 32px", fontSize: 24, color: TINTA }}>
            <span>{pie}</span>
            <span style={{ color: TINTA2 }}>Prompt maestro + kit verificado</span>
          </div>
        </div>
      </div>
    ),
    {
      ...tamanoOG,
      fonts: [
        { name: "Rotulo", data: rotulo, weight: 800, style: "normal" },
        { name: "Texto", data: texto, weight: 500, style: "normal" },
      ],
    },
  );
}
