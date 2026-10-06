import { imagenOG, tamanoOG } from "@/lib/og";
import { marca } from "@/lib/marca";

export const alt = `${marca.nombre}: ${marca.lema}`;
export const size = tamanoOG;
export const contentType = "image/png";

export default function Image() {
  return imagenOG({
    codigo: "1:1",
    titulo: "Proyectos completos",
    linea: "Pegas el prompt en tu IA, respondes a sus preguntas y tu proyecto queda montado con tus datos.",
    pie: marca.nombre,
  });
}
